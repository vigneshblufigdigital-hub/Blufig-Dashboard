import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

// Hardcoded Firebase configuration from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCPIHV3dfwV7TEGRz1klfNpiJ7Bd4VyM7k",
  authDomain: "gen-lang-client-0145079617.firebaseapp.com",
  projectId: "gen-lang-client-0145079617",
  storageBucket: "gen-lang-client-0145079617.firebasestorage.app",
  messagingSenderId: "740472316203",
  appId: "1:740472316203:web:c3a5ca57cfcba4fa64256e"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom database ID from config (passed as the third parameter in SDK v9)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true
}, "ai-studio-blufigoperations-d297ba01-a7ac-4259-b76e-be482e0c94ef");

/**
 * Seeds a firestore collection with default data if it is currently empty.
 */
export async function seedCollectionIfEmpty<T extends { id: string }>(
  collectionName: string, 
  defaultData: T[]
) {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      console.log(`Seeding collection "${collectionName}" with ${defaultData.length} records...`);
      const batch = writeBatch(db);
      defaultData.forEach((item) => {
        const docRef = doc(db, collectionName, item.id);
        batch.set(docRef, item);
      });
      await batch.commit();
      console.log(`Seeding collection "${collectionName}" completed successfully.`);
    }
  } catch (error) {
    console.error(`Error seeding collection "${collectionName}":`, error);
  }
}

/**
 * Saves a document to a specific collection (creates or overwrites).
 */
export async function saveDocToFirestore<T extends { id: string }>(
  collectionName: string,
  data: T
) {
  try {
    const docRef = doc(db, collectionName, data.id);
    await setDoc(docRef, data);
  } catch (error) {
    console.error(`Error saving document inside "${collectionName}" with ID "${data.id}":`, error);
    throw error;
  }
}

/**
 * Deletes a document from a specific collection.
 */
export async function deleteDocFromFirestore(
  collectionName: string,
  docId: string
) {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document inside "${collectionName}" with ID "${docId}":`, error);
    throw error;
  }
}

/**
 * Listens to a collection in real-time and executes a callback with the updated list of documents.
 */
export function syncCollection<T>(
  collectionName: string,
  onUpdate: (data: T[]) => void
) {
  const colRef = collection(db, collectionName);
  return onSnapshot(colRef, (snapshot) => {
    const items: T[] = [];
    snapshot.forEach((doc) => {
      items.push(doc.data() as T);
    });
    onUpdate(items);
  }, (error) => {
    console.error(`Error in real-time sync for collection "${collectionName}":`, error);
  });
}

/**
 * Fetches a single document from a specific collection by its ID.
 */
export async function getDocFromFirestore<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as T;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching document inside "${collectionName}" with ID "${docId}":`, error);
    return null;
  }
}
