import { auth, createdAt, db } from './firebase.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const showToast = (message, type = 'success') => {
  const root = $('#toast-container') || (() => {
    const node = document.createElement('div');
    node.id = 'toast-container';
    node.className = 'toast-container';
    document.body.appendChild(node);
    return node;
  })();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  root.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
};

const setFieldError = (input, message = '') => {
  const field = input.closest('.field');
  if (!field) return;
  const err = $('.error', field);
  if (err) err.textContent = message;
  input.classList.toggle('invalid', Boolean(message));
};

const validateRequired = (input, label) => {
  const ok = input.value.trim().length > 0;
  setFieldError(input, ok ? '' : `${label} is required.`);
  return ok;
};

const validateEmail = (input) => {
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
  setFieldError(input, ok ? '' : 'Enter a valid email address.');
  return ok;
};

const formatDate = (value) => {
  if (!value) return 'TBA';
  if (typeof value === 'string') return value;
  if (value.toDate) {
    const d = value.toDate();
    return d.toISOString().slice(0, 10);
  }
  return String(value);
};

const parseMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (value.toDate) return value.toDate().getTime();
  return 0;
};

const isUpcoming = (event) => {
  const status = String(event.status || '').toUpperCase();
  if (status === 'UPCOMING') return true;
  const ms = parseMillis(event.dateISO);
  return ms > Date.now() - 86400000;
};

const navInit = () => {
  const toggle = $('.menu-toggle');
  const navMenu = $('#nav-menu');
  if (toggle && navMenu) {
    toggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      toggle.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    $$('#nav-menu a').forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  const page = document.body.dataset.page;
  if (page === 'home') {
    const brand = $('.brand');
    if (brand) {
      brand.addEventListener('click', (event) => {
        if (brand.getAttribute('href') === '#top') {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }
};

const initSlides = () => {
  const sliders = $$('[data-slideshow]');
  sliders.forEach((slider) => {
    const slides = $$('.slide', slider);
    const dots = $$('.slide-dot', slider);
    const nextBtn = $('.slide-btn.next', slider);
    const prevBtn = $('.slide-btn.prev', slider);
    const autoDelay = Number(slider.dataset.auto || '0');
    let idx = 0;
    let timer = null;

    const show = (nextIndex) => {
      idx = (nextIndex + slides.length) % slides.length;
      slides.forEach((el, i) => el.classList.toggle('active', i === idx));
      dots.forEach((el, i) => el.classList.toggle('active', i === idx));
    };

    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
    if (nextBtn) nextBtn.addEventListener('click', () => show(idx + 1));
    if (prevBtn) prevBtn.addEventListener('click', () => show(idx - 1));

    const startAuto = () => {
      if (!autoDelay || slides.length <= 1) return;
      timer = setInterval(() => show(idx + 1), autoDelay);
    };

    const stopAuto = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    slider.addEventListener('mouseenter', stopAuto);
    slider.addEventListener('mouseleave', startAuto);
    show(0);
    startAuto();
  });
};

const renderTicker = (events) => {
  const track = $('#announcement-track');
  if (!track) return;

  if (!events.length) {
    track.innerHTML = '<span class="ticker-item">Upcoming events will be announced soon.</span>';
    return;
  }

  const rows = events.map((item) => {
    const text = `${item.title} | ${formatDate(item.dateISO)} | ${item.semester || 'GCPC'}`;
    return `<a class="ticker-item" href="event.html?id=${encodeURIComponent(item.id)}">${escapeHtml(text)}</a>`;
  }).join('');

  track.innerHTML = `${rows}${rows}`;
};

const renderEventCards = (events, selector = '#events-grid') => {
  const host = $(selector);
  if (!host) return;

  if (!events.length) {
    host.innerHTML = '<article class="card"><p class="loading">No upcoming events published yet.</p></article>';
    return;
  }

  host.innerHTML = events.map((event) => `
    <a class="card event-card" href="event.html?id=${encodeURIComponent(event.id)}">
      <span class="badge">${escapeHtml(event.semester || 'GCPC')}</span>
      <h3>${escapeHtml(event.title || 'Untitled Event')}</h3>
      <p>${escapeHtml(event.description || 'Event details will be shared soon.')}</p>
      <p class="meta">Date: ${escapeHtml(formatDate(event.dateISO))}</p>
      <p class="meta">Deadline: ${escapeHtml(formatDate(event.deadlineISO))}</p>
      <div class="card-actions">
        <span class="btn btn-soft">View Details</span>
      </div>
    </a>
  `).join('');
};

const loadEvents = async () => {
  const snap = await getDocs(query(collection(db, 'events'), orderBy('dateISO', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

const initHome = async () => {
  try {
    const events = await loadEvents();
    const upcoming = events.filter(isUpcoming);
    renderTicker(upcoming);
    renderEventCards(upcoming.slice(0, 6));

    const highlight = $('#upcoming-highlight');
    if (highlight) {
      if (!upcoming.length) {
        highlight.textContent = 'Upcoming Highlight: New events and workshops will be announced soon.';
      } else {
        const top = upcoming[0];
        const deadline = top.deadlineISO ? ` | Last Registration: ${formatDate(top.deadlineISO)}` : '';
        highlight.textContent = `Upcoming Highlight: ${top.title}${deadline}`;
      }
    }
  } catch (err) {
    console.error(err);
    showToast('Failed to load events from Firebase.', 'error');
  }
};

const initContact = () => {
  const form = $('#contact-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('#contact-email', form);
    const subject = $('#contact-subject', form);
    const message = $('#contact-message', form);

    const ok = [
      validateRequired(email, 'Email'),
      validateEmail(email),
      validateRequired(subject, 'Subject'),
      validateRequired(message, 'Message')
    ].every(Boolean);

    if (!ok) return;

    const submitBtn = $('#contact-submit', form);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      await addDoc(collection(db, 'messages'), {
        email: email.value.trim(),
        subject: subject.value.trim(),
        message: message.value.trim(),
        createdAt: createdAt()
      });
      form.reset();
      showToast('Query sent successfully. We will get back to you soon.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to submit message. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
};

const loadMembershipStats = async () => {
  const totalEl = $('#members-total');
  const semesterEl = $('#members-semester');
  const filterEl = $('#semester-filter');

  if (!totalEl || !semesterEl || !filterEl) return;

  try {
    const snap = await getDocs(collection(db, 'memberships'));
    const list = snap.docs.map((d) => d.data());

    totalEl.textContent = String(list.length);

    const map = new Map();
    list.forEach((m) => {
      const sem = String(m.semester || 'Unknown');
      map.set(sem, (map.get(sem) || 0) + 1);
    });

    const options = ['All', ...Array.from(map.keys()).sort((a, b) => a.localeCompare(b))];
    filterEl.innerHTML = options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');

    const renderSelected = () => {
      const val = filterEl.value;
      if (val === 'All') {
        semesterEl.textContent = String(list.length);
      } else {
        semesterEl.textContent = String(map.get(val) || 0);
      }
    };

    filterEl.addEventListener('change', renderSelected);
    renderSelected();
  } catch (err) {
    console.error(err);
    totalEl.textContent = '-';
    semesterEl.textContent = '-';
  }
};

const initJoin = () => {
  const form = $('#join-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = $('#join-name', form);
    const email = $('#join-email', form);
    const studentId = $('#join-student-id', form);
    const department = $('#join-department', form);
    const semester = $('#join-semester', form);

    const checks = [
      validateRequired(name, 'Name'),
      validateRequired(email, 'Email'),
      validateEmail(email),
      validateRequired(studentId, 'Student ID'),
      validateRequired(department, 'Department'),
      validateRequired(semester, 'Semester')
    ];

    if (!checks.every(Boolean)) return;

    const submitBtn = $('#join-submit', form);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      await addDoc(collection(db, 'memberships'), {
        name: name.value.trim(),
        email: email.value.trim(),
        studentId: studentId.value.trim(),
        department: department.value.trim(),
        semester: semester.value.trim(),
        createdAt: createdAt()
      });

      form.reset();
      showToast('Application submitted successfully.', 'success');
      await loadMembershipStats();
    } catch (err) {
      console.error(err);
      showToast('Could not submit form. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }
  });

  loadMembershipStats();
};

const renderCertificateResult = (type, html) => {
  const box = $('#verify-result');
  if (!box) return;
  box.className = `status-box ${type || ''}`;
  box.innerHTML = html;
};

const verifyCertificate = async (certId) => {
  const normalized = certId.trim();
  if (!normalized) {
    renderCertificateResult('error', 'Please enter a certificate ID.');
    return;
  }

  renderCertificateResult('', 'Checking certificate...');

  try {
    const ref = doc(db, 'certificates', normalized);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      renderCertificateResult('error', '<strong>Invalid Certificate</strong>');
      return;
    }

    const data = snap.data();
    const status = String(data.status || '').toUpperCase();
    const body = `
      <p><strong>Certificate ID:</strong> ${escapeHtml(normalized)}</p>
      <p><strong>Name:</strong> ${escapeHtml(data.name || 'N/A')}</p>
      <p><strong>Student ID:</strong> ${escapeHtml(data.student_id || 'N/A')}</p>
      <p><strong>Course:</strong> ${escapeHtml(data.course || 'N/A')}</p>
      <p><strong>Issue Date:</strong> ${escapeHtml(data.issue_date || 'N/A')}</p>
      <p><strong>Status:</strong> ${escapeHtml(status || 'N/A')}</p>
      <p><strong>Issued By:</strong> ${escapeHtml(data.issued_by || 'GCPC')}</p>
    `;

    if (status === 'VALID') {
      renderCertificateResult('success', `<p><strong>Certificate is VALID</strong></p>${body}`);
    } else {
      renderCertificateResult('warning', `<p><strong>Warning:</strong> Certificate found but status is ${escapeHtml(status || 'UNKNOWN')}.</p>${body}`);
    }
  } catch (err) {
    console.error(err);
    renderCertificateResult('error', 'Verification failed. Please try again.');
  }
};

const initVerify = () => {
  const form = $('#verify-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const certInput = $('#cert-id', form);
    const certId = certInput.value.trim();
    if (!certId) {
      setFieldError(certInput, 'Certificate ID is required.');
      return;
    }
    setFieldError(certInput, '');

    const url = new URL(window.location.href);
    url.searchParams.set('cert_id', certId);
    window.history.replaceState({}, '', url.toString());
    await verifyCertificate(certId);
  });

  const params = new URLSearchParams(window.location.search);
  const certId = params.get('cert_id');
  if (certId) {
    const input = $('#cert-id', form);
    input.value = certId;
    verifyCertificate(certId);
  }
};

const initEventPage = async () => {
  const host = $('#event-detail');
  if (!host) return;

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    host.innerHTML = '<article class="card"><p class="loading">No event selected.</p></article>';
    return;
  }

  try {
    const snap = await getDoc(doc(db, 'events', id));
    if (!snap.exists()) {
      host.innerHTML = '<article class="card"><p class="loading">Event not found.</p></article>';
      return;
    }

    const e = snap.data();
    host.innerHTML = `
      <article class="card">
        <span class="badge">${escapeHtml(e.semester || 'GCPC')}</span>
        <h2>${escapeHtml(e.title || 'Untitled Event')}</h2>
        <p>${escapeHtml(e.description || 'No description available.')}</p>
        <p class="meta"><strong>Date:</strong> ${escapeHtml(formatDate(e.dateISO))}</p>
        <p class="meta"><strong>Registration Deadline:</strong> ${escapeHtml(formatDate(e.deadlineISO))}</p>
        <p class="meta"><strong>Venue:</strong> ${escapeHtml(e.venue || 'TBA')}</p>
        <p class="meta"><strong>Status:</strong> ${escapeHtml(e.status || 'N/A')}</p>
        ${e.registrationLink ? `<a class="btn btn-primary" href="${escapeHtml(e.registrationLink)}" target="_blank" rel="noopener noreferrer">Registration Link</a>` : ''}
      </article>
    `;
  } catch (err) {
    console.error(err);
    host.innerHTML = '<article class="card"><p class="loading">Failed to load event details.</p></article>';
  }
};

const initWingPage = async () => {
  const pageRoot = $('[data-wing]');
  if (!pageRoot) return;
  const wing = String(pageRoot.dataset.wing || '').toLowerCase();
  const host = $('#wing-events');
  if (!host) return;

  try {
    const all = await loadEvents();
    const filtered = all.filter((event) => {
      const title = String(event.title || '').toLowerCase();
      const desc = String(event.description || '').toLowerCase();
      return title.includes(wing) || desc.includes(wing);
    }).filter(isUpcoming);

    renderEventCards(filtered.slice(0, 8), '#wing-events');
  } catch (err) {
    console.error(err);
    host.innerHTML = '<article class="card"><p class="loading">Failed to load wing events.</p></article>';
  }
};

const checkAdmin = async (uid) => {
  if (!uid) return false;
  const ref = doc(db, 'admins', uid);
  const snap = await getDoc(ref);
  return snap.exists();
};

const setLoading = (selector, text = 'Loading...') => {
  const target = $(selector);
  if (target) target.innerHTML = `<p class="loading">${escapeHtml(text)}</p>`;
};

const renderAdminEvents = async () => {
  setLoading('#events-table-wrap', 'Loading events...');
  const snap = await getDocs(query(collection(db, 'events'), orderBy('dateISO', 'asc')));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const wrap = $('#events-table-wrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Title</th><th>Semester</th><th>Date</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.title || '')}</td>
              <td>${escapeHtml(row.semester || '')}</td>
              <td>${escapeHtml(formatDate(row.dateISO))}</td>
              <td>${escapeHtml(row.status || '')}</td>
              <td>
                <div class="action-row">
                  <button class="small-btn" data-edit-event="${escapeHtml(row.id)}">Edit</button>
                  <button class="small-btn danger" data-delete-event="${escapeHtml(row.id)}">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const renderAdminCertificates = async () => {
  setLoading('#cert-table-wrap', 'Loading certificates...');
  const snap = await getDocs(collection(db, 'certificates'));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const wrap = $('#cert-table-wrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Cert ID</th><th>Name</th><th>Student ID</th><th>Course</th><th>Status</th><th>Action</th></tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.id)}</td>
              <td>${escapeHtml(row.name || '')}</td>
              <td>${escapeHtml(row.student_id || '')}</td>
              <td>${escapeHtml(row.course || '')}</td>
              <td>${escapeHtml(row.status || '')}</td>
              <td>
                <div class="action-row">
                  <button class="small-btn" data-edit-cert="${escapeHtml(row.id)}">Edit</button>
                  <button class="small-btn danger" data-delete-cert="${escapeHtml(row.id)}">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const renderAdminMessages = async () => {
  setLoading('#messages-table-wrap', 'Loading messages...');
  const snap = await getDocs(query(collection(db, 'messages'), orderBy('createdAt', 'desc')));
  const rows = snap.docs.map((d) => d.data());
  const wrap = $('#messages-table-wrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Email</th><th>Subject</th><th>Message</th><th>Created</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.email || '')}</td>
              <td>${escapeHtml(row.subject || '')}</td>
              <td>${escapeHtml(row.message || '')}</td>
              <td>${escapeHtml(formatDate(row.createdAt))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const renderAdminMemberships = async () => {
  setLoading('#memberships-table-wrap', 'Loading memberships...');
  const snap = await getDocs(query(collection(db, 'memberships'), orderBy('createdAt', 'desc')));
  const rows = snap.docs.map((d) => d.data());
  const wrap = $('#memberships-table-wrap');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Student ID</th><th>Department</th><th>Semester</th><th>Created</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.name || '')}</td>
              <td>${escapeHtml(row.email || '')}</td>
              <td>${escapeHtml(row.studentId || '')}</td>
              <td>${escapeHtml(row.department || '')}</td>
              <td>${escapeHtml(row.semester || '')}</td>
              <td>${escapeHtml(formatDate(row.createdAt))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const fillEventForm = async (id) => {
  const snap = await getDoc(doc(db, 'events', id));
  if (!snap.exists()) return;
  const data = snap.data();
  $('#event-id').value = id;
  $('#event-title').value = data.title || '';
  $('#event-semester').value = data.semester || '';
  $('#event-date').value = formatDate(data.dateISO) === 'TBA' ? '' : formatDate(data.dateISO);
  $('#event-deadline').value = formatDate(data.deadlineISO) === 'TBA' ? '' : formatDate(data.deadlineISO);
  $('#event-venue').value = data.venue || '';
  $('#event-description').value = data.description || '';
  $('#event-registration').value = data.registrationLink || '';
  $('#event-status').value = data.status || 'UPCOMING';
};

const fillCertForm = async (certId) => {
  const snap = await getDoc(doc(db, 'certificates', certId));
  if (!snap.exists()) return;
  const data = snap.data();
  $('#cert-id').value = certId;
  $('#cert-name').value = data.name || '';
  $('#cert-student-id').value = data.student_id || '';
  $('#cert-course').value = data.course || '';
  $('#cert-issue-date').value = data.issue_date || '';
  $('#cert-status').value = data.status || 'VALID';
  $('#cert-issued-by').value = data.issued_by || 'DIU GCPC';
};

const wireAdminTabs = () => {
  const tabs = $$('.tab-btn');
  const panes = $$('.admin-pane');
  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabs.forEach((b) => b.classList.toggle('active', b === btn));
      panes.forEach((pane) => pane.classList.toggle('hidden', pane.id !== target));
    });
  });
};

const initAdmin = () => {
  const loginForm = $('#admin-login-form');
  const logoutBtn = $('#admin-logout');
  const loginShell = $('#admin-login-shell');
  const dashboard = $('#admin-dashboard');
  const who = $('#admin-who');

  if (!loginForm || !logoutBtn || !loginShell || !dashboard) return;

  wireAdminTabs();

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('#admin-email');
    const password = $('#admin-password');

    const ok = [
      validateRequired(email, 'Email'),
      validateEmail(email),
      validateRequired(password, 'Password')
    ].every(Boolean);

    if (!ok) return;

    const btn = $('#admin-login-btn');
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    try {
      await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    } catch (err) {
      console.error(err);
      showToast('Login failed. Check your credentials.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    showToast('Signed out.', 'success');
  });

  const eventForm = $('#admin-event-form');
  const certForm = $('#admin-cert-form');

  eventForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = $('#event-id').value.trim();
    const payload = {
      title: $('#event-title').value.trim(),
      semester: $('#event-semester').value.trim(),
      dateISO: $('#event-date').value,
      deadlineISO: $('#event-deadline').value,
      venue: $('#event-venue').value.trim(),
      description: $('#event-description').value.trim(),
      registrationLink: $('#event-registration').value.trim(),
      status: $('#event-status').value,
      createdAt: createdAt()
    };

    if (!payload.title || !payload.semester || !payload.dateISO || !payload.status) {
      showToast('Fill required event fields.', 'error');
      return;
    }

    try {
      if (id) {
        await updateDoc(doc(db, 'events', id), payload);
        showToast('Event updated.', 'success');
      } else {
        await addDoc(collection(db, 'events'), payload);
        showToast('Event created.', 'success');
      }
      eventForm.reset();
      $('#event-id').value = '';
      await renderAdminEvents();
    } catch (err) {
      console.error(err);
      showToast('Failed to save event.', 'error');
    }
  });

  certForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const certId = $('#cert-id').value.trim();
    if (!certId) {
      showToast('Certificate ID is required.', 'error');
      return;
    }

    const payload = {
      name: $('#cert-name').value.trim(),
      student_id: $('#cert-student-id').value.trim(),
      course: $('#cert-course').value.trim(),
      issue_date: $('#cert-issue-date').value,
      status: $('#cert-status').value,
      issued_by: $('#cert-issued-by').value.trim() || 'DIU GCPC',
      updatedAt: serverTimestamp()
    };

    if (!payload.name || !payload.student_id || !payload.course || !payload.issue_date) {
      showToast('Fill required certificate fields.', 'error');
      return;
    }

    try {
      await setDoc(doc(db, 'certificates', certId), payload, { merge: true });
      showToast('Certificate saved.', 'success');
      await renderAdminCertificates();
    } catch (err) {
      console.error(err);
      showToast('Failed to save certificate.', 'error');
    }
  });

  $('#admin-event-clear')?.addEventListener('click', () => {
    eventForm?.reset();
    $('#event-id').value = '';
  });

  $('#admin-cert-clear')?.addEventListener('click', () => {
    certForm?.reset();
  });

  document.addEventListener('click', async (event) => {
    const editEventId = event.target.closest('[data-edit-event]')?.dataset.editEvent;
    const deleteEventId = event.target.closest('[data-delete-event]')?.dataset.deleteEvent;
    const editCertId = event.target.closest('[data-edit-cert]')?.dataset.editCert;
    const deleteCertId = event.target.closest('[data-delete-cert]')?.dataset.deleteCert;

    try {
      if (editEventId) {
        await fillEventForm(editEventId);
        showToast('Event loaded into form.', 'success');
      }
      if (deleteEventId) {
        const ok = window.confirm('Delete this event?');
        if (!ok) return;
        await deleteDoc(doc(db, 'events', deleteEventId));
        showToast('Event deleted.', 'success');
        await renderAdminEvents();
      }
      if (editCertId) {
        await fillCertForm(editCertId);
        showToast('Certificate loaded into form.', 'success');
      }
      if (deleteCertId) {
        const ok = window.confirm('Delete this certificate?');
        if (!ok) return;
        await deleteDoc(doc(db, 'certificates', deleteCertId));
        showToast('Certificate deleted.', 'success');
        await renderAdminCertificates();
      }
    } catch (err) {
      console.error(err);
      showToast('Action failed.', 'error');
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      loginShell.classList.remove('hidden');
      dashboard.classList.add('hidden');
      who.textContent = 'Not signed in';
      return;
    }

    const allowed = await checkAdmin(user.uid);
    if (!allowed) {
      showToast('This account is not in admins collection.', 'error');
      await signOut(auth);
      return;
    }

    who.textContent = user.email || 'Admin';
    loginShell.classList.add('hidden');
    dashboard.classList.remove('hidden');

    await Promise.all([
      renderAdminEvents(),
      renderAdminCertificates(),
      renderAdminMessages(),
      renderAdminMemberships()
    ]);
  });
};

const initPage = async () => {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  window.scrollTo(0, 0);
  window.addEventListener('pageshow', () => window.scrollTo(0, 0));

  navInit();
  initSlides();

  const page = document.body.dataset.page;
  if (page === 'home') await initHome();
  if (page === 'contact') initContact();
  if (page === 'join') initJoin();
  if (page === 'verify') initVerify();
  if (page === 'event') await initEventPage();
  if (page === 'wing') await initWingPage();
  if (page === 'admin') initAdmin();
};

initPage();
