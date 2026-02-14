import { auth, createdAt, db, firebaseConfig } from './firebase.js';
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

const FIXED_SEMESTERS = [
  'Spring 2025',
  'Summer 2025',
  'Fall 2025',
  'Spring 2026',
  'Summer 2026',
  'Fall 2026'
];

const LOCAL_EVENT_BANNERS = [
  'workshop1.jpg',
  'workshop2.jpg',
  'seminar1.jpg',
  'seminar2.jpg',
  'career1.jpg',
  'research1.jpg'
];

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
  if (value.toDate) return value.toDate().toISOString().slice(0, 10);
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

const normalizeBannerUrl = (value) => {
  const input = String(value || '').trim();
  if (!input) return '';
  if (input.startsWith('http://') || input.startsWith('https://')) return input;
  if (input.startsWith('/images/events/')) return input;
  if (input.startsWith('images/events/')) return `/${input}`;
  return `/images/events/${input.replace(/^\/+/, '')}`;
};

const eventBannerHtml = (bannerUrl, alt = 'Event banner') => {
  const normalized = normalizeBannerUrl(bannerUrl);
  if (!normalized) {
    return '<div class="event-banner-placeholder">Banner image coming soon</div>';
  }
  return `<div class="event-banner-thumb"><img src="${escapeHtml(normalized)}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.closest('.event-banner-thumb').outerHTML='<div class=&quot;event-banner-placeholder&quot;>Banner image not found</div>'" /></div>`;
};

const resolveEventBannerUrl = (event) => {
  const explicit = normalizeBannerUrl(event?.bannerUrl || '');
  if (explicit) return explicit;

  const title = String(event?.title || '').toLowerCase();
  if (title.includes('fundamentals of graphic design') || title.includes('graphic design')) {
    return '/images/events/graphic-design-spring26.png';
  }
  return '';
};

const loadLocalEventBanners = async () => {
  try {
    const response = await fetch('/images/events/manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
    const data = await response.json();
    const files = Array.isArray(data?.files) ? data.files : [];
    return files.filter((item) => typeof item === 'string' && item.trim().length > 0);
  } catch (error) {
    devLog('[Banner Manifest] fallback to local list', error);
    return [...LOCAL_EVENT_BANNERS];
  }
};

const normalizeWing = (event) => {
  const explicit = String(event.wing || '').toLowerCase();
  if (['acm', 'research', 'career'].includes(explicit)) return explicit;

  const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
  if (text.includes('research')) return 'research';
  if (text.includes('career') || text.includes('development') || text.includes('devops')) return 'career';
  return 'acm';
};

const navInit = () => {
  const toggle = $('.menu-toggle');
  const navMenu = $('#nav-menu');
  if (!toggle || !navMenu) return;

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

  const brand = $('.brand');
  if (brand && brand.getAttribute('href') === '#top') {
    brand.addEventListener('click', (event) => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
};

const initReveal = () => {
  const els = $$('.reveal');
  if (!els.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });

  els.forEach((el) => obs.observe(el));
};

const initHeroBackground = () => {
  const slides = $$('.hero-bg-slide');
  if (!slides.length) return;

  let idx = 0;
  setInterval(() => {
    slides[idx].classList.remove('active');
    idx = (idx + 1) % slides.length;
    slides[idx].classList.add('active');
  }, 4700);
};

const initSimpleSlides = () => {
  const cards = $$('[data-slideshow]');
  cards.forEach((slider) => {
    const slides = $$('.slide', slider);
    if (slides.length <= 1) return;

    const dots = $$('.slide-dot', slider);
    const nextBtn = $('.slide-btn.next', slider);
    const prevBtn = $('.slide-btn.prev', slider);
    const auto = Number(slider.dataset.auto || '5000');
    let idx = 0;
    let timer;

    const show = (i) => {
      idx = (i + slides.length) % slides.length;
      slides.forEach((el, n) => el.classList.toggle('active', n === idx));
      dots.forEach((el, n) => el.classList.toggle('active', n === idx));
    };

    dots.forEach((dot, n) => dot.addEventListener('click', () => show(n)));
    nextBtn?.addEventListener('click', () => show(idx + 1));
    prevBtn?.addEventListener('click', () => show(idx - 1));

    const start = () => { timer = setInterval(() => show(idx + 1), auto); };
    const stop = () => { if (timer) clearInterval(timer); };

    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);

    show(0);
    start();
  });
};

const fetchAllEvents = async () => {
  const snap = await getDocs(collection(db, 'events'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => parseMillis(a.dateISO) - parseMillis(b.dateISO));
};

const splitEventsByDate = (events) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const upcoming = [];
  const past = [];

  events.forEach((event) => {
    const eventMs = parseMillis(event.dateISO);
    if (!eventMs || eventMs >= todayMs) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  });

  upcoming.sort((a, b) => parseMillis(a.deadlineISO) - parseMillis(b.deadlineISO));
  past.sort((a, b) => parseMillis(b.dateISO) - parseMillis(a.dateISO));

  return { upcoming, past };
};

const renderTicker = (events) => {
  const track = $('#announcement-track');
  if (!track) return;

  if (!events.length) {
    track.innerHTML = '<span class="ticker-item">No upcoming announcements yet — check back soon.</span>';
    return;
  }

  const row = events.map((event) => {
    const txt = `${event.title} | ${event.semester || 'GCPC'} | Deadline: ${formatDate(event.deadlineISO)}`;
    return `<a class="ticker-item" href="event.html?id=${encodeURIComponent(event.id)}">${escapeHtml(txt)}</a>`;
  }).join('');

  track.innerHTML = `${row}${row}`;
};

const buildWingCards = (containerId, events) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!events.length) {
    container.innerHTML = '<div class="vertical-empty">No upcoming events for this wing yet.</div>';
    return;
  }

  const visible = events.slice(0, 2);
  container.innerHTML = `
    <div class="wing-event-list">
      ${visible.map((event) => `
        <a class="card gcpc-card interactive-card wing-event-item" href="event.html?id=${encodeURIComponent(event.id)}">
          ${eventBannerHtml(resolveEventBannerUrl(event), `${event.title || 'Event'} banner`)}
          <h4>${escapeHtml(event.title || 'Untitled Event')}</h4>
          <p class="meta">${escapeHtml(event.semester || 'GCPC')}</p>
          <p class="meta">Date: ${escapeHtml(formatDate(event.dateISO))}</p>
          <p class="meta">Deadline: ${escapeHtml(formatDate(event.deadlineISO))}</p>
        </a>
      `).join('')}
    </div>
    ${events.length > 2 ? `<a class="wing-view-all" href="wing-${normalizeWing(events[0])}.html">View all ${events.length} activities</a>` : ''}
  `;
};

const renderEventCollection = (hostId, events, emptyText) => {
  const host = document.getElementById(hostId);
  if (!host) return;
  if (!events.length) {
    host.innerHTML = `<article class="card gcpc-card"><p>${escapeHtml(emptyText)}</p></article>`;
    return;
  }

  host.innerHTML = events.map((event) => `
    <a class="card gcpc-card interactive-card" href="event.html?id=${encodeURIComponent(event.id)}">
      ${eventBannerHtml(resolveEventBannerUrl(event), `${event.title || 'Event'} banner`)}
      <span class="badge">${escapeHtml(event.semester || 'GCPC')}</span>
      <h3>${escapeHtml(event.title || 'Untitled Event')}</h3>
      <p>${escapeHtml(event.description || 'Event details coming soon.')}</p>
      <p class="meta">Date: ${escapeHtml(formatDate(event.dateISO))}</p>
      <p class="meta">Deadline: ${escapeHtml(formatDate(event.deadlineISO))}</p>
      <p class="meta">Venue: ${escapeHtml(event.venue || 'TBA')}</p>
    </a>
  `).join('');
};

const initHome = async () => {
  initHeroBackground();

  try {
    const all = await fetchAllEvents();
    const { upcoming, past } = splitEventsByDate(all);
    renderTicker(upcoming);

    const acmEvents = upcoming.filter((event) => normalizeWing(event) === 'acm');
    const researchEvents = upcoming.filter((event) => normalizeWing(event) === 'research');
    const careerEvents = upcoming.filter((event) => normalizeWing(event) === 'career');

    buildWingCards('acm-activity-slider', acmEvents);
    buildWingCards('research-activity-slider', researchEvents);
    buildWingCards('career-activity-slider', careerEvents);

    const pastEl = $('#past-events-grid');
    const upEl = $('#upcoming-events-grid');
    if (upEl) renderEventCollection('upcoming-events-grid', upcoming.slice(0, 6), 'No upcoming activities yet.');
    if (pastEl) renderEventCollection('past-events-grid', past.slice(0, 6), 'No past events available yet.');
  } catch (error) {
    console.error(error);
    renderTicker([]);
    buildWingCards('acm-activity-slider', []);
    buildWingCards('research-activity-slider', []);
    buildWingCards('career-activity-slider', []);
    renderEventCollection('upcoming-events-grid', [], 'No upcoming activities yet.');
    renderEventCollection('past-events-grid', [], 'No past events available yet.');
    showToast('Could not load upcoming events.', 'error');
  }
};

const submitMessage = async (email, subject, message) => {
  await addDoc(collection(db, 'messages'), {
    email: email.trim(),
    subject: subject.trim(),
    message: message.trim(),
    createdAt: createdAt()
  });
};

const bindMessageForm = (formId, map) => {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById(map.email);
    const subject = document.getElementById(map.subject);
    const message = document.getElementById(map.message);

    const valid = [
      validateRequired(email, 'Email'),
      validateEmail(email),
      validateRequired(subject, 'Subject'),
      validateRequired(message, 'Message')
    ].every(Boolean);

    if (!valid) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    try {
      await submitMessage(email.value, subject.value, message.value);
      form.reset();
      showToast('Message sent successfully.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to send message.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = map.buttonText;
      }
    }
  });
};

const animateCount = (element, to, duration = 900) => {
  const start = Number(element.textContent) || 0;
  const t0 = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - t0) / duration, 1);
    const value = Math.round(start + (to - start) * progress);
    element.textContent = String(value);
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

const initJoin = async () => {
  const totalEl = document.getElementById('members-total');
  const semEl = document.getElementById('members-semester');
  const select = document.getElementById('semester-filter');
  if (!totalEl || !semEl || !select) return;

  try {
    const snap = await getDocs(collection(db, 'memberships'));
    const memberships = snap.docs.map((d) => d.data());

    const map = new Map();
    memberships.forEach((m) => {
      const key = String(m.semester || 'Unknown');
      map.set(key, (map.get(key) || 0) + 1);
    });

    select.innerHTML = FIXED_SEMESTERS.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');

    animateCount(totalEl, 4000);
    setTimeout(() => {
      totalEl.textContent = '4000+';
    }, 950);

    const renderSemesterCount = () => {
      const selected = select.value;
      const real = map.get(selected) || 0;
      const count = real > 0 ? real : 100;
      animateCount(semEl, count);
    };

    select.addEventListener('change', renderSemesterCount);
    renderSemesterCount();
  } catch (error) {
    console.error(error);
    animateCount(totalEl, 4000);
    setTimeout(() => {
      totalEl.textContent = '4000+';
    }, 950);
    animateCount(semEl, 0);
    showToast('Failed to load members count.', 'error');
  }
};

const renderVerifyResult = (type, html) => {
  const box = document.getElementById('verify-result');
  if (!box) return;
  box.className = `status-box top-gap ${type || ''}`;
  box.innerHTML = html;
};

const certificateImageHtml = (url, alt = 'Certificate image') => {
  if (!url) {
    return '<div class="cert-image-wrap"><div class="cert-image-placeholder">Certificate image not available yet.</div></div>';
  }
  return `<div class="cert-image-wrap"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" /></div>`;
};

const verifyByCertId = async (certId) => {
  const normalized = certId.trim();
  if (!normalized) {
    renderVerifyResult('error', 'Please enter a certificate ID.');
    return;
  }

  try {
    const snap = await getDoc(doc(db, 'certificates', normalized));
    if (!snap.exists()) {
      renderVerifyResult('error', '<strong>Invalid Certificate</strong>');
      return;
    }

    const data = snap.data();
    const status = String(data.status || '').toUpperCase();
    const details = `
      <p><strong>Certificate ID:</strong> ${escapeHtml(normalized)}</p>
      <p><strong>Name:</strong> ${escapeHtml(data.name || 'N/A')}</p>
      <p><strong>Student ID:</strong> ${escapeHtml(data.student_id || 'N/A')}</p>
      <p><strong>Course:</strong> ${escapeHtml(data.course || 'N/A')}</p>
      <p><strong>Issue Date:</strong> ${escapeHtml(data.issue_date || 'N/A')}</p>
      <p><strong>Status:</strong> ${escapeHtml(status || 'N/A')}</p>
      ${certificateImageHtml(data.certImageUrl, `${data.name || 'Certificate'} image`)}`;

    if (status === 'VALID') {
      renderVerifyResult('success', `<p><strong>✅ Certificate verified</strong></p>${details}`);
    } else {
      renderVerifyResult('warning', `<p><strong>Warning:</strong> Certificate found but status is ${escapeHtml(status || 'UNKNOWN')}.</p>${details}`);
    }
  } catch (error) {
    console.error(error);
    renderVerifyResult('error', 'Verification failed. Please try again.');
  }
};

const verifyByStudentId = async (studentId) => {
  const normalized = studentId.trim();
  const list = document.getElementById('student-cert-list');
  if (!list) return;

  if (!normalized) {
    list.innerHTML = '';
    renderVerifyResult('error', 'Please enter a student ID.');
    return;
  }

  try {
    const snap = await getDocs(query(collection(db, 'certificates'), where('student_id', '==', normalized)));
    if (!snap.docs.length) {
      renderVerifyResult('error', 'No certificates found for this student ID.');
      list.innerHTML = '';
      return;
    }

    renderVerifyResult('success', `<strong>✅ Found ${snap.docs.length} certificate(s) for Student ID: ${escapeHtml(normalized)}</strong>`);

    list.innerHTML = `<div class="cert-list">${snap.docs.map((d) => {
      const data = d.data();
      return `<article class="cert-item">
        <p><strong>Certificate ID:</strong> ${escapeHtml(d.id)}</p>
        <p><strong>Name:</strong> ${escapeHtml(data.name || 'N/A')}</p>
        <p><strong>Course:</strong> ${escapeHtml(data.course || 'N/A')}</p>
        <p><strong>Issue Date:</strong> ${escapeHtml(data.issue_date || 'N/A')}</p>
        <p><strong>Status:</strong> ${escapeHtml(data.status || 'N/A')}</p>
        ${certificateImageHtml(data.certImageUrl, `${data.name || 'Certificate'} image`)}
      </article>`;
    }).join('')}</div>`;
  } catch (error) {
    console.error(error);
    renderVerifyResult('error', 'Search failed. Please try again.');
  }
};

const initVerify = () => {
  const certTabBtn = document.querySelector('[data-verify-tab="cert"]');
  const studentTabBtn = document.querySelector('[data-verify-tab="student"]');
  const certTab = document.getElementById('verify-tab-cert');
  const studentTab = document.getElementById('verify-tab-student');
  const certForm = document.getElementById('verify-form');
  const studentForm = document.getElementById('student-verify-form');

  if (!certForm || !studentForm) return;

  const toggleTab = (tab) => {
    const isCert = tab === 'cert';
    certTabBtn?.classList.toggle('active', isCert);
    studentTabBtn?.classList.toggle('active', !isCert);
    certTab?.classList.toggle('hidden', !isCert);
    studentTab?.classList.toggle('hidden', isCert);
  };

  certTabBtn?.addEventListener('click', () => toggleTab('cert'));
  studentTabBtn?.addEventListener('click', () => toggleTab('student'));

  certForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('cert-id');
    if (!validateRequired(input, 'Certificate ID')) return;

    const certId = input.value.trim();
    const url = new URL(window.location.href);
    url.searchParams.set('cert_id', certId);
    window.history.replaceState({}, '', url.toString());

    await verifyByCertId(certId);
  });

  studentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('student-id');
    if (!validateRequired(input, 'Student ID')) return;
    await verifyByStudentId(input.value);
  });

  const certIdFromQuery = new URLSearchParams(window.location.search).get('cert_id');
  if (certIdFromQuery) {
    const input = document.getElementById('cert-id');
    if (input) input.value = certIdFromQuery;
    verifyByCertId(certIdFromQuery);
  } else {
    renderVerifyResult('', 'Enter certificate details to verify authenticity.');
  }
};

const initEventPage = async () => {
  const host = document.getElementById('event-detail');
  if (!host) return;

  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    host.innerHTML = '<article class="card"><p>No event selected.</p></article>';
    return;
  }

  try {
    const snap = await getDoc(doc(db, 'events', id));
    if (!snap.exists()) {
      host.innerHTML = '<article class="card"><p>Event not found.</p></article>';
      return;
    }

    const e = snap.data();
    host.innerHTML = `
      <article class="card reveal in-view">
        ${eventBannerHtml(resolveEventBannerUrl(e), `${e.title || 'Event'} banner`)}
        <span class="badge">${escapeHtml(e.semester || 'GCPC')}</span>
        <h2>${escapeHtml(e.title || 'Untitled Event')}</h2>
        <p>${escapeHtml(e.description || 'No description provided.')}</p>
        <p><strong>Date:</strong> ${escapeHtml(formatDate(e.dateISO))}</p>
        <p><strong>Deadline:</strong> ${escapeHtml(formatDate(e.deadlineISO))}</p>
        <p><strong>Venue:</strong> ${escapeHtml(e.venue || 'TBA')}</p>
        <p><strong>Status:</strong> ${escapeHtml(e.status || 'N/A')}</p>
        ${e.registrationLink ? `<a class="btn btn-primary" href="${escapeHtml(e.registrationLink)}" target="_blank" rel="noopener noreferrer">Registration Link</a>` : ''}
      </article>
    `;
  } catch (error) {
    console.error(error);
    host.innerHTML = '<article class="card"><p>Failed to load event details.</p></article>';
  }
};

const initWingPage = async () => {
  const pageRoot = document.querySelector('[data-wing]');
  if (!pageRoot) return;

  const wing = String(pageRoot.dataset.wing || '').toLowerCase();
  const host = document.getElementById('wing-events');
  if (!host) return;

  try {
    const all = await fetchAllEvents();
    const { upcoming } = splitEventsByDate(all);
    const list = upcoming.filter((e) => normalizeWing(e) === wing);

    if (!list.length) {
      host.innerHTML = '<article class="card"><p>No upcoming events for this wing yet.</p></article>';
      return;
    }

    host.innerHTML = list.slice(0, 8).map((event) => `
      <a class="card interactive-card" href="event.html?id=${encodeURIComponent(event.id)}">
        ${eventBannerHtml(resolveEventBannerUrl(event), `${event.title || 'Event'} banner`)}
        <span class="badge">${escapeHtml(event.semester || 'GCPC')}</span>
        <h3>${escapeHtml(event.title || 'Untitled Event')}</h3>
        <p>${escapeHtml(event.description || 'Event details coming soon.')}</p>
        <p class="meta">Deadline: ${escapeHtml(formatDate(event.deadlineISO))}</p>
      </a>
    `).join('');
  } catch (error) {
    console.error(error);
    host.innerHTML = '<article class="card"><p>No upcoming events for this wing yet.</p></article>';
  }
};

const getAdminAccessByUid = async (uid) => {
  const snap = await getDoc(doc(db, 'admins', uid));
  const data = snap.exists() ? snap.data() : null;
  return { snap, data };
};

const isDevEnv = () => {
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const devLog = (...args) => {
  if (isDevEnv()) {
    console.log(...args);
  }
};

const setSkeleton = (selector) => {
  const target = document.querySelector(selector);
  if (target) target.classList.add('skeleton-card');
};

const clearSkeleton = (selector) => {
  const target = document.querySelector(selector);
  if (target) target.classList.remove('skeleton-card');
};

const renderAdminEvents = async () => {
  setSkeleton('#events-table-wrap');
  const wrap = document.getElementById('events-table-wrap');
  const snap = await getDocs(query(collection(db, 'events'), orderBy('deadlineISO', 'asc')));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Title</th><th>Wing</th><th>Semester</th><th>Deadline</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.title || '')}</td>
              <td>${escapeHtml(row.wing || normalizeWing(row))}</td>
              <td>${escapeHtml(row.semester || '')}</td>
              <td>${escapeHtml(formatDate(row.deadlineISO))}</td>
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

  clearSkeleton('#events-table-wrap');
};

const renderAdminCertificates = async () => {
  setSkeleton('#cert-table-wrap');
  const wrap = document.getElementById('cert-table-wrap');
  const snap = await getDocs(collection(db, 'certificates'));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Cert ID</th><th>Name</th><th>Student ID</th><th>Course</th><th>Status</th><th>Action</th></tr></thead>
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

  clearSkeleton('#cert-table-wrap');
};

const renderAdminMemberships = async () => {
  setSkeleton('#memberships-table-wrap');
  const wrap = document.getElementById('memberships-table-wrap');
  if (!wrap) return;

  try {
    let rows = [];
    try {
      const orderedSnap = await getDocs(query(collection(db, 'memberships'), orderBy('createdAt', 'desc')));
      rows = orderedSnap.docs.map((d) => d.data());
    } catch (orderError) {
      const fallbackSnap = await getDocs(collection(db, 'memberships'));
      rows = fallbackSnap.docs.map((d) => d.data());
      rows.sort((a, b) => parseMillis(b.createdAt) - parseMillis(a.createdAt));
    }

    if (!rows.length) {
      wrap.innerHTML = '<p class="empty-state">No membership submissions yet.</p>';
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Student ID</th><th>Semester</th><th>Created At</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${escapeHtml(row.name || '')}</td>
                <td>${escapeHtml(row.email || '')}</td>
                <td>${escapeHtml(row.studentId || '')}</td>
                <td>${escapeHtml(row.semester || '')}</td>
                <td>${escapeHtml(formatDate(row.createdAt))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error(error);
    if (error?.code === 'permission-denied') {
      wrap.innerHTML = '<p class="empty-state">Admin access required to view this data.</p>';
    } else {
      wrap.innerHTML = '<p class="empty-state">Unable to load membership submissions right now.</p>';
    }
  } finally {
    clearSkeleton('#memberships-table-wrap');
  }
};

const renderAdminMessages = async () => {
  setSkeleton('#messages-table-wrap');
  const wrap = document.getElementById('messages-table-wrap');
  if (!wrap) return;

  try {
    const snap = await getDocs(query(collection(db, 'messages'), orderBy('createdAt', 'desc')));
    const rows = snap.docs.map((d) => d.data());

    if (!rows.length) {
      wrap.innerHTML = '<p class="empty-state">No messages received yet.</p>';
      return;
    }

    wrap.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Email</th><th>Subject</th><th>Message</th><th>Created At</th></tr></thead>
          <tbody>
            ${rows.map((row) => {
              const fullMessage = String(row.message || '');
              const preview = fullMessage.length > 120 ? `${fullMessage.slice(0, 117)}...` : fullMessage;
              return `
                <tr>
                  <td>${escapeHtml(row.email || '')}</td>
                  <td>${escapeHtml(row.subject || '')}</td>
                  <td title="${escapeHtml(fullMessage)}">${escapeHtml(preview)}</td>
                  <td>${escapeHtml(formatDate(row.createdAt))}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error(error);
    if (error?.code === 'permission-denied') {
      wrap.innerHTML = '<p class="empty-state">Admin access required to view this data.</p>';
    } else {
      wrap.innerHTML = '<p class="empty-state">Unable to load messages right now.</p>';
    }
  } finally {
    clearSkeleton('#messages-table-wrap');
  }
};

const fillEventForm = async (id) => {
  const snap = await getDoc(doc(db, 'events', id));
  if (!snap.exists()) return;
  const data = snap.data();

  document.getElementById('event-id').value = id;
  document.getElementById('event-title').value = data.title || '';
  document.getElementById('event-wing').value = data.wing || normalizeWing(data);
  document.getElementById('event-semester').value = data.semester || '';
  document.getElementById('event-date').value = formatDate(data.dateISO) === 'TBA' ? '' : formatDate(data.dateISO);
  document.getElementById('event-deadline').value = formatDate(data.deadlineISO) === 'TBA' ? '' : formatDate(data.deadlineISO);
  document.getElementById('event-venue').value = data.venue || '';
  const normalizedBanner = normalizeBannerUrl(data.bannerUrl || '');
  const bannerInput = document.getElementById('event-banner');
  const bannerSelect = document.getElementById('event-banner-select');
  const bannerPreview = document.getElementById('event-banner-preview');
  if (bannerInput) bannerInput.value = normalizedBanner;
  if (bannerSelect) {
    const fileName = normalizedBanner.startsWith('/images/events/')
      ? normalizedBanner.replace('/images/events/', '')
      : normalizedBanner;
    const availableValues = Array.from(bannerSelect.options).map((option) => option.value);
    bannerSelect.value = availableValues.includes(fileName) ? fileName : '';
  }
  if (bannerPreview) {
    bannerPreview.innerHTML = normalizedBanner
      ? `<img src="${escapeHtml(normalizedBanner)}" alt="Event banner preview" loading="lazy" onerror="this.outerHTML='<span>Banner file not found</span>'" />`
      : '<span>No banner selected</span>';
  }
  document.getElementById('event-registration').value = data.registrationLink || '';
  document.getElementById('event-description').value = data.description || '';
  document.getElementById('event-status').value = data.status || 'UPCOMING';
};

const fillCertForm = async (id) => {
  const snap = await getDoc(doc(db, 'certificates', id));
  if (!snap.exists()) return;
  const data = snap.data();

  document.getElementById('cert-id').value = id;
  document.getElementById('cert-name').value = data.name || '';
  document.getElementById('cert-student-id').value = data.student_id || '';
  document.getElementById('cert-course').value = data.course || '';
  document.getElementById('cert-issue-date').value = data.issue_date || '';
  document.getElementById('cert-status').value = data.status || 'VALID';
  document.getElementById('cert-issued-by').value = data.issued_by || 'DIU GCPC';
};

const wireAdminTabs = () => {
  const tabs = $$('.tab-btn[data-tab]');
  const panes = $$('.admin-pane');

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabs.forEach((tab) => tab.classList.toggle('active', tab === btn));
      panes.forEach((pane) => pane.classList.toggle('hidden', pane.id !== target));
    });
  });
};

const initAdmin = async () => {
  const loginForm = document.getElementById('admin-login-form');
  const logoutBtn = document.getElementById('admin-logout');
  const loginShell = document.getElementById('admin-login-shell');
  const loadingShell = document.getElementById('admin-auth-loading');
  const debugShell = document.getElementById('admin-debug-shell');
  const debugOutput = document.getElementById('admin-debug-output');
  const deniedShell = document.getElementById('admin-denied-shell');
  const deniedSignoutBtn = document.getElementById('admin-denied-signout');
  const dashboard = document.getElementById('admin-dashboard');
  const who = document.getElementById('admin-who');
  const debugMode = new URLSearchParams(window.location.search).get('debug') === '1';
  const bannerInput = document.getElementById('event-banner');
  const bannerSelect = document.getElementById('event-banner-select');
  const bannerPreview = document.getElementById('event-banner-preview');

  if (!loginForm || !logoutBtn || !loginShell || !loadingShell || !dashboard || !who || !deniedShell || !deniedSignoutBtn) return;

  const setDebug = (payload) => {
    if (!debugMode || !debugShell || !debugOutput) return;
    debugShell.classList.remove('hidden');
    debugOutput.textContent = JSON.stringify(payload, null, 2);
  };

  wireAdminTabs();

  const setBannerPreview = (value) => {
    if (!bannerPreview) return;
    const normalized = normalizeBannerUrl(value);
    if (!normalized) {
      bannerPreview.innerHTML = '<span>No banner selected</span>';
      return;
    }
    bannerPreview.innerHTML = `<img src="${escapeHtml(normalized)}" alt="Event banner preview" loading="lazy" onerror="this.outerHTML='<span>Banner file not found</span>'" />`;
  };

  if (bannerSelect) {
    const bannerFiles = await loadLocalEventBanners();
    bannerSelect.innerHTML = '<option value="">Select banner file</option>' +
      bannerFiles.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
    bannerSelect.addEventListener('change', () => {
      if (!bannerInput) return;
      bannerInput.value = bannerSelect.value;
      setBannerPreview(bannerInput.value);
    });
  }

  bannerInput?.addEventListener('input', () => {
    setBannerPreview(bannerInput.value);
  });

  setBannerPreview('');

  // Start in a strict loading state until onAuthStateChanged resolves.
  loadingShell.classList.remove('hidden');
  loginShell.classList.add('hidden');
  deniedShell.classList.add('hidden');
  dashboard.classList.add('hidden');

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('admin-email');
    const password = document.getElementById('admin-password');
    const valid = [
      validateRequired(email, 'Email'),
      validateEmail(email),
      validateRequired(password, 'Password')
    ].every(Boolean);

    if (!valid) return;

    const btn = document.getElementById('admin-login-btn');
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    try {
      const credential = await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
      const signedInEmail = credential?.user?.email || '';
      who.textContent = signedInEmail || 'Signed in';
      console.log('[Admin Login] signedIn user.email:', signedInEmail);
    } catch (error) {
      console.error(error);
      showToast('Login failed.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Login';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    showToast('Signed out.', 'success');
  });
  deniedSignoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    showToast('Signed out.', 'success');
  });

  document.getElementById('admin-event-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = document.getElementById('event-id').value.trim();
    const payload = {
      title: document.getElementById('event-title').value.trim(),
      wing: document.getElementById('event-wing').value,
      semester: document.getElementById('event-semester').value.trim(),
      dateISO: document.getElementById('event-date').value,
      deadlineISO: document.getElementById('event-deadline').value,
      venue: document.getElementById('event-venue').value.trim(),
      bannerUrl: normalizeBannerUrl(document.getElementById('event-banner')?.value || ''),
      description: document.getElementById('event-description').value.trim(),
      registrationLink: document.getElementById('event-registration').value.trim(),
      status: document.getElementById('event-status').value,
      createdAt: createdAt()
    };

    if (!payload.title || !payload.semester || !payload.status || !payload.wing) {
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
      event.target.reset();
      document.getElementById('event-id').value = '';
      if (bannerSelect) bannerSelect.value = '';
      setBannerPreview('');
      await renderAdminEvents();
    } catch (error) {
      console.error(error);
      showToast('Failed to save event.', 'error');
    }
  });

  document.getElementById('admin-cert-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const certId = document.getElementById('cert-id').value.trim();
    if (!certId) {
      showToast('Certificate ID is required.', 'error');
      return;
    }

    const payload = {
      name: document.getElementById('cert-name').value.trim(),
      student_id: document.getElementById('cert-student-id').value.trim(),
      course: document.getElementById('cert-course').value.trim(),
      issue_date: document.getElementById('cert-issue-date').value,
      status: document.getElementById('cert-status').value,
      issued_by: document.getElementById('cert-issued-by').value.trim() || 'DIU GCPC',
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
    } catch (error) {
      console.error(error);
      showToast('Failed to save certificate.', 'error');
    }
  });

  document.getElementById('admin-event-clear')?.addEventListener('click', () => {
    document.getElementById('admin-event-form')?.reset();
    document.getElementById('event-id').value = '';
    if (bannerSelect) bannerSelect.value = '';
    setBannerPreview('');
  });

  document.getElementById('admin-cert-clear')?.addEventListener('click', () => {
    document.getElementById('admin-cert-form')?.reset();
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
        if (!window.confirm('Delete this event?')) return;
        await deleteDoc(doc(db, 'events', deleteEventId));
        await renderAdminEvents();
        showToast('Event deleted.', 'success');
      }
      if (editCertId) {
        await fillCertForm(editCertId);
        showToast('Certificate loaded into form.', 'success');
      }
      if (deleteCertId) {
        if (!window.confirm('Delete this certificate?')) return;
        await deleteDoc(doc(db, 'certificates', deleteCertId));
        await renderAdminCertificates();
        showToast('Certificate deleted.', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('Action failed.', 'error');
    }
  });

  onAuthStateChanged(auth, async (user) => {
    loadingShell.classList.remove('hidden');
    loginShell.classList.add('hidden');
    deniedShell.classList.add('hidden');
    dashboard.classList.add('hidden');

    if (!user) {
      who.textContent = 'Not signed in';
      loadingShell.classList.add('hidden');
      loginShell.classList.remove('hidden');
      return;
    }

    try {
      const uid = String(user.uid || '').trim();
      const userEmailRaw = user.email || '';
      const { snap: adminSnap, data: adminData } = await getAdminAccessByUid(uid);
      const adminDocPath = `admins/${uid}`;
      const allowed = adminSnap.exists();

      setDebug({
        projectId: firebaseConfig.projectId,
        uid,
        currentUserEmail: userEmailRaw,
        firestoreDocPath: adminDocPath,
        adminDocReadStatus: 'success',
        snapExists: adminSnap.exists(),
        snapKeys: adminData ? Object.keys(adminData) : [],
        snapJson: JSON.stringify(adminData || {}),
        isAuthorized: allowed
      });

      devLog('[Admin Guard] uid doc read success:', true);
      devLog('[Admin Guard] uid:', uid);
      devLog('[Admin Guard] doc used:', adminDocPath);

      if (!allowed) {
        console.log('[Admin Guard] uid:', uid);
        console.log('[Admin Guard] doc exists?:', adminSnap.exists());
        console.log('[Admin Guard] doc.data() raw:', adminData);
        loadingShell.classList.add('hidden');
        deniedShell.classList.remove('hidden');
        showToast('Access denied', 'error');
        return;
      }

      who.textContent = user.email || 'Admin';
      loadingShell.classList.add('hidden');
      loginShell.classList.add('hidden');
      deniedShell.classList.add('hidden');
      dashboard.classList.remove('hidden');

      await Promise.all([
        renderAdminEvents(),
        renderAdminCertificates(),
        renderAdminMemberships(),
        renderAdminMessages()
      ]);
    } catch (error) {
      console.error(error);
      devLog('[Admin Guard] uid doc read success:', false);
      showToast('Access denied', 'error');
      loadingShell.classList.add('hidden');
      deniedShell.classList.remove('hidden');
      setDebug({
        projectId: firebaseConfig.projectId,
        uid: user?.uid ?? null,
        currentUserEmail: user?.email ?? null,
        firestoreDocPath: `admins/${String(user?.uid || '').trim()}`,
        adminDocReadStatus: 'error',
        snapExists: null,
        snapDataRaw: null,
        isAuthorized: false,
        errorCode: error?.code || null,
        errorMessage: error?.message || 'Unknown error'
      });
      if (!debugMode) devLog('[Admin Guard] access denied without debug mode');
    }
  });
};

const initPage = async () => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  window.addEventListener('pageshow', () => window.scrollTo(0, 0));

  navInit();
  initReveal();
  initSimpleSlides();

  bindMessageForm('contact-form', {
    email: 'contact-email',
    subject: 'contact-subject',
    message: 'contact-message',
    buttonText: 'Send Message'
  });

  bindMessageForm('footer-contact-form', {
    email: 'footer-email',
    subject: 'footer-subject',
    message: 'footer-message',
    buttonText: 'Send'
  });

  const page = document.body.dataset.page;
  if (page === 'home') await initHome();
  if (page === 'join') await initJoin();
  if (page === 'verify') initVerify();
  if (page === 'event') await initEventPage();
  if (page === 'wing') await initWingPage();
  if (page === 'admin') await initAdmin();
};

initPage();
