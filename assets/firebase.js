import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyBLfKpCMiOkkPoJB7nsFzM5JIy-G2fYhd0',
  authDomain: 'gcpc-portal.firebaseapp.com',
  projectId: 'gcpc-portal',
  messagingSenderId: '657467429698',
  appId: '1:657467429698:web:0521e002f35f817935aedb',
  measurementId: 'G-Z1XDXNDE8N'
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const createdAt = () => serverTimestamp();
