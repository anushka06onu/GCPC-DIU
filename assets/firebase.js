import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { initializeFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

/**
 * Firebase Configuration
 * Read directly from import.meta.env to ensure Vite replaces these during build.
 * Ternary checks prevent runtime crashes if import.meta.env is undefined.
 */
export const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_FIREBASE_API_KEY : '',
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : '',
  projectId: (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_FIREBASE_PROJECT_ID : '',
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : '',
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : '',
  appId: (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_FIREBASE_APP_ID : '',
  measurementId: (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID : ''
};

// Fail-safe logging
if (typeof import.meta === 'undefined' || !import.meta.env) {
  console.error('[Firebase] Critical: import.meta.env is undefined. Environment variables are not being injected correctly by the build tool.');
}

// Log status for production debugging
console.log('[Firebase] Initializing with config status:', {
  apiKey: firebaseConfig.apiKey ? 'LOADED' : 'MISSING',
  projectId: firebaseConfig.projectId ? 'LOADED' : 'MISSING'
});

let app;
let db;
let auth;
let initialized = false;

try {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Missing critical Firebase configuration. Check Vercel environment variables.');
  }

  app = initializeApp(firebaseConfig);
  
  // Use Long Polling to bypass some AdBlocker restrictions and improve firewall compatibility
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    useFetchStreams: false
  });

  auth = getAuth(app);
  initialized = true;
  
  console.log('[Firebase] Initialization Success (Long Polling Enabled)');
} catch (error) {
  console.error('[Firebase] Initialization Error:', error.message);
}

export { app, db, auth, initialized };
export const createdAt = () => serverTimestamp();
