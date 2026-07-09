import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPIHV3dfwV7TEGRz1klfNpiJ7Bd4VyM7k",
  authDomain: "gen-lang-client-0145079617.firebaseapp.com",
  projectId: "gen-lang-client-0145079617",
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, "ai-studio-blufigoperations-d297ba01-a7ac-4259-b76e-be482e0c94ef");

async function dumpSettings() {
  try {
    const colRef = collection(db, 'settings');
    const snapshot = await getDocs(colRef);
    console.log(`Found ${snapshot.size} documents in settings:`);
    snapshot.forEach(doc => {
      console.log(`- Document "${doc.id}":`, JSON.stringify(doc.data(), null, 2));
    });
  } catch (err: any) {
    console.error("Error reading settings collection:", err.message);
  }
  process.exit(0);
}

dumpSettings();
