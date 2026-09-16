import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// A placeholder config is required even when using the emulator
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:123456789"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

// Connect to Local Emulator Suite
const hostname = window.location.hostname;
connectFirestoreEmulator(db, hostname, 8080);
connectAuthEmulator(auth, `http://${hostname}:9099`, { disableWarnings: true });

export { db, auth };
