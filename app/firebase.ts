import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC2Y_0EIhETGxnH1GxMRYSBO1vCX4LK-BA",
  authDomain: "zeneration-z-chautari.firebaseapp.com",
  projectId: "zeneration-z-chautari",
  storageBucket: "zeneration-z-chautari.firebasestorage.app",
  messagingSenderId: "825250336340",
  appId: "1:825250336340:web:8182b568d8186c2041e7c1",
  measurementId: "G-JCDG4BQJMD",
};

export const app     = initializeApp(firebaseConfig);
export const db      = getFirestore(app);
export const auth    = getAuth(app);
export const storage = getStorage(app);