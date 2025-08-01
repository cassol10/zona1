// Verifica se o Firebase já foi inicializado
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Inicialização do mapa com fallback
function initMap() {
    const map = L.map('map').setView([38.7223, -9.1393], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    return map;
}

// Variáveis globais
let map;
const markers = {};
let mapInitialized = false;

// Ícones personalizados corrigidos
const createCustomIcon = (color) => {
    return new L.Icon({
        iconUrl: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='${encodeURIComponent(color)}'><path d='M16 0c-5.523 0-10 4.477-10 10 0 10 10 22 10 22s10-12 10-22c0-5.523-4.477-10-10-10zm0 16c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z'/></svg>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};

const statusColors = {
    aberta: '#4cc9f0',
    pendente: '#f8961e',
    fechada: '#f94144'
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', () => {
    try {
        map = initMap();
        mapInitialized = true;
        loadWorkOrders();
        
        // Verificação do container do mapa
        if (!document.getElementById('map')) {
            console.error('Elemento do mapa não encontrado');
            return;
        }

        // Eventos
        document.getElementById('woForm').addEventListener('submit', addWorkOrder);
        document.getElementById('filterForm').addEventListener('submit', (e) => {
            e.preventDefault();
            loadWorkOrders();
        });
        document.getElementById('exportBtn').addEventListener('click', exportToCSV);

    } catch (error) {
        console.error('Erro na inicialização:', error);
    }
});

// Função para adicionar WO corrigida
async function addWorkOrder(e) {
    e.preventDefault();
    
    if (!mapInitialized) {
        console.error('Mapa não inicializado');
        return;
    }

    const woNumber = document.getElementById('woNumber').value.trim();
    const pdo = document.getElementById('pdo').value.trim();
    const coordinatesInput = document.getElementById('coordinates').value.trim();

    if (!woNumber || !pdo || !coordinatesInput) {
        showToast('Preencha todos os campos obrigatórios', 'warning');
        return;
    }

    const coords = coordinatesInput.split(',').map(c => parseFloat(c.trim()));
    if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
        showToast('Coordenadas inválidas. Use: lat, lng', 'warning');
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

    try {
        await woRef.push(newWo);
        document.getElementById('woForm').reset();
        map.setView([coords[0], coords[1]], 15);
        showToast('WO adicionada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao salvar WO:', error);
        showToast('Erro ao salvar WO', 'danger');
    }
}

// Função para carregar WOs com correções
function loadWorkOrders() {
    if (!mapInitialized) return;

    const filterWoNumber = document.getElementById('filterWoNumber').value.toLowerCase();
    const filterPdo = document.getElementById('filterPdo').value.toLowerCase();
    const filterStatus = document.getElementById('filterStatus').value;

    woRef.on('value', (snapshot) => {
        const woList = document.getElementById('woList');
        woList.innerHTML = '';

        // Limpar marcadores antigos
        Object.values(markers).forEach(marker => {
            if (marker && map.removeLayer) {
                map.removeLayer(marker);
            }
        });

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

            // Criar marcador
            try {
                const marker = L.marker([wo.lat, wo.lng], {
                    icon: createCustomIcon(statusColors[wo.status] || statusColors.aberta)
                }).addTo(map);

                marker.bindPopup(`
                    <div class="wo-popup">
                        <h6>${wo.woNumber}</h6>
                        <p><strong>Status:</strong> <span style="color:${statusColors[wo.status]}">${wo.status}</span></p>
                        <p><strong>PDO:</strong> ${wo.pdo}</p>
                        <p><strong>Técnico:</strong> ${wo.technician}</p>
                    </div>
                `);

                markers[woId] = marker;

                // Adicionar à lista
                const woCard = document.createElement('div');
                woCard.className = `wo-card ${wo.status}`;
                woCard.innerHTML = `
                    <div class="p-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="mb-0">${wo.woNumber}</h6>
                            <span class="status-badge ${getStatusBadgeClass(wo.status)}">
                                ${wo.status.toUpperCase()}
                            </span>
                        </div>
                        <div class="text-muted small mb-1"><strong>PDO:</strong> ${wo.pdo}</div>
                        <div class="text-muted small"><strong>Local:</strong> ${wo.lat.toFixed(6)}, ${wo.lng.toFixed(6)}</div>
                    </div>
                `;

                woCard.addEventListener('click', () => {
                    map.setView([wo.lat, wo.lng], 15);
                    marker.openPopup();
                });

                woList.appendChild(woCard);
            } catch (error) {
                console.error('Erro ao criar marcador:', error);
            }
        });
    });
}

// Restante do código permanece igual...

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
