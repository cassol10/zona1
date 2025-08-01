// Configuração do mapa
const map = L.map('map').setView([38.7223, -9.1393], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Referência ao banco de dados
const db = firebase.database();
const woRef = db.ref('workOrders');

// Ícones personalizados
const icons = {
    aberta: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    }),
    pendente: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    }),
    fechada: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41]
    })
};

// Armazenamento de marcadores
const markers = {};

// Adicionar nova WO
document.getElementById('woForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const woNumber = document.getElementById('woNumber').value.trim();
    const pdo = document.getElementById('pdo').value.trim();
    const coordinatesInput = document.getElementById('coordinates').value.trim();
    
    // Validação
    if (!woNumber || !pdo || !coordinatesInput) {
        return;
    }
    
    const coords = coordinatesInput.split(',').map(c => parseFloat(c.trim()));
    if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
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
    
    woRef.push(newWo);
    document.getElementById('woForm').reset();
    
    // Centralizar mapa na nova WO
    map.setView([coords[0], coords[1]], 15);
});

// Carregar WOs
function loadWorkOrders() {
    const filterWoNumber = document.getElementById('filterWoNumber').value.toLowerCase();
    const filterPdo = document.getElementById('filterPdo').value.toLowerCase();
    const filterStatus = document.getElementById('filterStatus').value;
    
    woRef.on('value', (snapshot) => {
        const woList = document.getElementById('woList');
        woList.innerHTML = '';
        
        // Limpar marcadores
        Object.values(markers).forEach(marker => map.removeLayer(marker));
        
        snapshot.forEach((childSnapshot) => {
            const wo = childSnapshot.val();
            const woId = childSnapshot.key;
            
            // Aplicar filtros
            if (filterWoNumber && !wo.woNumber.toLowerCase().includes(filterWoNumber)) return;
            if (filterPdo && !wo.pdo.toLowerCase().includes(filterPdo)) return;
            if (filterStatus && wo.status !== filterStatus) return;
            
            // Adicionar marcador
            const marker = L.marker([wo.lat, wo.lng], {
                icon: icons[wo.status] || icons.aberta
            }).addTo(map);
            
            markers[woId] = marker;
            
            // Adicionar à lista
            const woItem = document.createElement('div');
            woItem.className = 'wo-item list-group-item';
            woItem.innerHTML = `
                <div>
                    <strong>${wo.woNumber}</strong>
                    <span class="float-end status-${wo.status}">${wo.status.toUpperCase()}</span>
                </div>
                <div class="small">PDO: ${wo.pdo}</div>
                <div class="small">Técnico: ${wo.technician}</div>
            `;
            
            woItem.addEventListener('click', () => {
                map.setView([wo.lat, wo.lng], 15);
                marker.openPopup();
            });
            
            woList.appendChild(woItem);
        });
    });
}

// Filtrar WOs
document.getElementById('filterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadWorkOrders();
});

// Exportar para CSV
document.getElementById('exportBtn').addEventListener('click', () => {
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
});

// Inicializar
loadWorkOrders();

// Função para alternar a sidebar em dispositivos móveis
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
}
