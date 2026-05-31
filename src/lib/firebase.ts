import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore. Access the named database if firestoreDatabaseId is provided, 
// otherwise it defaults to the (default) database.
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);

export async function testConnection() {
  try {
    // Try to fetch a non-existent doc to verify connection
    await getDocFromServer(doc(db, 'system_health', 'check'));
    console.log("Firebase Firestore connected successfully.");
  } catch (error: any) {
    console.warn("Firebase Check:", error.message || error);
    if (error.code === 'not-found') {
       console.log("Firestore reachability confirmed (doc not found is okay).");
    } else if (error.message && error.message.includes('the client is offline')) {
      console.error("Firebase is offline. Check your network or Firebase configuration.");
    }
  }
}
testConnection();
