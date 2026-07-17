// Firebase yapılandırması — Emlak CRM
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvkdEa-dI_w8FtPDFUET7pzopoSaV-MhE",
  authDomain: "estatecrm-357b2.firebaseapp.com",
  projectId: "estatecrm-357b2",
  storageBucket: "estatecrm-357b2.firebasestorage.app",
  messagingSenderId: "1072151530886",
  appId: "1:1072151530886:web:ebac7b6604181f2e513007"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Giriş bilgisini tarayıcıda kalıcı olarak sakla — sekme/tarayıcı kapatılıp
// yeniden açıldığında tekrar giriş yapmaya gerek kalmaz.
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Kalıcılık ayarlanamadı:", err);
});

export {
  app, auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, setDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp
};
