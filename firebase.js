// Configuração do Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const woRef = database.ref('workOrders');

// Inicialização do Mapa
const map = L.map('map').setView([38.7223, -9.1393], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Ícones dos Marcadores (SVG embutido)
function createMarkerIcon(color) {
    return L.divIcon({
        html: `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="#fff" stroke-width="1.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <div style="position: absolute; bottom: -10px; left: 0; right: 0; text-align: center; font-weight: bold; color: ${color}; font-size: 10px;">WO</div>
        `,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 24]
    });
}

const statusColors = {
    aberta: '#4cc9f0',
    pendente: '#f8961e',
    fechada: '#f94144'
};

// Armazenamento de Marcadores
const markers = {};

// Função Principal para Carregar WOs
function loadWorkOrders() {
    const statusFilter = document.getElementById('filterStatus').value;
    
    woRef.on('value', (snapshot) => {
        // Limpar marcadores anteriores
        Object.values(markers).forEach(marker => {
            if (marker && map.removeLayer) {
                map.removeLayer(marker);
            }
        });
        
        // Limpar lista
        document.getElementById('woItems').innerHTML = '';
        
        if (!snapshot.exists()) {
            document.getElementById('woItems').innerHTML = '<p class="text-muted">Nenhuma WO encontrada</p>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const wo = childSnapshot.val();
            const woId = childSnapshot.key;
            
            // Aplicar filtro
            if (statusFilter && wo.status !== statusFilter) return;
            
            // Criar Marcador
            const marker = L.marker([wo.lat, wo.lng], {
                icon: createMarkerIcon(statusColors[wo.status] || statusColors.aberta)
            }).addTo(map);
            
            // Adicionar Popup
            marker.bindPopup(`
                <div style="min-width: 200px">
                    <h6 style="color: ${statusColors[wo.status]}">${wo.woNumber}</h6>
                    <p><b>Status:</b> ${wo.status}</p>
                    <p><b>PDO:</b> ${wo.pdo}</p>
                    <p><b>Local:</b> ${wo.lat.toFixed(6)}, ${wo.lng.toFixed(6)}</p>
                </div>
            `);
            
            // Armazenar referência
            markers[woId] = marker;
            
            // Adicionar à Lista
            const woItem = document.createElement('div');
            woItem.className = 'wo-card';
            woItem.innerHTML = `
                <div class="d-flex justify-content-between">
                    <h6>${wo.woNumber}</h6>
                    <span class="status-badge ${wo.status}" style="background-color: ${statusColors[wo.status]}10">
                        ${wo.status.toUpperCase()}
                    </span>
                </div>
                <p class="mb-1"><small>PDO: ${wo.pdo}</small></p>
                <p class="text-muted"><small>${wo.lat.toFixed(6)}, ${wo.lng.toFixed(6)}</small></p>
            `;
            
            // Evento para centralizar no marcador
            woItem.addEventListener('click', () => {
                map.setView([wo.lat, wo.lng], 15);
                marker.openPopup();
            });
            
            document.getElementById('woItems').appendChild(woItem);
        });
    });
}

// Adicionar Nova WO
document.getElementById('woForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const woNumber = document.getElementById('woNumber').value.trim();
    const pdo = document.getElementById('pdo').value.trim();
    const coordinates = document.getElementById('coordinates').value.trim();
    
    if (!woNumber || !pdo || !coordinates) return;
    
    const [lat, lng] = coordinates.split(',').map(c => parseFloat(c.trim()));
    if (isNaN(lat) || isNaN(lng)) return;
    
    try {
        await woRef.push({
            woNumber,
            pdo,
            lat,
            lng,
            status: 'aberta',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        document.getElementById('woForm').reset();
        map.setView([lat, lng], 15);
    } catch (error) {
        console.error("Erro ao salvar WO:", error);
    }
});

// Filtrar WOs
document.getElementById('filterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    loadWorkOrders();
});

// Exportar para CSV
document.getElementById('exportBtn').addEventListener('click', () => {
    woRef.once('value', (snapshot) => {
        let csv = 'Número WO,PDO,Latitude,Longitude,Status\n';
        
        snapshot.forEach((childSnapshot) => {
            const wo = childSnapshot.val();
            csv += `"${wo.woNumber}","${wo.pdo}",${wo.lat},${wo.lng},"${wo.status}"\n`;
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

// DEBUG: Verificar se o mapa está funcionando
setTimeout(() => {
    L.marker([38.7223, -9.1393]).addTo(map)
        .bindPopup("Marcador de Teste")
        .openPopup();
}, 1000);
