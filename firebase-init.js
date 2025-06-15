// firebase-init.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
// Jeśli chcesz używać Analytics:
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyA4depHuFw3bJ3Uq2gjKeiW5umhjiKnJ40",
    authDomain: "acg-skrimy.firebaseapp.com",
    databaseURL: "https://acg-skrimy-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "acg-skrimy",
    storageBucket: "acg-skrimy.firebasestorage.app",
    messagingSenderId: "78237268518",
    appId: "1:78237268518:web:6b02118d081b4a49b384e7",
    measurementId: "G-6VDFPFX560"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app); // Pobierz instancję Realtime Database
// const analytics = getAnalytics(app); // Opcjonalnie, jeśli używasz Analytics

// Eksportuj instancję bazy danych, aby była dostępna w innych plikach
export { database, ref, push, onValue, remove };