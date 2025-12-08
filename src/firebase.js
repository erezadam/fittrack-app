import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBkfY3cReNsRC_jwL5jJVfwkEErZKYbUtg",
  authDomain: "studio-2295864140-7e5fe.firebaseapp.com",
  projectId: "studio-2295864140-7e5fe",
  storageBucket: "studio-2295864140-7e5fe.firebasestorage.app",
  messagingSenderId: "605737443158",
  appId: "1:605737443158:web:b0f878c7f3e2749e6500f7"
};

// SAFETY CHECK: Prevent duplicate initialization crash
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
