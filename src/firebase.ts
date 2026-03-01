import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDTA811nJYAYVVDDEyhwO77q5zSbZkumGU",
  authDomain: "eduforum-94fb9.firebaseapp.com",
  projectId: "eduforum-94fb9",
  storageBucket: "eduforum-94fb9.firebasestorage.app",
  messagingSenderId: "979117673739",
  appId: "1:979117673739:web:ec55e0e94b5d85978ce60e",
  measurementId: "G-F26QNMBQHG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app, "forum");
export const auth = getAuth(app);
export const storage = getStorage(app);
