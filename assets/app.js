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

const DEFAULT_SUCCESS_STORIES = [
  {
    src: 'images/success-stories/story1.jpg',
    caption: 'Anika Rahman — Software Engineer, Brain Station 23'
  },
  {
    src: 'images/success-stories/story2.jpg',
    caption: 'Sadia Amin — Research Associate, DIU Advanced Lab'
  },
  {
    src: 'images/success-stories/story3.jpg',
    caption: 'Maisha Khan — Product Designer, RiseUp Tech'
  },
  {
    src: 'images/success-stories/story4.jpg',
    caption: 'Tasnia Ahmed — National ICT Award Winner'
  },
  {
    src: 'images/success-stories/story5.jpg',
    caption: 'Farhana Rahim — Community Lead, Women in Tech'
  }
];

const STORY_PLACEHOLDER = 'gcpc-logo.png';

const EVENT_TYPE_LABELS = {
  workshop: 'Workshop',
  seminar: 'Seminar',
  contest: 'Contest',
  meetup: 'Meetup'
};

const WING_LABELS = {
  acm: 'ACM Wing',
  research: 'Research Wing',
  career: 'Career & PR Wing',
  development: 'Development Wing'
};

const THEME_STORAGE_KEY = 'gcpc-theme';
const SCROLL_MEMORY_KEY = 'gcpc-scroll-memory';
const SCROLL_RESTORE_KEY = 'gcpc-scroll-restore';

const ROUTE_MAP = {
  '/': '#top',
  '/home': '#top',
  '/about': '#about',
  '/wings': '#wings',
  '/committee': '#committee',
  '/committe': '#committee',
  '/events': '#events',
  '/gallery': '#gallery',
  '/contact': '#contact'
};

const normalizePath = (pathname) => {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized === '' ? '/' : normalized;
};

const isHomePath = (pathname) => ['/', '/home'].includes(normalizePath(pathname));

const pathsMatch = (left, right) => {
  const a = normalizePath(left || '/');
  const b = normalizePath(right || '/');
  return a === b || (isHomePath(a) && isHomePath(b));
};

const readJsonStorage = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key) || 'null');
  } catch (error) {
    return null;
  }
};

const getNavigationType = () => {
  const navEntries = performance.getEntriesByType?.('navigation') || [];
  return navEntries[0]?.type || 'navigate';
};

const rememberCurrentScroll = (targetHref = '', sectionId = '') => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(SCROLL_MEMORY_KEY, JSON.stringify({
    path: normalizePath(window.location.pathname),
    scrollY: window.scrollY,
    targetPath: targetHref ? normalizePath(new URL(targetHref, window.location.origin).pathname) : '',
    sectionId: String(sectionId || '').trim(),
    ts: Date.now()
  }));
};

const readScrollMemory = () => {
  if (typeof sessionStorage === 'undefined') return null;
  const saved = readJsonStorage(sessionStorage, SCROLL_MEMORY_KEY);
  if (!saved || typeof saved !== 'object') return null;
  if (Date.now() - Number(saved.ts || 0) > 30 * 60 * 1000) return null;
  return saved;
};

const flagScrollRestore = (pathname) => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(SCROLL_RESTORE_KEY, JSON.stringify({
    path: normalizePath(pathname || window.location.pathname),
    ts: Date.now()
  }));
};

const hasScrollRestoreFlag = (pathname) => {
  if (typeof sessionStorage === 'undefined') return false;
  const flag = readJsonStorage(sessionStorage, SCROLL_RESTORE_KEY);
  if (!flag || typeof flag !== 'object') return false;
  if (Date.now() - Number(flag.ts || 0) > 30 * 60 * 1000) return false;
  return pathsMatch(flag.path, pathname);
};

const clearScrollRestoreFlag = () => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SCROLL_RESTORE_KEY);
};

const shouldRestoreScroll = (pathname) => hasScrollRestoreFlag(pathname) || getNavigationType() === 'back_forward';

const restoreSavedScroll = (pathname) => {
  const saved = readScrollMemory();
  if (!saved || !pathsMatch(saved.path, pathname)) return false;

  let attempts = 0;
  const target = Math.max(0, Number(saved.scrollY || 0));
  const tick = () => {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.min(target, maxScroll));
    attempts += 1;
    const reached = Math.abs(window.scrollY - Math.min(target, maxScroll)) < 4;
    if (!reached && attempts < 12) {
      requestAnimationFrame(tick);
      return;
    }
    if (!reached && saved.sectionId) {
      document.getElementById(saved.sectionId)?.scrollIntoView({ block: 'start' });
    }
    clearScrollRestoreFlag();
  };

  requestAnimationFrame(tick);
  return true;
};

const getRouteAnchor = (pathname) => ROUTE_MAP[normalizePath(pathname)] || null;

const scrollToRoute = (pathname, replace = false) => {
  const anchor = getRouteAnchor(pathname);
  if (!anchor) return false;

  const target = document.querySelector(anchor);
  if (!target) return false;

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const newPath = pathname === '/' ? '/home' : pathname;
  if (replace) history.replaceState(null, '', newPath);
  else history.pushState(null, '', newPath);
  return true;
};

const closeNavMenu = () => {
  const navMenu = $('#nav-menu');
  const toggle = $('.menu-toggle');
  if (navMenu) navMenu.classList.remove('open');
  if (toggle) {
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
};

const initThemeToggle = () => {
  const root = document.body;
  if (!root) return;

  const applyTheme = (theme, persist = false) => {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
    document.querySelectorAll('.theme-toggle').forEach((toggle) => {
      const isDark = nextTheme === 'dark';
      toggle.setAttribute('aria-pressed', String(isDark));
      toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    });
    if (persist && typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    }
  };

  const savedTheme = typeof localStorage !== 'undefined'
    ? localStorage.getItem(THEME_STORAGE_KEY)
    : null;
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');

  document.querySelectorAll('.theme-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, true);
    });
  });
};

const bindNavigationMemory = () => {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

    const rawHref = link.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;

    const url = new URL(link.href, window.location.origin);
    if (url.origin !== window.location.origin) return;

    const normalized = normalizePath(url.pathname);
    const anchor = getRouteAnchor(normalized);
    const target = anchor ? document.querySelector(anchor) : null;

    if (target) return;
    const sourceSection = link.closest('section[id], footer[id], [data-scroll-source]')?.id || '';
    rememberCurrentScroll(link.href, sourceSection);
  }, true);
};

const bindReturnLinks = () => {
  document.querySelectorAll('[data-return-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const saved = readScrollMemory();
      if (!saved) return;

      event.preventDefault();
      flagScrollRestore(saved.path);
      const canUseHistoryBack =
        document.referrer &&
        new URL(document.referrer, window.location.origin).origin === window.location.origin &&
        window.history.length > 1;

      if (canUseHistoryBack) {
        let settled = false;
        const release = () => {
          settled = true;
          window.removeEventListener('pagehide', release);
          window.removeEventListener('beforeunload', release);
        };
        window.addEventListener('pagehide', release, { once: true });
        window.addEventListener('beforeunload', release, { once: true });
        window.history.back();
        window.setTimeout(() => {
          if (!settled) window.location.href = saved.path;
        }, 180);
        return;
      }

      window.location.href = saved.path;
    });
  });
};

const bindSectionLinks = () => {
  const sectionRoutes = Object.keys(ROUTE_MAP).filter((route) => route !== '/');

  document.querySelectorAll('a[href^=\"/\"]').forEach((link) => {
    const url = new URL(link.href, window.location.origin);
    const normalized = normalizePath(url.pathname);
    if (!sectionRoutes.includes(normalized)) return;
    if (link.classList.contains('brand')) return;
    const anchor = getRouteAnchor(normalized);
    const target = anchor ? document.querySelector(anchor) : null;
    if (!target) return;

    link.addEventListener('click', (event) => {
      event.preventDefault();
      closeNavMenu();
      scrollToRoute(url.pathname);
    });
  });
};

const formatEventTypeLabel = (value) => {
  const key = String(value || '').toLowerCase();
  if (EVENT_TYPE_LABELS[key]) return EVENT_TYPE_LABELS[key];
  if (!value) return 'Program';
  return String(value);
};

const preloadImages = (sources = []) => {
  const seen = new Set();
  sources.forEach((src) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  });
};

const truncateText = (value, max = 140) => {
  const clean = String(value || '').trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}...`;
};

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

const validateCertImagePath = (input) => {
  const value = String(input?.value || '').trim();
  if (!value) {
    setFieldError(input, '');
    return true;
  }
  const ok = /^\/images\/certificates\/.+\.(jpg|jpeg|png|webp)$/i.test(value);
  setFieldError(input, ok ? '' : 'Use /images/certificates/filename.jpg (.jpg/.png/.webp).');
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
  // support protocol-relative URLs (e.g. //res.cloudinary.com/...) by forcing https
  if (input.startsWith('//')) return `https:${input}`;
  if (input.startsWith('/images/events/')) return input;
  if (input.startsWith('images/events/')) return `/${input}`;
  return `/images/events/${input.replace(/^\/+/, '')}`;
};

const CLOUDINARY_SIGN_ENDPOINT = window.CLOUDINARY_SIGN_ENDPOINT || '/api/cloudinary-sign';

// Upload image to Cloudinary using a signed request issued by a serverless endpoint.
// The sign endpoint must return JSON: { uploadUrl, fields } where fields contain the signed params.
async function uploadImage(file) {
  if (!CLOUDINARY_SIGN_ENDPOINT) throw new Error('Cloudinary sign endpoint not configured');

  const signRes = await fetch(CLOUDINARY_SIGN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, fileType: file.type })
  });

  if (!signRes.ok) {
    throw new Error('Could not obtain upload signature');
  }

  const { uploadUrl, fields } = await signRes.json();
  if (!uploadUrl || !fields) {
    throw new Error('Invalid signature response');
  }

  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
  formData.append('file', file);

  const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
  const data = await uploadRes.json();

  if (!uploadRes.ok) {
    const message = data?.error?.message || 'Upload failed';
    throw new Error(message);
  }

  return data.secure_url;
}

const eventBannerHtml = (bannerUrl, alt = 'Event banner') => {
  const normalized = normalizeBannerUrl(bannerUrl);
  if (!normalized) {
    return '<div class="event-banner-placeholder">Banner image coming soon</div>';
  }
  return `<div class="event-banner-thumb"><img class="event-banner" src="${escapeHtml(normalized)}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.closest('.event-banner-thumb').outerHTML='<div class=&quot;event-banner-placeholder&quot;>Banner image not found</div>'" /></div>`;
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

const summarizeEvent = (event, max = 140) => truncateText(event.description || 'Event details coming soon.', max);

const formatWingLabel = (value) => {
  const key = String(value || '').toLowerCase();
  return WING_LABELS[key] || 'GCPC Wing';
};


const normalizeWing = (event) => {
  const explicit = String(event.wing || '').toLowerCase();
  if (['acm', 'research', 'career', 'development'].includes(explicit)) return explicit;

  const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
  if (text.includes('research')) return 'research';
  if (text.includes('development wing') || text.includes('software development') || text.includes('web development') || text.includes('system design')) return 'development';
  if (text.includes('career') || text.includes('public relation') || text.includes('branding') || text.includes('communication') || text.includes('graphic design')) return 'career';
  if (text.includes('development') || text.includes('devops')) return 'development';
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
    link.addEventListener('click', () => closeNavMenu());
  });

  const brand = $('.brand');
  if (brand) {
    brand.addEventListener('click', (event) => {
      event.preventDefault();
      closeNavMenu();
      // Hard navigate to reset scroll and state
      window.location.href = '/home';
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

const readStoredSuccessStories = () => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const saved = JSON.parse(localStorage.getItem('successStories') || '[]');
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((src) => typeof src === 'string' && src.trim().length > 0)
      .slice(0, 5)
      .map((src) => ({ src }));
  } catch (error) {
    console.warn('[Success Stories] Could not parse stored data', error);
    return [];
  }
};

const buildSuccessStoryList = () => {
  const stored = readStoredSuccessStories();
  if (stored.length >= 5) return stored.slice(0, 5);

  const list = [...stored];
  DEFAULT_SUCCESS_STORIES.forEach((story) => {
    if (list.length < 5) list.push(story);
  });

  return list.slice(0, 5);
};

const initSuccessStories = () => {
  const grid = document.getElementById('success-stories-grid');
  if (!grid) return;

  const stories = buildSuccessStoryList();
  if (!stories.length) {
    grid.innerHTML = '<p class="vertical-empty">Add success stories from the admin panel to display them here.</p>';
    return;
  }

  grid.innerHTML = stories.map((story, idx) => {
    const caption = story.caption && story.caption.trim() ? story.caption.trim() : '';
    const captionHtml = caption
      ? `<div class="overlay-caption">${escapeHtml(caption)}</div>`
      : '';
    return `
      <article class="poster-card">
        <div class="poster-frame">
          <img
            class="success-poster"
            src="${escapeHtml(story.src)}"
            alt="${escapeHtml(caption || `GCPC success story poster ${idx + 1}`)}"
            loading="lazy"
            data-story-index="${idx}"
          />
          ${captionHtml}
        </div>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('.success-poster').forEach((img) => {
    img.addEventListener('error', () => {
      if (img.dataset.fallback === '1') return;
      img.dataset.fallback = '1';
      img.src = STORY_PLACEHOLDER;
    });
  });

  preloadImages(stories.map((story) => story.src));
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
    const txt = `${event.title} | ${event.semester || 'GCPC'} | ${formatEventTypeLabel(event.eventType)} | ${formatDate(event.dateISO)} → ${formatDate(event.deadlineISO)}`;
    return `<a class="ticker-item" href="/event?id=${encodeURIComponent(event.id)}">${escapeHtml(txt)}</a>`;
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

  const eventCards = events.map((event) => `
    <a class="card gcpc-card interactive-card wing-event-item" href="/event?id=${encodeURIComponent(event.id)}">
      ${eventBannerHtml(resolveEventBannerUrl(event), `${event.title || 'Event'} banner`)}
      <div class="wing-event-body">
        <div class="wing-event-copy">
          <span class="badge">${escapeHtml(event.semester || 'GCPC')}</span>
          <h4>${escapeHtml(event.title || 'Untitled Event')}</h4>
          <p class="wing-event-desc">${escapeHtml(summarizeEvent(event, 120))}</p>
        </div>
        <div class="wing-event-meta">
          <p class="meta">Format: ${escapeHtml(formatEventTypeLabel(event.eventType))}</p>
          <p class="meta">Start Date: ${escapeHtml(formatDate(event.dateISO))}</p>
          <p class="meta">End Date: ${escapeHtml(formatDate(event.deadlineISO))}</p>
        </div>
        <span class="wing-event-cta">View details</span>
      </div>
    </a>
  `).join('');

  if (events.length === 1) {
    container.innerHTML = eventCards;
    return;
  }

  container.innerHTML = `
    <div class="wing-carousel-container">
      <button class="carousel-arrow carousel-prev" type="button" aria-label="Previous">&#10094;</button>
      <div class="wing-carousel-viewport">
        <div class="wing-carousel-track">
          ${eventCards}
        </div>
      </div>
      <button class="carousel-arrow carousel-next" type="button" aria-label="Next">&#10095;</button>
    </div>
  `;

  // Carousel logic
  const track = container.querySelector('.wing-carousel-track');
  const prevBtn = container.querySelector('.carousel-prev');
  const nextBtn = container.querySelector('.carousel-next');

  const viewport = container.querySelector('.wing-carousel-viewport');

  if (track && viewport && prevBtn && nextBtn) {
    let currentIndex = 0;
    const autoScrollInterval = 5000;
    let autoScroll;

    const showSlide = (index) => {
      const items = track.querySelectorAll('.wing-event-item');
      if (items.length === 0) return;

      currentIndex = (index + items.length) % items.length;
      const offset = -currentIndex * viewport.clientWidth;
      track.style.transform = `translateX(${offset}px)`;
    };

    const restartAutoScroll = () => {
      clearInterval(autoScroll);
      autoScroll = setInterval(() => showSlide(currentIndex + 1), autoScrollInterval);
    };

    prevBtn.addEventListener('click', () => {
      showSlide(currentIndex - 1);
      restartAutoScroll();
    });

    nextBtn.addEventListener('click', () => {
      showSlide(currentIndex + 1);
      restartAutoScroll();
    });

    track.addEventListener('mouseenter', () => clearInterval(autoScroll));
    track.addEventListener('mouseleave', restartAutoScroll);
    window.addEventListener('resize', () => showSlide(currentIndex));

    showSlide(0);
    restartAutoScroll();
  }
};

const renderEventCollection = (hostId, events, emptyText) => {
  const host = document.getElementById(hostId);
  if (!host) return;
  if (!events.length) {
    host.innerHTML = `<article class="card gcpc-card"><p>${escapeHtml(emptyText)}</p></article>`;
    return;
  }

  host.innerHTML = events.map((event) => `
    <a class="card gcpc-card interactive-card event-card" href="/event?id=${encodeURIComponent(event.id)}">
      ${eventBannerHtml(resolveEventBannerUrl(event), `${event.title || 'Event'} banner`)}
      <div class="event-card-body">
        <div class="event-card-copy">
          <span class="badge">${escapeHtml(event.semester || 'GCPC')}</span>
          <h3>${escapeHtml(event.title || 'Untitled Event')}</h3>
          <p class="event-card-desc">${escapeHtml(summarizeEvent(event, 160))}</p>
        </div>
        <div class="event-card-meta">
          <p class="meta">Format: ${escapeHtml(formatEventTypeLabel(event.eventType))}</p>
          <p class="meta">Start Date: ${escapeHtml(formatDate(event.dateISO))}</p>
          <p class="meta">End Date: ${escapeHtml(formatDate(event.deadlineISO))}</p>
          <p class="meta">Venue: ${escapeHtml(event.venue || 'TBA')}</p>
        </div>
        <span class="wing-event-cta">Open details</span>
      </div>
    </a>
  `).join('');
};

const pastEventCache = new Map();

const renderPastEventCollection = (hostId, events, emptyText) => {
  const host = document.getElementById(hostId);
  if (!host) return;

  pastEventCache.clear();
  if (!events.length) {
    host.innerHTML = `<article class="card gcpc-card"><p>${escapeHtml(emptyText)}</p></article>`;
    return;
  }

  events.forEach((event) => {
    if (event?.id) pastEventCache.set(event.id, event);
  });

  host.innerHTML = events.map((event) => `
    <button class="card gcpc-card interactive-card past-event-card" type="button" data-past-event-id="${escapeHtml(event.id)}">
      ${eventBannerHtml(resolveEventBannerUrl(event), `${event.title || 'Event'} banner`)}
      <h3>${escapeHtml(event.title || 'Untitled Event')}</h3>
      <div class="past-event-meta">
        <p class="meta">Semester: ${escapeHtml(event.semester || 'GCPC')}</p>
        <p class="meta">Format: ${escapeHtml(formatEventTypeLabel(event.eventType))}</p>
        <p class="meta">Start Date: ${escapeHtml(formatDate(event.dateISO))}</p>
      </div>
    </button>
  `).join('');
};

const bindPastEventModal = () => {
  const host = document.getElementById('past-events-grid');
  const modal = document.getElementById('past-event-modal');
  const content = document.getElementById('past-event-modal-content');
  const closeBtn = document.getElementById('past-event-close');
  if (!host || !modal || !content || modal.dataset.bound === '1') return;

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const openModal = (event) => {
    if (!event) return;
    content.innerHTML = `
      <article class="event-detail-content">
        ${eventBannerHtml(resolveEventBannerUrl(event), `${event.title || 'Event'} banner`)}
        <span class="badge">${escapeHtml(event.semester || 'GCPC')}</span>
        <h2 id="past-event-title">${escapeHtml(event.title || 'Untitled Event')}</h2>
        <p>${escapeHtml(event.description || 'No description provided.')}</p>
        <div class="event-detail-grid">
          <div class="event-detail-item">
            <span class="event-detail-label">Semester</span>
            <p>${escapeHtml(event.semester || 'GCPC')}</p>
          </div>
          <div class="event-detail-item">
            <span class="event-detail-label">Format</span>
            <p>${escapeHtml(formatEventTypeLabel(event.eventType))}</p>
          </div>
          <div class="event-detail-item">
            <span class="event-detail-label">Start Date</span>
            <p>${escapeHtml(formatDate(event.dateISO))}</p>
          </div>
          <div class="event-detail-item">
            <span class="event-detail-label">End Date</span>
            <p>${escapeHtml(formatDate(event.deadlineISO))}</p>
          </div>
          <div class="event-detail-item">
            <span class="event-detail-label">Venue</span>
            <p>${escapeHtml(event.venue || 'TBA')}</p>
          </div>
          <div class="event-detail-item">
            <span class="event-detail-label">Instructor</span>
            <p>${escapeHtml(event.instructor || 'TBA')}</p>
          </div>
          <div class="event-detail-item">
            <span class="event-detail-label">Status</span>
            <p>${escapeHtml(event.status || 'N/A')}</p>
          </div>
        </div>
        ${event.registrationLink ? `<a class="btn btn-primary" href="${escapeHtml(event.registrationLink)}" target="_blank" rel="noopener noreferrer">Registration Link</a>` : ''}
      </article>
    `;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  host.addEventListener('click', (clickEvent) => {
    const trigger = clickEvent.target.closest('[data-past-event-id]');
    if (!trigger) return;
    openModal(pastEventCache.get(trigger.dataset.pastEventId));
  });

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (clickEvent) => {
    if (clickEvent.target === modal) closeModal();
  });
  document.addEventListener('keydown', (keyEvent) => {
    if (keyEvent.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  modal.dataset.bound = '1';
};

const initHome = async () => {
  initHeroBackground();
  bindPastEventModal();

  try {
    const all = await fetchAllEvents();
    const { upcoming, past } = splitEventsByDate(all);
    renderTicker(upcoming);

    const acmEvents = upcoming.filter((event) => normalizeWing(event) === 'acm');
    const researchEvents = upcoming.filter((event) => normalizeWing(event) === 'research');
    const careerEvents = upcoming.filter((event) => normalizeWing(event) === 'career');
    const developmentEvents = upcoming.filter((event) => normalizeWing(event) === 'development');

    buildWingCards('acm-activity-slider', acmEvents);
    buildWingCards('research-activity-slider', researchEvents);
    buildWingCards('career-activity-slider', careerEvents);
    buildWingCards('development-activity-slider', developmentEvents);

    const pastEl = $('#past-events-grid');
    const upEl = $('#upcoming-events-grid');
    if (upEl) renderEventCollection('upcoming-events-grid', upcoming.slice(0, 6), 'No upcoming activities yet.');
    if (pastEl) renderPastEventCollection('past-events-grid', past.slice(0, 6), 'No past events available yet.');
  } catch (error) {
    console.error(error);
    renderTicker([]);
    buildWingCards('acm-activity-slider', []);
    buildWingCards('research-activity-slider', []);
    buildWingCards('career-activity-slider', []);
    buildWingCards('development-activity-slider', []);
    renderEventCollection('upcoming-events-grid', [], 'No upcoming activities yet.');
    renderPastEventCollection('past-events-grid', [], 'No past events available yet.');
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

  const status = form.querySelector('.form-status') || (() => {
    const node = document.createElement('p');
    node.className = 'form-status';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.hidden = true;
    form.appendChild(node);
    return node;
  })();

  const setStatus = (text, tone = '') => {
    status.textContent = text;
    status.hidden = !text;
    status.classList.remove('is-success', 'is-error', 'is-muted');
    if (tone) status.classList.add(`is-${tone}`);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('', '');

    const email = document.getElementById(map.email);
    const subject = document.getElementById(map.subject);
    const message = document.getElementById(map.message);

    const valid = [
      validateRequired(email, 'Email'),
      validateEmail(email),
      validateRequired(subject, 'Subject'),
      validateRequired(message, 'Message')
    ].every(Boolean);

    if (!valid) {
      setStatus('Please fix the highlighted fields.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }
    setStatus('Sending...', 'muted');

    try {
      await submitMessage(email.value, subject.value, message.value);
      form.reset();
      setStatus('Message sent successfully!', 'success');
      showToast('Message sent successfully.', 'success');
    } catch (error) {
      console.error(error);
      setStatus('Failed to send message. Please try again.', 'error');
      showToast('Failed to send message.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = map.buttonText;
      }
      setTimeout(() => setStatus('', ''), 4000);
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
  return `<div class="cert-image-wrap"><img class="zoomable-cert-image" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" /></div>`;
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
      renderVerifyResult('success', `<p><strong>✅ Certificate Verified</strong></p>${details}`);
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

  // Click-to-zoom for certificate preview images.
  document.addEventListener('click', (event) => {
    const img = event.target.closest('.zoomable-cert-image');
    if (!img) return;
    let modal = document.getElementById('cert-zoom-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cert-zoom-modal';
      modal.className = 'cert-zoom-modal hidden';
      modal.innerHTML = `
        <button class="cert-zoom-close" type="button" aria-label="Close image preview">&times;</button>
        <img id="cert-zoom-image" alt="Certificate zoom preview" />
      `;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.closest('.cert-zoom-close')) {
          modal.classList.add('hidden');
        }
      });
    }
    const zoomImage = document.getElementById('cert-zoom-image');
    if (zoomImage) zoomImage.src = img.src;
    modal.classList.remove('hidden');
  });
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
      <article class="card gcpc-card reveal in-view">
        ${eventBannerHtml(resolveEventBannerUrl(e), `${e.title || 'Event'} banner`)}
        <div class="event-detail-content">
          <span class="badge">${escapeHtml(e.semester || 'GCPC')}</span>
          <h2>${escapeHtml(e.title || 'Untitled Event')}</h2>
          <p>${escapeHtml(e.description || 'No description provided.')}</p>
          <div class="event-detail-grid">
            <div class="event-detail-item">
              <span class="event-detail-label">Format</span>
              <p>${escapeHtml(formatEventTypeLabel(e.eventType))}</p>
            </div>
            <div class="event-detail-item">
              <span class="event-detail-label">Start Date</span>
              <p>${escapeHtml(formatDate(e.dateISO))}</p>
            </div>
            <div class="event-detail-item">
              <span class="event-detail-label">End Date</span>
              <p>${escapeHtml(formatDate(e.deadlineISO))}</p>
            </div>
            <div class="event-detail-item">
              <span class="event-detail-label">Venue</span>
              <p>${escapeHtml(e.venue || 'TBA')}</p>
            </div>
            <div class="event-detail-item">
              <span class="event-detail-label">Instructor</span>
              <p>${escapeHtml(e.instructor || 'TBA')}</p>
            </div>
            <div class="event-detail-item">
              <span class="event-detail-label">Status</span>
              <p>${escapeHtml(e.status || 'N/A')}</p>
            </div>
          </div>
          ${e.registrationLink ? `<a class="btn btn-primary" href="${escapeHtml(e.registrationLink)}" target="_blank" rel="noopener noreferrer">Registration Link</a>` : ''}
        </div>
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
      <a class="card interactive-card" href="/event?id=${encodeURIComponent(event.id)}">
        ${eventBannerHtml(resolveEventBannerUrl(event), `${event.title || 'Event'} banner`)}
        <span class="badge">${escapeHtml(event.semester || 'GCPC')}</span>
        <h3>${escapeHtml(event.title || 'Untitled Event')}</h3>
        <p>${escapeHtml(event.description || 'Event details coming soon.')}</p>
        <p class="meta">Format: ${escapeHtml(formatEventTypeLabel(event.eventType))}</p>
        <p class="meta">Starts: ${escapeHtml(formatDate(event.dateISO))}</p>
        <p class="meta">Ends: ${escapeHtml(formatDate(event.deadlineISO))}</p>
        ${event.instructor ? `<p class="meta">Instructor: ${escapeHtml(event.instructor)}</p>` : ''}
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
        <thead><tr><th>Title</th><th>Wing</th><th>Semester</th><th>Format</th><th>Start</th><th>End</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.title || '')}</td>
              <td>${escapeHtml(formatWingLabel(row.wing || normalizeWing(row)))}</td>
              <td>${escapeHtml(row.semester || '')}</td>
              <td>${escapeHtml(formatEventTypeLabel(row.eventType))}</td>
              <td>${escapeHtml(formatDate(row.dateISO))}</td>
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
  document.getElementById('event-type').value = data.eventType || 'workshop';
  document.getElementById('event-date').value = formatDate(data.dateISO) === 'TBA' ? '' : formatDate(data.dateISO);
  document.getElementById('event-deadline').value = formatDate(data.deadlineISO) === 'TBA' ? '' : formatDate(data.deadlineISO);
  document.getElementById('event-venue').value = data.venue || '';
  document.getElementById('event-instructor').value = data.instructor || '';
  const normalizedBanner = normalizeBannerUrl(data.bannerUrl || '');
  const bannerPreview = document.getElementById('event-banner-preview');
  const bannerUrlInputLocal = document.getElementById('eventBannerUrl');
  const bannerFileInputLocal = document.getElementById('eventBanner');
  // store existing banner url so submit logic can fall back to it
  if (bannerUrlInputLocal) bannerUrlInputLocal.value = data.bannerUrl || '';
  if (bannerPreview) {
    bannerPreview.innerHTML = normalizedBanner
      ? `<img src="${escapeHtml(normalizedBanner)}" alt="Event banner preview" loading="lazy" onerror="this.outerHTML='<span>Banner file not found</span>'" />`
      : '<span>No banner selected</span>';
  }
  // clear file input so it does not accidentally upload old file
  if (bannerFileInputLocal) bannerFileInputLocal.value = '';
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
  const certImageInput = document.getElementById('cert-image-url');
  const certImagePreview = document.getElementById('cert-image-preview');
  if (certImageInput) certImageInput.value = String(data.certImageUrl || '').trim();
  if (certImagePreview) {
    const url = String(data.certImageUrl || '').trim();
    certImagePreview.innerHTML = url
      ? `<img src="${escapeHtml(url)}" alt="Certificate preview" loading="lazy" onerror="this.outerHTML='<span>Certificate image file not found</span>'" />`
      : '<span>No certificate image selected</span>';
  }
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
  const bannerPreview = document.getElementById('event-banner-preview');
  const bannerFileInput = document.getElementById('eventBanner');
  const bannerUrlInput = document.getElementById('eventBannerUrl');
  const certImageInput = document.getElementById('cert-image-url');
  const certImagePreview = document.getElementById('cert-image-preview');

  if (!loginForm || !logoutBtn || !loginShell || !loadingShell || !dashboard || !who || !deniedShell || !deniedSignoutBtn) return;

  const setDebug = (payload) => {
    if (!debugMode || !debugShell || !debugOutput) return;
    debugShell.classList.remove('hidden');
    debugOutput.textContent = JSON.stringify(payload, null, 2);
  };

  wireAdminTabs();

  const setBannerPreview = (value) => {
    if (!bannerPreview) return;
    // value may be a URL string, data URL, or empty
    if (!value) {
      bannerPreview.innerHTML = '<span>No banner selected</span>';
      return;
    }
    // data URLs should be used directly
    if (String(value).startsWith('data:')) {
      bannerPreview.innerHTML = `<img src="${value}" alt="Event banner preview" loading="lazy" />`;
      return;
    }
    const normalized = normalizeBannerUrl(value);
    if (!normalized) {
      bannerPreview.innerHTML = '<span>No banner selected</span>';
      return;
    }
    bannerPreview.innerHTML = `<img src="${escapeHtml(normalized)}" alt="Event banner preview" loading="lazy" onerror="this.outerHTML='<span>Banner file not found</span>'" />`;
  };

  const setCertImagePreview = (value) => {
    if (!certImagePreview) return;
    const normalized = String(value || '').trim();
    if (!normalized) {
      certImagePreview.innerHTML = '<span>No certificate image selected</span>';
      return;
    }
    certImagePreview.innerHTML = `<img src="${escapeHtml(normalized)}" alt="Certificate preview" loading="lazy" onerror="this.outerHTML='<span>Certificate image file not found</span>'" />`;
  };

  // when admin selects a file, show preview and clear stored URL
  bannerFileInput?.addEventListener('change', () => {
    const file = bannerFileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (!bannerPreview) return;
        bannerPreview.innerHTML = `<img src="${reader.result}" alt="Event banner preview" loading="lazy" />`;
      };
      reader.readAsDataURL(file);
      // clear manual URL since a new upload will replace it
      if (bannerUrlInput) bannerUrlInput.value = '';
    } else {
      // no file selected, show whatever URL was entered
      if (bannerUrlInput) setBannerPreview(bannerUrlInput.value);
    }
  });

  bannerUrlInput?.addEventListener('input', () => {
    // clear any selected file so the URL is used instead
    if (bannerFileInput) bannerFileInput.value = '';
    setBannerPreview(bannerUrlInput.value);
  });

  certImageInput?.addEventListener('input', () => {
    validateCertImagePath(certImageInput);
    setCertImagePreview(certImageInput.value);
  });

  setBannerPreview('');
  setCertImagePreview('');

  // success stories upload handling
  const loadStories = () => JSON.parse(localStorage.getItem('successStories') || '[]');
  const saveStories = (arr) => localStorage.setItem('successStories', JSON.stringify(arr));
  const storyInputs = [1,2,3,4,5].map(i => document.getElementById(`story-file-${i}`));
  const gatherAndStore = () => {
    const urls = [];
    storyInputs.forEach(input => {
      if (input && input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = evt => {
          urls.push(evt.target.result);
          if (urls.length === storyInputs.filter(i=>i&&i.files&&i.files[0]).length) {
            saveStories(urls);
            showToast('Success stories saved');
          }
        };
        reader.readAsDataURL(input.files[0]);
      }
    });
    if (urls.length === 0) { saveStories([]); showToast('Cleared success stories'); }
  };
  document.getElementById('save-stories')?.addEventListener('click', gatherAndStore);
  document.getElementById('clear-stories')?.addEventListener('click', () => {
    storyInputs.forEach(i=>{ if(i) i.value=''; });
    saveStories([]);
    showToast('Cleared success stories');
  });

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
    const title = document.getElementById('event-title').value.trim();
    const wing = document.getElementById('event-wing').value;
    const semester = document.getElementById('event-semester').value.trim();
    const eventType = document.getElementById('event-type').value;
    const dateISO = document.getElementById('event-date').value;
    const deadlineISO = document.getElementById('event-deadline').value;
    const venue = document.getElementById('event-venue').value.trim();
    const instructor = document.getElementById('event-instructor').value.trim();
    const description = document.getElementById('event-description').value.trim();
    const registrationLink = document.getElementById('event-registration').value.trim();
    const statusVal = document.getElementById('event-status').value;

    // determine banner URL: manual URL field takes precedence; otherwise file upload
    let bannerUrl = bannerUrlInput?.value.trim() || '';
    const bannerFile = bannerFileInput?.files[0];
    if (!bannerUrl && bannerFile) {
      try {
        bannerUrl = await uploadImage(bannerFile);
      } catch (err) {
        console.error('Banner upload failed', err);
        showToast('Failed to upload banner image.', 'error');
        return;
      }
    }

    const payload = {
      title,
      wing,
      semester,
      eventType,
      dateISO,
      deadlineISO,
      venue,
      instructor,
      bannerUrl: bannerUrl || '',
      description,
      registrationLink,
      status: statusVal,
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
      if (bannerFileInput) bannerFileInput.value = '';
      if (bannerUrlInput) bannerUrlInput.value = '';
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
      certImageUrl: String(document.getElementById('cert-image-url')?.value || '').trim(),
      updatedAt: serverTimestamp()
    };

    if (!payload.name || !payload.student_id || !payload.course || !payload.issue_date) {
      showToast('Fill required certificate fields.', 'error');
      return;
    }
    if (!validateCertImagePath(document.getElementById('cert-image-url'))) return;

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
    if (bannerFileInput) bannerFileInput.value = '';
    if (bannerUrlInput) bannerUrlInput.value = '';
    setBannerPreview('');
  });

  document.getElementById('admin-cert-clear')?.addEventListener('click', () => {
    document.getElementById('admin-cert-form')?.reset();
    setCertImagePreview('');
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
  initThemeToggle();
  bindNavigationMemory();
  bindReturnLinks();
  bindSectionLinks();
  const initialPath = normalizePath(window.location.pathname);
  const restoreOnLoad = shouldRestoreScroll(initialPath);
  if (!restoreOnLoad && !scrollToRoute(initialPath, true) && initialPath === '/') {
    history.replaceState(null, '', '/home');
  }

  if (restoreOnLoad && initialPath === '/') {
    history.replaceState(null, '', '/home');
  }

  window.addEventListener('pageshow', (event) => {
    const currentPath = normalizePath(window.location.pathname);
    if (event.persisted || hasScrollRestoreFlag(currentPath)) {
      restoreSavedScroll(currentPath);
    }
  });

  window.addEventListener('popstate', () => {
    const currentPath = normalizePath(window.location.pathname);
    if (!restoreSavedScroll(currentPath)) {
      scrollToRoute(window.location.pathname, true);
    }
  });

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
  if (page === 'home') {
    await initHome();
    initSuccessStories();
  }
  if (page === 'join') await initJoin();
  if (page === 'verify') initVerify();
  if (page === 'event') await initEventPage();
  if (page === 'wing') await initWingPage();
  if (page === 'admin') await initAdmin();

  if (restoreOnLoad) restoreSavedScroll(initialPath);
};

initPage();
