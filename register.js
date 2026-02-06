// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCUY9wHtUsHr8gemjLo-gR7uFF93AErr2M",
  authDomain: "scameastervn.firebaseapp.com",
  projectId: "scameastervn",
  storageBucket: "scameastervn.firebasestorage.app",
  messagingSenderId: "454961718651",
  appId: "1:454961718651:web:3d54da75cfd03f657ec9de",
  measurementId: "G-PLJ7JMH4Y0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const registerButton = document.getElementById('registerButton');
registerButton.addEventListener('click', () => {
  window.location.href = 'register.html';
});

const loginButton = document.getElementById('loginButton');
loginButton.addEventListener('click', () => {
  window.location.href = 'login.html';
});

