import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC3bMIWpgBSR0E11504yZywwd-I-MeVWB8",
  authDomain: "stream-s-songdb.firebaseapp.com",
  projectId: "stream-s-songdb",
  storageBucket: "stream-s-songdb.firebasestorage.app",
  messagingSenderId: "235907107375",
  appId: "1:235907107375:web:b2f17e189d3e1a7ab954da",
  measurementId: "G-4KZ1NJ3NTT"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
