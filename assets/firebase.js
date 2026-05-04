import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

/**
 * Firebase Configuration
 * Sourced from environment variables for security and portability.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Log initialization status for production debugging
console.log('[Firebase] Initializing with config:', {
  apiKey: firebaseConfig.apiKey ? 'Present' : 'Missing',
  projectId: firebaseConfig.projectId ? 'Present' : 'Missing'
});

let app;
let db;
let auth;
let initialized = false;

try {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Critical Firebase configuration is missing. Ensure environment variables are set.');
  }
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  initialized = true;
} catch (error) {
  console.error('[Firebase] Initialization Error:', error.message);
}

export { app, db, auth, initialized };
export const createdAt = () => serverTimestamp();
