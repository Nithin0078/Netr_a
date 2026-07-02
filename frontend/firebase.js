import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB8Pjle2OQ91CTe7pIPiWkJc-fzDp0b8vI",
    authDomain: "netra-3.firebaseapp.com",
    projectId: "netra-3",
    storageBucket: "netra-3.firebasestorage.app",
    messagingSenderId: "724023660492",
    appId: "1:724023660492:web:aaa48e473d67313dadd769"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;