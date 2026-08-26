import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCcgDggx2JCzCv37eUJeO7LovorsHV0SGQ",
  authDomain: "tradeza-4b8be.firebaseapp.com",
  databaseURL: "https://tradeza-4b8be-default-rtdb.firebaseio.com",
  projectId: "tradeza-4b8be",
  storageBucket: "tradeza-4b8be.firebasestorage.app",
  messagingSenderId: "662166015965",
  appId: "1:662166015965:web:12a7ef244e58c50e80b034",
  measurementId: "G-WTPY0YL63R"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

export { auth, db, storage, analytics };