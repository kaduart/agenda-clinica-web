import firebase from "firebase/compat/app";
import "firebase/compat/database";

// ✅ Mantive seu config exatamente como estava
const firebaseConfig = {
    apiKey: "AIzaSyBcAvxbMqJiSVkJjejadxZfRv6jI0myNbk",
    authDomain: "agenda-clinica-fono-inova.firebaseapp.com",
    databaseURL: "https://agenda-clinica-fono-inova-default-rtdb.firebaseio.com",
    projectId: "agenda-clinica-fono-inova",
    storageBucket: "agenda-clinica-fono-inova.firebasestorage.app",
    messagingSenderId: "16411552752",
    appId: "1:16411552752:web:f338a5ea8c0c3577d44b35",
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const database = firebase.database();
