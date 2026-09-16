// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "rag-based-f623b.firebaseapp.com",
  projectId: "rag-based-f623b",
  storageBucket: "rag-based-f623b.firebasestorage.app",
  messagingSenderId: "210388158886",
  appId: "1:210388158886:web:c2df94fea97733e5192767"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth=getAuth(app)
export const googleProvider=new GoogleAuthProvider()