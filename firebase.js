// Inicialização do Mapa
function initMap() {
    // Coordenadas iniciais (Lisboa)
    const map = L.map('map').setView([38.7223, -9.1393], 12);
    
    // Camada do mapa
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    return map;
}

// Inicialização do Firebase
const db = firebase.database();
const woRef = db.ref('workOrders');

// Ícones personalizados
const icons = {
    aberta: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }),
    pendente: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }),
    fechada: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })
};

// Variáveis globais
let map;
const markers = {};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', () => {
    map = initMap();
    loadWorkOrders();
    
    // Evento para adicionar nova WO
    document.getElementById('woForm').addEventListener('submit', addWorkOrder);
    
    // Evento para filtrar WOs
    document.getElementById('filterForm').addEventListener('submit', (e) => {
        e.preventDefault();
        loadWorkOrders();
    });
    
    // Evento para listar todas as WOs
    document.getElementById('listAllBtn').addEventListener('click', () => {
        document.getElementById('filterWoNumber').value = '';
        document.getElementById('filterPdo').value = '';
        document.getElementById('filterStatus').value = '';
        loadWorkOrders();
    });
    
    // Evento para exportar para CSV
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    
    // Evento para salvar edição
    document.getElementById('saveEditBtn').addEventListener('click', saveWorkOrder);
    
    // Evento para excluir WO
    document.getElementById('deleteBtn').addEventListener('click', deleteWorkOrder);
});

// Adicionar nova WO
function addWorkOrder(e) {
    e.preventDefault();
    
    const woNumber = document.getElementById('woNumber').value.trim();
    const pdo = document.getElementById('pdo').value.trim();
    const coordinatesInput = document.getElementById('coordinates').value.trim();
    
    // Validação dos campos obrigatórios
    if (!woNumber || !pdo || !coordinatesInput) {
        alert('Por favor, preencha os campos obrigatórios: Número WO, PDO e Coordenadas');
        return;
    }
    
    // Validação das coordenadas
    const coordinates = coordinatesInput.split(',').map(coord => parseFloat(coord.trim()));
    if (coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
        alert('Formato de coordenadas inválido. Use o formato: lat, lng');
        return;
    }
    
    // Campos não obrigatórios
    const type = document.querySelector('input[name="type"]:checked')?.value || 'major';
    const technician = document.getElementById('technician').value.trim() || 'Não informado';
    
    const newWo = {
        woNumber,
        pdo,
        type,
        technician,
        lat: coordinates[0],
        lng: coordinates[1],
        status: 'aberta', // Sempre inicia como aberta
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    woRef.push(newWo)
        .then(() => {
            alert('WO adicionada com sucesso!');
            document.getElementById('woForm').reset();
        })
        .catch(error => {
            console.error('Erro ao adicionar WO:', error);
            alert('Erro ao adicionar WO. Verifique o console para mais detalhes.');
        });
}

// Carregar WOs
function loadWorkOrders() {
    const filterWoNumber = document.getElementById('filterWoNumber').value.toLowerCase();
    const filterPdo = document.getElementById('filterPdo').value.toLowerCase();
    const filterStatus = document.getElementById('filterStatus').value;
    
    woRef.once('value', (snapshot) => {
        const woList = document.getElementById('woList');
        woList.innerHTML = '';
        
        // Limpar marcadores do mapa
        Object.values(markers).forEach(marker => map.removeLayer(marker));
        
        snapshot.forEach((childSnapshot) => {
            const wo = childSnapshot.val();
            const woId = childSnapshot.key;
            
            // Aplicar filtros
            if (filterWoNumber && !wo.woNumber.toLowerCase().includes(filterWoNumber)) return;
            if (filterPdo && !wo.pdo.toLowerCase().includes(filterPdo)) return;
            if (filterStatus && wo.status !== filterStatus) return;
            
            // Adicionar marcador no mapa
            const marker = L.marker([wo.lat, wo.lng], { 
                icon: icons[wo.status] || icons.aberta 
            }).addTo(map)
                .bindPopup(`
                    <b>WO: ${wo.woNumber}</b><br>
                    PDO: ${wo.pdo}<br>
                    Tipo: ${wo.type}<br>
                    Técnico: ${wo.technician}<br>
                    Status: ${wo.status}<br>
                    <button class="btn btn-sm btn-primary mt-2" onclick="openEditModal('${woId}')">Editar</button>
                `);
            
            markers[woId] = marker;
            
            // Adicionar à lista
            const woItem = document.createElement('div');
            woItem.className = `wo-card ${wo.status} card mb-2`;
            woItem.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">${wo.woNumber}</h5>
                    <p class="card-text mb-1"><strong>PDO:</strong> ${wo.pdo}</p>
                    <p class="card-text mb-1"><strong>Tipo:</strong> ${wo.type}</p>
                    <p class="card-text mb-1"><strong>Técnico:</strong> ${wo.technician}</p>
                    <p class="card-text mb-2"><strong>Coordenadas:</strong> ${wo.lat.toFixed(6)}, ${wo.lng.toFixed(6)}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge ${getStatusBadgeClass(wo.status)}">${getStatusText(wo.status)}</span>
                        <button class="btn btn-sm btn-outline-primary" onclick="openEditModal('${woId}')">Editar</button>
                    </div>
                </div>
            `;
            woList.appendChild(woItem);
        });
    });
}

// Funções auxiliares para status
function getStatusBadgeClass(status) {
    switch(status) {
        case 'aberta': return 'bg-success';
        case 'pendente': return 'bg-warning text-dark';
        case 'fechada': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'aberta': return 'Aberta';
        case 'pendente': return 'Pendente';
        case 'fechada': return 'Fechada';
        default: return status;
    }
}

// Abrir modal de edição
window.openEditModal = function(woId) {
    woRef.child(woId).once('value', (snapshot) => {
        const wo = snapshot.val();
        
        document.getElementById('editId').value = woId;
        document.getElementById('editWoNumber').value = wo.woNumber;
        document.getElementById('editPdo').value = wo.pdo;
        document.querySelector(`input[name="editType"][value="${wo.type}"]`).checked = true;
        document.getElementById('editTechnician').value = wo.technician;
        document.getElementById('editCoordinates').value = `${wo.lat}, ${wo.lng}`;
        document.getElementById('editStatus').value = wo.status;
        
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
    });
};

// Salvar edição
function saveWorkOrder() {
    const woId = document.getElementById('editId').value;
    const woNumber = document.getElementById('editWoNumber').value.trim();
    const pdo = document.getElementById('editPdo').value.trim();
    const coordinatesInput = document.getElementById('editCoordinates').value.trim();
    
    // Validação dos campos obrigatórios
    if (!woNumber || !pdo || !coordinatesInput) {
        alert('Por favor, preencha os campos obrigatórios: Número WO, PDO e Coordenadas');
        return;
    }
    
    // Validação das coordenadas
    const coordinates = coordinatesInput.split(',').map(coord => parseFloat(coord.trim()));
    if (coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
        alert('Formato de coordenadas inválido. Use o formato: lat, lng');
        return;
    }
    
    // Campos não obrigatórios
    const type = document.querySelector('input[name="editType"]:checked')?.value || 'major';
    const technician = document.getElementById('editTechnician').value.trim() || 'Não informado';
    const status = document.getElementById('editStatus').value;
    
    const updatedWo = {
        woNumber,
        pdo,
        type,
        technician,
        lat: coordinates[0],
        lng: coordinates[1],
        status
    };
    
    woRef.child(woId).update(updatedWo)
        .then(() => {
            alert('WO atualizada com sucesso!');
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            loadWorkOrders();
        })
        .catch(error => {
            console.error('Erro ao atualizar WO:', error);
            alert('Erro ao atualizar WO. Verifique o console para mais detalhes.');
        });
}

// Excluir WO
function deleteWorkOrder() {
    if (confirm('Tem certeza que deseja excluir esta WO? Esta ação não pode ser desfeita.')) {
        const woId = document.getElementById('editId').value;
        
        woRef.child(woId).remove()
            .then(() => {
                alert('WO excluída com sucesso!');
                bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                loadWorkOrders();
            })
            .catch(error => {
                console.error('Erro ao excluir WO:', error);
                alert('Erro ao excluir WO. Verifique o console para mais detalhes.');
            });
    }
}

// Exportar para CSV
function exportToCSV() {
    woRef.once('value', (snapshot) => {
        let csv = 'Número WO,PDO,Tipo,Técnico,Latitude,Longitude,Status\n';
        
        snapshot.forEach((childSnapshot) => {
            const wo = childSnapshot.val();
            csv += `"${wo.woNumber}","${wo.pdo}","${wo.type}","${wo.technician}",${wo.lat},${wo.lng},"${wo.status}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'work_orders.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}
