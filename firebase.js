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

// Cores dos status
const statusColors = {
  aberta: '#28a745', // Verde
  pendente: '#ffc107', // Amarelo
  fechada: '#dc3545'  // Vermelho
};

// Criar ícones personalizados
function createMarkerIcon(status) {
  const color = statusColors[status] || statusColors.aberta;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:2px solid white;"></div>`,
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
    // Limpar marcadores existentes
    Object.keys(markers).forEach(key => {
      if (markers[key]) {
        map.removeLayer(markers[key]);
        delete markers[key];
      }
    });
    
    // Limpar lista
    document.getElementById('woList').innerHTML = '';
    
    if (!snapshot.exists()) {
      document.getElementById('woList').innerHTML = '<p class="text-muted">Nenhuma WO encontrada</p>';
      return;
    }
    
    snapshot.forEach((childSnapshot) => {
      const wo = childSnapshot.val();
      const woId = childSnapshot.key;
      
      // Aplicar filtro
      if (statusFilter && wo.status !== statusFilter) return;
      
      // Verificar coordenadas
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
            <h6 style="color: ${statusColors[wo.status]}">${wo.woNumber}</h6>
            <p><b>Status:</b> ${wo.status}</p>
            <p><b>PDO:</b> ${wo.pdo}</p>
            <p><b>Técnico:</b> ${wo.technician}</p>
          </div>
        `);
        
        // Armazenar referência
        markers[woId] = marker;
        
        // Adicionar à lista
        const woItem = document.createElement('div');
        woItem.className = 'wo-card';
        woItem.innerHTML = `
          <div class="d-flex justify-content-between">
            <h6>${wo.woNumber}</h6>
            <span class="status-badge" style="background-color: ${statusColors[wo.status]}20; color: ${statusColors[wo.status]}">
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
        
        document.getElementById('woList').appendChild(woItem);
        
      } catch (error) {
        console.error("Erro ao criar marcador:", error);
      }
    });
  });
}

// Adicionar nova WO
document.getElementById('woForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const woNumber = document.getElementById('woNumber').value.trim();
  const pdo = document.getElementById('pdo').value.trim();
  const coordsInput = document.getElementById('coordinates').value.trim();
  
  if (!woNumber || !pdo || !coordsInput) {
    alert("Preencha todos os campos obrigatórios!");
    return;
  }
  
  const [lat, lng] = coordsInput.split(',').map(c => parseFloat(c.trim()));
  
  if (isNaN(lat) || isNaN(lng)) {
    alert("Coordenadas inválidas! Use o formato: lat, lng");
    return;
  }
  
  try {
    await woRef.push({
      woNumber,
      pdo,
      lat,
      lng,
      status: 'aberta', // Status padrão
      technician: document.getElementById('technician').value.trim() || 'Não informado',
      type: document.querySelector('input[name="type"]:checked').value,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    
    document.getElementById('woForm').reset();
    map.setView([lat, lng], 15); // Centraliza no novo marcador
    showToast('WO cadastrada com sucesso!');
    
  } catch (error) {
    console.error("Erro ao salvar WO:", error);
    alert("Erro ao salvar WO. Verifique o console.");
  }
});

// Funções auxiliares
function showToast(message) {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = '#28a745';
  toast.style.color = 'white';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '5px';
  toast.style.zIndex = '10000';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Inicializar
loadWorkOrders();

// DEBUG: Teste inicial
setTimeout(() => {
  // Adiciona um marcador de teste
  const testMarker = L.marker([38.7223, -9.1393], {
    icon: createMarkerIcon('aberta')
  }).addTo(map)
    .bindPopup("Marcador de Teste")
    .openPopup();
  
  console.log("Marcador de teste testestestes adicionado:", testMarker);
}, 1000);
