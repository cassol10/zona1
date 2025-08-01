// Inicializa o mapa
const map = L.map('map').setView([38.704803, -9.400177], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Referência ao banco de dados
const db = firebase.database();
const woRef = db.ref('workOrders');

// Marcadores no mapa
const markers = {};

// Ícones personalizados
const greenIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const yellowIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Adicionar nova WO
document.getElementById('woForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const woNumber = document.getElementById('woNumber').value;
    const pdo = document.getElementById('pdo').value;
    const type = document.querySelector('input[name="type"]:checked').value;
    const technician = document.getElementById('technician').value;
    const coordinates = document.getElementById('coordinates').value.split(',').map(coord => parseFloat(coord.trim()));
    const status = 'aberta';
    
    const newWo = {
        woNumber,
        pdo,
        type,
        technician,
        lat: coordinates[0],
        lng: coordinates[1],
        status,
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
});

// Filtrar WOs
document.getElementById('filterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadWorkOrders();
});

// Listar todas as WOs
document.getElementById('listAllBtn').addEventListener('click', () => {
    document.getElementById('filterWoNumber').value = '';
    document.getElementById('filterPdo').value = '';
    document.getElementById('filterStatus').value = '';
    loadWorkOrders();
});

// Exportar para CSV
document.getElementById('exportBtn').addEventListener('click', exportToCSV);

// Carregar WOs do Firebase
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
            let icon;
            if (wo.status === 'aberta') icon = greenIcon;
            else if (wo.status === 'pendente') icon = yellowIcon;
            else icon = redIcon;
            
            const marker = L.marker([wo.lat, wo.lng], { icon }).addTo(map)
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
            let statusBadge;
            if (wo.status === 'aberta') statusBadge = '<span class="badge bg-success">Aberta</span>';
            else if (wo.status === 'pendente') statusBadge = '<span class="badge bg-warning text-dark">Pendente</span>';
            else statusBadge = '<span class="badge bg-danger">Fechada</span>';
            
            const woItem = document.createElement('div');
            woItem.className = 'card mb-2';
            woItem.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">WO: ${wo.woNumber} ${statusBadge}</h5>
                    <p class="card-text">
                        PDO: ${wo.pdo}<br>
                        Tipo: ${wo.type}<br>
                        Técnico: ${wo.technician}<br>
                        Coordenadas: ${wo.lat}, ${wo.lng}
                    </p>
                    <button class="btn btn-sm btn-primary" onclick="openEditModal('${woId}')">Editar</button>
                </div>
            `;
            woList.appendChild(woItem);
        });
    });
}

// Abrir modal de edição
window.openEditModal = function(woId) {
    woRef.child(woId).once('value', (snapshot) => {
        const wo = snapshot.val();
        
        document.getElementById('editId').value = woId;
        document.getElementById('editWoNumber').value = wo.woNumber;
        document.getElementById('editPdo').value = wo.pdo;
        document.getElementById(`edit${wo.type.charAt(0).toUpperCase() + wo.type.slice(1)}`).checked = true;
        document.getElementById('editTechnician').value = wo.technician;
        document.getElementById('editCoordinates').value = `${wo.lat}, ${wo.lng}`;
        document.getElementById('editStatus').value = wo.status;
        
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
    });
};

// Salvar edição
document.getElementById('saveEditBtn').addEventListener('click', () => {
    const woId = document.getElementById('editId').value;
    const woNumber = document.getElementById('editWoNumber').value;
    const pdo = document.getElementById('editPdo').value;
    const type = document.querySelector('input[name="editType"]:checked').value;
    const technician = document.getElementById('editTechnician').value;
    const coordinates = document.getElementById('editCoordinates').value.split(',').map(coord => parseFloat(coord.trim()));
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
});

// Excluir WO
document.getElementById('deleteBtn').addEventListener('click', () => {
    if (confirm('Tem certeza que deseja excluir esta WO?')) {
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
});

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

// Carregar WOs quando a página carrega
window.addEventListener('DOMContentLoaded', loadWorkOrders);
