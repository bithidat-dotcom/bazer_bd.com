import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Original Firebase App
const app = initializeApp(firebaseConfig);

// User-provided Second Firebase Configuration (Fast, Dedicated Food Database)
const secondFirebaseConfig = {
  apiKey: "AIzaSyD9FxCHyk-l8QUQ-2Rzbif-XjYWGC5cRog",
  authDomain: "genial-inn-2h7sp.firebaseapp.com",
  projectId: "genial-inn-2h7sp",
  storageBucket: "genial-inn-2h7sp.firebasestorage.app",
  messagingSenderId: "295815579779",
  appId: "1:295815579779:web:585000cb89c55959cc33b6"
};

// Second Firebase App for Food Catalog & Speedy Sync
const secondApp = initializeApp(secondFirebaseConfig, "secondApp");

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const db2 = getFirestore(secondApp); // Fast food specialty database
export const auth = getAuth(app);

export async function testConnection() {
  try {
    // Try to fetch a non-existent doc to verify connection
    await getDocFromServer(doc(db, 'system_health', 'check'));
    console.log("Primary Firebase Firestore connected successfully.");
    
    await getDocFromServer(doc(db2, 'system_health', 'check'));
    console.log("Second Food Firebase Firestore connected successfully.");
  } catch (error: any) {
    console.warn("Firebase Check:", error.message || error);
    if (error.code === 'not-found') {
       console.log("Firestore reachability confirmed.");
    }
  }
}
testConnection();
