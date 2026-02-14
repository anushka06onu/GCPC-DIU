import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'REMOVED_API_KEY',
  authDomain: 'gcpc-portal.firebaseapp.com',
  projectId: 'gcpc-portal',
  messagingSenderId: 'REMOVED_SENDER_ID',
  appId: '1:REMOVED_SENDER_ID:web:0521e002f35f817935aedb',
  measurementId: 'REMOVED_MEASUREMENT_ID'
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const createdAt = () => serverTimestamp();
