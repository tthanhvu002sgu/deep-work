// src/services/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged 
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const STORAGE_KEY_FIREBASE_CONFIG = "deepwork_firebase_custom_config";

// Cấu hình Firebase mặc định của dự án DeepWork
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBW4V5VRRU9NPSIXxElfogSmxGUA_qITK4",
  authDomain: "deepwork-1daf8.firebaseapp.com",
  projectId: "deepwork-1daf8",
  storageBucket: "deepwork-1daf8.firebasestorage.app",
  messagingSenderId: "753522179255",
  appId: "1:753522179255:web:ddc01b4e0b8d8ed2a66132",
  measurementId: "G-3QWCP5G1NB"
};

// Lấy cấu hình Firebase: ưu tiên localStorage -> biến môi trường .env -> cấu hình mặc định
export const getActiveFirebaseConfig = () => {
  try {
    const customConfigStr = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (customConfigStr) {
      const parsed = JSON.parse(customConfigStr);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Lỗi khi đọc custom Firebase config:", e);
  }

  // Nếu có biến môi trường
  if (process.env.REACT_APP_FIREBASE_API_KEY && process.env.REACT_APP_FIREBASE_PROJECT_ID) {
    return {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.REACT_APP_FIREBASE_APP_ID || "",
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "",
    };
  }

  // Mặc định
  return DEFAULT_FIREBASE_CONFIG;
};

export const saveCustomFirebaseConfig = (config) => {
  if (!config || !config.apiKey || !config.projectId) {
    throw new Error("Cấu hình Firebase phải bao gồm tối thiểu apiKey và projectId.");
  }
  localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
  // Re-init app
  return initFirebaseApp();
};

export const clearCustomFirebaseConfig = () => {
  localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
};

export const isFirebaseConfigured = () => {
  const config = getActiveFirebaseConfig();
  return Boolean(
    config.apiKey && 
    config.projectId && 
    !config.apiKey.includes("YOUR_") && 
    !config.projectId.includes("YOUR_")
  );
};

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

export const initFirebaseApp = () => {
  const config = getActiveFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    console.log("ℹ️ Firebase chưa được cấu hình. Ứng dụng tiếp tục dùng LocalStorage.");
    return { app: null, auth: null, db: null, googleProvider: null };
  }

  try {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(config);
    }

    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    return { app, auth, db, googleProvider };
  } catch (err) {
    console.error("❌ Lỗi khởi tạo Firebase:", err);
    return { app: null, auth: null, db: null, googleProvider: null };
  }
};

// Khởi tạo ngay khi load file
const instances = initFirebaseApp();
app = instances.app;
auth = instances.auth;
db = instances.db;
googleProvider = instances.googleProvider;

export { 
  app, 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  firebaseSignOut, 
  firebaseOnAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc 
};
