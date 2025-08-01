// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDEiw_eRnSF782y5WICI8NBPox2203Qu-0",
  authDomain: "mapa-23b48.firebaseapp.com",
  databaseURL: "https://mapa-23b48-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mapa-23b48",
  storageBucket: "mapa-23b48.firebasestorage.app",
  messagingSenderId: "468462304112",
  appId: "1:468462304112:web:d4221e35917be991336db5",
  measurementId: "G-R97REGBXMZ"
};

// Inicialização do Firebase
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

// Cores e ícones
const statusData = {
  aberta: { color: '#28a745', icon: 'fa-check-circle' },
  pendente: { color: '#ffc107', icon: 'fa-clock' },
  fechada: { color: '#dc3545', icon: 'fa-times-circle' }
};

// Criar ícone personalizado
function createMarkerIcon(status) {
  const { color } = statusData[status] || statusData.aberta;
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        <i class="fas ${statusData[status]?.icon || 'fa-map-marker-alt'}" style="font-size: 12px"></i>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28]
  });
}

// Armazenamento de marcadores
const markers = {};
let editWoId = null;

// Modal de edição
const editModal = new bootstrap.Modal(document.getElementById('editModal'));

// Carregar WOs do banco de dados
function loadWorkOrders() {
  woRef.on('value', (snapshot) => {
    // Limpar marcadores existentes
    Object.values(markers).forEach(marker => map.removeLayer(marker));
    Object.keys(markers).forEach(key => delete markers[key]);
    
    // Limpar lista
    const woList = document.getElementById('woList');
    woList.innerHTML = '';
    
    if (!snapshot.exists()) {
      woList.innerHTML = '<p class="text-muted">Nenhuma WO cadastrada</p>';
      return;
    }
    
    snapshot.forEach((childSnapshot) => {
      const wo = childSnapshot.val();
      const woId = childSnapshot.key;
      
      // Criar marcador
      const marker = L.marker([wo.lat, wo.lng], {
        icon: createMarkerIcon(wo.status)
      }).addTo(map);
      
      // Link para Google Maps
      const googleMapsLink = `https://www.google.com/maps?q=${wo.lat},${wo.lng}`;
      
      // Popup com informações e ações
      marker.bindPopup(`
        <div style="min-width: 250px">
          <h6 style="color: ${statusData[wo.status]?.color || '#000'}">
            <i class="fas ${statusData[wo.status]?.icon || 'fa-map-marker-alt'} me-1"></i>
            ${wo.woNumber}
          </h6>
          <p><b>PDO:</b> ${wo.pdo}</p>
          <p><b>Status:</b> ${wo.status}</p>
          <p><b>Técnico:</b> ${wo.technician || 'Não informado'}</p>
          <div class="d-flex justify-content-between mt-2">
            <a href="${googleMapsLink}" target="_blank" class="btn btn-sm btn-outline-primary">
              <i class="fas fa-map-marked-alt"></i> Google Maps
            </a>
            <button onclick="openEditForm('${woId}')" class="btn btn-sm btn-outline-secondary">
              <i class="fas fa-edit"></i> Editar
            </button>
          </div>
        </div>
      `);
      
      markers[woId] = marker;
      
      // Adicionar à lista
      const woItem = document.createElement('div');
      woItem.className = `wo-item list-group-item list-group-item-action`;
      woItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0">${wo.woNumber}</h6>
          <span class="badge" style="background-color: ${statusData[wo.status]?.color}20; color: ${statusData[wo.status]?.color}">
            ${wo.status.toUpperCase()}
          </span>
        </div>
        <small class="text-muted">PDO: ${wo.pdo}</small>
        <div class="mt-1">
          <button onclick="openEditForm('${woId}')" class="btn btn-sm btn-outline-secondary">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      `;
      
      woItem.addEventListener('click', () => {
        map.setView([wo.lat, wo.lng], 15);
        marker.openPopup();
      });
      
      woList.appendChild(woItem);
    });
  });
}

// Abrir formulário de edição
window.openEditForm = function(woId) {
  editWoId = woId;
  woRef.child(woId).once('value', (snapshot) => {
    const wo = snapshot.val();
    
    document.getElementById('editWoNumber').value = wo.woNumber;
    document.getElementById('editPdo').value = wo.pdo;
    document.getElementById('editTechnician').value = wo.technician || '';
    document.getElementById('editCoordinates').value = `${wo.lat}, ${wo.lng}`;
    document.getElementById('editStatus').value = wo.status;
    document.querySelector(`input[name="editType"][value="${wo.type || 'major'}"]`).checked = true;
    
    editModal.show();
  });
};

// Salvar edição
document.getElementById('saveEditBtn').addEventListener('click', () => {
  const updates = {
    woNumber: document.getElementById('editWoNumber').value.trim(),
    pdo: document.getElementById('editPdo').value.trim(),
    technician: document.getElementById('editTechnician').value.trim(),
    status: document.getElementById('editStatus').value,
    type: document.querySelector('input[name="editType"]:checked').value
  };
  
  // Atualizar coordenadas se foram modificadas
  const coords = document.getElementById('editCoordinates').value.trim().split(',');
  if (coords.length === 2) {
    updates.lat = parseFloat(coords[0]);
    updates.lng = parseFloat(coords[1]);
  }
  
  woRef.child(editWoId).update(updates)
    .then(() => {
      editModal.hide();
      showAlert('WO atualizada com sucesso!', 'success');
    })
    .catch(error => {
      console.error("Erro ao atualizar WO:", error);
      showAlert('Erro ao atualizar WO', 'danger');
    });
});

// Adicionar nova WO
document.getElementById('woForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const woNumber = document.getElementById('woNumber').value.trim();
  const pdo = document.getElementById('pdo').value.trim();
  const coords = document.getElementById('coordinates').value.trim().split(',');
  
  if (!woNumber || !pdo || coords.length !== 2) {
    showAlert('Preencha todos os campos obrigatórios!', 'warning');
    return;
  }
  
  const lat = parseFloat(coords[0]);
  const lng = parseFloat(coords[1]);
  
  if (isNaN(lat) || isNaN(lng)) {
    showAlert('Coordenadas inválidas! Use o formato: lat, lng', 'warning');
    return;
  }
  
  const newWo = {
    woNumber,
    pdo,
    lat,
    lng,
    status: 'aberta',
    technician: document.getElementById('technician').value.trim() || 'Não informado',
    type: document.querySelector('input[name="type"]:checked').value,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  };
  
  woRef.push(newWo)
    .then(() => {
      document.getElementById('woForm').reset();
      map.setView([lat, lng], 15);
      showAlert('WO cadastrada com sucesso!', 'success');
    })
    .catch(error => {
      console.error("Erro ao salvar WO:", error);
      showAlert('Erro ao salvar WO', 'danger');
    });
});

// Funções auxiliares
function showAlert(message, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
  alert.style.zIndex = '10000';
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 3000);
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  loadWorkOrders();
  
  // Adicionar marcador de teste (remover em produção)
  setTimeout(() => {
    const testMarker = L.marker([38.7223, -9.1393], {
      icon: createMarkerIcon('aberta')
    }).addTo(map)
      .bindPopup("<b>Marcador de Teste</b><br>O sistema está funcionando!")
      .openPopup();
  }, 1000);
});
