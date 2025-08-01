// Configuração do Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log("Firebase inicializado com sucesso");
} catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
}

// Referência do banco de dados
const database = firebase.database();
const woRef = database.ref('workOrders');

// Inicialização do Mapa
const map = L.map('map').setView([38.7223, -9.1393], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

console.log("Mapa inicializado:", map);

// Cores dos status
const statusColors = {
    aberta: '#4cc9f0',
    pendente: '#f8961e',
    fechada: '#f94144'
};

// Criar ícone do marcador
function createMarkerIcon(status) {
    const color = statusColors[status] || statusColors.aberta;
    return L.divIcon({
        html: `
            <div style="
                position: relative;
                width: 24px;
                height: 24px;
                background: ${color};
                border: 2px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 10px;
            ">WO</div>
        `,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

// Objeto para armazenar marcadores
const markers = {};

// Função para carregar WOs
function loadWorkOrders() {
    const statusFilter = document.getElementById('filterStatus').value;
    
    woRef.on('value', (snapshot) => {
        console.log("Dados recebidos do Firebase:", snapshot.val());
        
        // Limpar marcadores existentes
        Object.keys(markers).forEach(key => {
            if (markers[key]) {
                map.removeLayer(markers[key]);
            }
        });
        
        // Limpar lista
        const woItems = document.getElementById('woItems');
        woItems.innerHTML = '';
        
        if (!snapshot.exists()) {
            woItems.innerHTML = '<p class="text-muted">Nenhuma WO encontrada</p>';
            return;
        }
        
        snapshot.forEach((childSnapshot) => {
            const wo = childSnapshot.val();
            const woId = childSnapshot.key;
            
            // Aplicar filtro
            if (statusFilter && wo.status !== statusFilter) return;
            
            // Verificar se tem coordenadas válidas
            if (typeof wo.lat !== 'number' || typeof wo.lng !== 'number') {
                console.warn("WO sem coordenadas válidas:", wo);
                return;
            }
            
            // Criar marcador
            try {
                const marker = L.marker([wo.lat, wo.lng], {
                    icon: createMarkerIcon(wo.status)
                }).addTo(map);
                
                // Adicionar popup
                marker.bindPopup(`
                    <div style="min-width: 200px">
                        <h6 style="color: ${statusColors[wo.status]}">${wo.woNumber || 'Sem número'}</h6>
                        <p><b>Status:</b> ${wo.status || 'Não definido'}</p>
                        <p><b>PDO:</b> ${wo.pdo || 'Não informado'}</p>
                    </div>
                `);
                
                // Armazenar referência
                markers[woId] = marker;
                
                // Adicionar à lista
                const woItem = document.createElement('div');
                woItem.className = 'wo-card';
                woItem.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <h6>${wo.woNumber || 'Sem número'}</h6>
                        <span class="status-badge" style="background-color: ${statusColors[wo.status]}20; color: ${statusColors[wo.status]}">
                            ${(wo.status || 'aberta').toUpperCase()}
                        </span>
                    </div>
                    <p class="mb-1"><small>PDO: ${wo.pdo || 'Não informado'}</small></p>
                    <p class="text-muted"><small>${wo.lat?.toFixed(6) || '0'}, ${wo.lng?.toFixed(6) || '0'}</small></p>
                `;
                
                // Evento para centralizar no marcador
                woItem.addEventListener('click', () => {
                    map.setView([wo.lat, wo.lng], 15);
                    marker.openPopup();
                });
                
                woItems.appendChild(woItem);
                
            } catch (error) {
                console.error("Erro ao criar marcador para WO:", wo, error);
            }
        });
    }, (error) => {
        console.error("Erro ao carregar WOs:", error);
    });
}

// Adicionar nova WO
document.getElementById('woForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const woNumber = document.getElementById('woNumber').value.trim();
    const pdo = document.getElementById('pdo').value.trim();
    const coordsInput = document.getElementById('coordinates').value.trim();
    
    if (!woNumber || !pdo || !coordsInput) {
        console.warn("Campos obrigatórios não preenchidos");
        return;
    }
    
    const [lat, lng] = coordsInput.split(',').map(c => parseFloat(c.trim()));
    
    if (isNaN(lat) || isNaN(lng)) {
        console.warn("Coordenadas inválidas:", coordsInput);
        return;
    }
    
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
        console.log("WO adicionada com sucesso");
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
            csv += `"${wo.woNumber || ''}","${wo.pdo || ''}",${wo.lat || 0},${wo.lng || 0},"${wo.status || ''}"\n`;
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
document.addEventListener('DOMContentLoaded', () => {
    loadWorkOrders();
    
    // Adicionar marcador de teste
    setTimeout(() => {
        const testMarker = L.marker([38.7223, -9.1393]).addTo(map)
            .bindPopup("Marcador de Teste")
            .openPopup();
        console.log("Marcador de teste adicionado:", testMarker);
    }, 1000);
});
