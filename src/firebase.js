import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBTB15Jo6wR6xnOV7jTcaq9Un65JBW1eNU",
  authDomain: "rock-objective-477905-t3.firebaseapp.com",
  projectId: "rock-objective-477905-t3",
  storageBucket: "rock-objective-477905-t3.firebasestorage.app",
  messagingSenderId: "330256331761",
  appId: "1:330256331761:web:e9c05dbc69a35a07098a50",
  measurementId: "G-10NGWEC9GM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
