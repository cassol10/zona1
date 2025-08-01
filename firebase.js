// Inicialização do mapa
const map = L.map('map').setView([38.7223, -9.1393], 13);

// Camada do mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Referência ao banco de dados
const db = firebase.database();
const woRef = db.ref('workOrders');

// Ícones personalizados
const createCustomIcon = (color) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color:${color};width:24px;height:24px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">WO</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

const icons = {
    aberta: createCustomIcon('#4cc9f0'),
    pendente: createCustomIcon('#f8961e'),
    fechada: createCustomIcon('#f94144')
};

// Armazenamento de marcadores
const markers = {};

// Adicionar nova WO
document.getElementById('woForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const woNumber = document.getElementById('woNumber').value.trim();
    const pdo = document.getElementById('pdo').value.trim();
    const coordinatesInput = document.getElementById('coordinates').value.trim();
    
    // Validação dos campos obrigatórios
    if (!woNumber || !pdo || !coordinatesInput) {
        showToast('Preencha todos os campos obrigatórios', 'warning');
        return;
    }
    
    // Validação das coordenadas
    const coords = coordinatesInput.split(',').map(c => parseFloat(c.trim()));
    if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
        showToast('Formato de coordenadas inválido. Use: lat, lng', 'warning');
        return;
    }
    
    const newWo = {
        woNumber,
        pdo,
        type: document.querySelector('input[name="type"]:checked').value,
        technician: document.getElementById('technician').value.trim() || 'Não informado',
        lat: coords[0],
        lng: coords[1],
        status: 'aberta',
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    woRef.push(newWo)
        .then(() => {
            document.getElementById('woForm').reset();
            // Centralizar no novo marcador
            map.setView([coords[0], coords[1]], 15);
        })
        .catch(error => {
            console.error('Erro ao salvar WO:', error);
            showToast('Erro ao salvar WO', 'danger');
        });
});

// Carregar WOs
function loadWorkOrders() {
    const filterWoNumber = document.getElementById('filterWoNumber').value.toLowerCase();
    const filterPdo = document.getElementById('filterPdo').value.toLowerCase();
    const filterStatus = document.getElementById('filterStatus').value;
    
    woRef.on('value', (snapshot) => {
        const woList = document.getElementById('woList');
        woList.innerHTML = '';
        
        // Limpar marcadores existentes
        Object.values(markers).forEach(marker => map.removeLayer(marker));
        
        if (!snapshot.exists()) {
            woList.innerHTML = '<div class="text-center py-3 text-muted">Nenhuma WO encontrada</div>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const wo = childSnapshot.val();
            const woId = childSnapshot.key;
            
            // Aplicar filtros
            if (filterWoNumber && !wo.woNumber.toLowerCase().includes(filterWoNumber)) return;
            if (filterPdo && !wo.pdo.toLowerCase().includes(filterPdo)) return;
            if (filterStatus && wo.status !== filterStatus) return;
            
            // Criar marcador no mapa
            const marker = L.marker([wo.lat, wo.lng], {
                icon: icons[wo.status] || icons.aberta
            }).addTo(map);
            
            // Adicionar popup ao marcador
            marker.bindPopup(`
                <div class="wo-popup">
                    <h6>WO: ${wo.woNumber}</h6>
                    <p><strong>PDO:</strong> ${wo.pdo}</p>
                    <p><strong>Tipo:</strong> ${wo.type}</p>
                    <p><strong>Técnico:</strong> ${wo.technician}</p>
                    <p><strong>Status:</strong> <span class="badge ${getStatusBadgeClass(wo.status)}">${wo.status}</span></p>
                </div>
            `);
            
            markers[woId] = marker;
            
            // Adicionar card à lista
            const woCard = document.createElement('div');
            woCard.className = `wo-card ${wo.status}`;
            woCard.innerHTML = `
                <div class="p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="mb-0">${wo.woNumber}</h6>
                        <span class="status-badge ${getStatusBadgeClass(wo.status)}">${wo.status.toUpperCase()}</span>
                    </div>
                    <div class="text-muted small mb-1"><strong>PDO:</strong> ${wo.pdo}</div>
                    <div class="text-muted small mb-1"><strong>Técnico:</strong> ${wo.technician}</div>
                    <div class="text-muted small"><strong>Local:</strong> ${wo.lat.toFixed(6)}, ${wo.lng.toFixed(6)}</div>
                </div>
            `;
            
            // Evento para centralizar no marcador quando clicar no card
            woCard.addEventListener('click', () => {
                map.setView([wo.lat, wo.lng], 15);
                marker.openPopup();
            });
            
            woList.appendChild(woCard);
        });
    });
}

// Funções auxiliares
function getStatusBadgeClass(status) {
    return {
        aberta: 'badge-aberta',
        pendente: 'badge-pendente',
        fechada: 'badge-fechada'
    }[status] || '';
}

function showToast(message, type = 'success') {
    // Implementação simples de toast (pode ser substituída por uma biblioteca)
    const toast = document.createElement('div');
    toast.className = `toast show position-fixed bottom-0 end-0 m-3 bg-${type} text-white`;
    toast.style.zIndex = '1100';
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Filtrar WOs
document.getElementById('filterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadWorkOrders();
});

// Exportar para CSV
document.getElementById('exportBtn').addEventListener('click', () => {
    woRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            showToast('Nenhuma WO para exportar', 'warning');
            return;
        }
        
        let csv = 'Número WO,PDO,Tipo,Técnico,Latitude,Longitude,Status\n';
        
        snapshot.forEach((childSnapshot) => {
            const wo = childSnapshot.val();
            csv += `"${wo.woNumber}","${wo.pdo}","${wo.type}","${wo.technician}",${wo.lat},${wo.lng},"${wo.status}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `work_orders_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Exportação concluída', 'success');
    });
});

// Alternar sidebar em mobile
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
};

// Inicializar
loadWorkOrders();
