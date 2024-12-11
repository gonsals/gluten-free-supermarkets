import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_API_KEY,
    authDomain: `${process.env.EXPO_PUBLIC_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    storageBucket: `${process.env.EXPO_PUBLIC_PROJECT_ID}.appspot.com`,
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
