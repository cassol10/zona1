// Funções globais para manipulação do banco de dados

// Atualizar status da OS
function updateOrderStatus(wo, status) {
  database.ref('workOrders/' + wo).update({
    status: status,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP
  });
}

// Atualizar tipo de serviço (major/critical)
function updateServiceType(wo, type) {
  database.ref('workOrders/' + wo).update({
    serviceType: type,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP
  });
}

// Editar OS existente
function editOrder(wo, updates) {
  return database.ref('workOrders/' + wo).update({
    ...updates,
    lastUpdated: firebase.database.ServerValue.TIMESTAMP
  });
}

// Excluir OS
function deleteOrder(wo) {
  if (confirm(`Tem certeza que deseja excluir a ordem ${wo}?`)) {
    return database.ref('workOrders/' + wo).remove();
  }
  return Promise.reject('Operação cancelada');
}

// Carregar dados iniciais se o banco estiver vazio
function initializeDatabase() {
  database.ref('workOrders').once('value').then((snapshot) => {
    if (!snapshot.exists()) {
      const initialData = {
        "WO 16903160": {
          pdo: "PDO-92-LOU-0161.33",
          serviceType: "major",
          technician: "",
          coords: [38.817256, -9.165423],
          status: "aberta"
        },
        "WO 16910762": {
          pdo: "PDO-92-LOU-0010.13",
          serviceType: "critical",
          technician: "",
          coords: [38.837121, -9.156680],
          status: "pendente"
        },
        "WO 16922859": {
          pdo: "PDO-92-LOU-1259.2",
          serviceType: "major",
          technician: "",
          coords: [38.822771, -9.144502],
          status: "fechada"
        }
      };
      
      database.ref('workOrders').set(initialData)
        .then(() => console.log('Dados iniciais carregados'))
        .catch(error => console.error('Erro ao carregar dados:', error));
    }
  });
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeDatabase);
