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

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Referência global ao banco de dados
const database = firebase.database();
