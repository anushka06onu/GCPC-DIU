import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseConfig } from '../firebase-config.js';

const form = document.querySelector('#verify-cert-form');
const certIdInput = document.querySelector('#cert-id');
const resultEl = document.querySelector('#cert-result');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const setResult = (type, html) => {
  resultEl.classList.remove('success', 'error');
  if (type) resultEl.classList.add(type);
  resultEl.innerHTML = html;
};

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const renderCertificate = (certId, data) => {
  const status = String(data.status || '').toUpperCase();
  const name = escapeHtml(data.name || 'N/A');
  const course = escapeHtml(data.course || 'N/A');
  const date = escapeHtml(data.date || 'N/A');

  if (status === 'VALID') {
    setResult(
      'success',
      `<p><strong>Certificate is VALID</strong></p>
       <ul>
         <li><strong>Certificate ID:</strong> ${escapeHtml(certId)}</li>
         <li><strong>Name:</strong> ${name}</li>
         <li><strong>Course/Event:</strong> ${course}</li>
         <li><strong>Date:</strong> ${date}</li>
         <li><strong>Status:</strong> ${escapeHtml(status)}</li>
       </ul>`
    );
    return;
  }

  setResult(
    'error',
    `<p><strong>Warning:</strong> Certificate found, but status is <strong>${escapeHtml(status || 'UNKNOWN')}</strong>.</p>
     <ul>
       <li><strong>Certificate ID:</strong> ${escapeHtml(certId)}</li>
       <li><strong>Name:</strong> ${name}</li>
       <li><strong>Course/Event:</strong> ${course}</li>
       <li><strong>Date:</strong> ${date}</li>
     </ul>`
  );
};

const verifyByCertId = async (certId) => {
  const normalizedId = certId.trim();
  if (!normalizedId) {
    setResult('error', 'Please enter a certificate ID.');
    return;
  }

  setResult('', 'Checking certificate...');

  try {
    const ref = doc(db, 'certificates', normalizedId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      setResult('error', 'Invalid Certificate');
      return;
    }

    renderCertificate(normalizedId, snap.data());
  } catch (error) {
    setResult('error', `Verification failed: ${escapeHtml(error.message || 'Unknown error')}`);
  }
};

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const certId = certIdInput?.value || '';
  const url = new URL(window.location.href);
  url.searchParams.set('cert_id', certId.trim());
  window.history.replaceState({}, '', url.toString());
  await verifyByCertId(certId);
});

const params = new URLSearchParams(window.location.search);
const certIdFromQuery = params.get('cert_id');
if (certIdFromQuery) {
  certIdInput.value = certIdFromQuery;
  verifyByCertId(certIdFromQuery);
}
