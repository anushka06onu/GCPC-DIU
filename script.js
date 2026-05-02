const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-links');
const brandLink = document.querySelector('.brand');

const routeMap = {
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

const THEME_STORAGE_KEY = 'gcpc-theme';
const SCROLL_MEMORY_KEY = 'gcpc-scroll-memory';
const SCROLL_RESTORE_KEY = 'gcpc-scroll-restore';

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

const readSessionJson = (key) => {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch (error) {
    return null;
  }
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
  const saved = readSessionJson(SCROLL_MEMORY_KEY);
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
  const flag = readSessionJson(SCROLL_RESTORE_KEY);
  if (!flag || typeof flag !== 'object') return false;
  if (Date.now() - Number(flag.ts || 0) > 30 * 60 * 1000) return false;
  return pathsMatch(flag.path, pathname);
};

const clearScrollRestoreFlag = () => {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(SCROLL_RESTORE_KEY);
};

const shouldRestoreScroll = (pathname) => {
  const navEntries = performance.getEntriesByType?.('navigation') || [];
  return hasScrollRestoreFlag(pathname) || navEntries[0]?.type === 'back_forward';
};

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

const getRouteAnchor = (pathname) => routeMap[normalizePath(pathname)] || null;

const scrollToRoute = (pathname, replace = false) => {
  const anchor = getRouteAnchor(pathname);
  if (!anchor) return false;

  const target = document.querySelector(anchor);
  if (!target) return false;

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const newPath = pathname === '/' ? '/home' : pathname;
  if (replace) {
    history.replaceState(null, '', newPath);
  } else {
    history.pushState(null, '', newPath);
  }
  return true;
};

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const applyPersistedTheme = () => {
  const theme = localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  document.body.dataset.theme = theme;
  document.documentElement.dataset.theme = theme;
};

if (typeof localStorage !== 'undefined') {
  applyPersistedTheme();
}

window.addEventListener('load', () => {
  const pathname = normalizePath(window.location.pathname);
  const restoreOnLoad = shouldRestoreScroll(pathname);
  const handled = restoreOnLoad ? false : scrollToRoute(pathname, true);
  if (!handled && pathname === '/') {
    history.replaceState(null, '', '/home');
  }
  if (restoreOnLoad) restoreSavedScroll(pathname);
});

if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.classList.toggle('is-open', isOpen);
  });

  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.classList.remove('is-open');
    });
  });
}

if (brandLink) {
  brandLink.addEventListener('click', (event) => {
    event.preventDefault();
    if (navMenu && menuToggle) {
      navMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.classList.remove('is-open');
    }
    // Hard navigation to reset scroll and state
    window.location.href = '/home';
  });
}

window.addEventListener('popstate', () => {
  const currentPath = normalizePath(window.location.pathname);
  if (!restoreSavedScroll(currentPath)) {
    scrollToRoute(window.location.pathname, true);
  }
});

window.addEventListener('pageshow', (event) => {
  const currentPath = normalizePath(window.location.pathname);
  if (event.persisted || hasScrollRestoreFlag(currentPath)) {
    restoreSavedScroll(currentPath);
  }
});

const sectionRoutes = Object.keys(routeMap).filter(k => k !== '/');
document.querySelectorAll('a[href^="/"]').forEach((link) => {
  const linkUrl = new URL(link.href, window.location.origin);
  const normalizedPath = normalizePath(linkUrl.pathname);
  if (!sectionRoutes.includes(normalizedPath)) return;

  const anchor = getRouteAnchor(normalizedPath);
  const target = anchor ? document.querySelector(anchor) : null;
  if (!target) return; // only hijack if anchor exists on this page

  link.addEventListener('click', (event) => {
    event.preventDefault();
    if (navMenu && menuToggle) {
      navMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.classList.remove('is-open');
    }
    scrollToRoute(linkUrl.pathname);
  });
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

  const rawHref = link.getAttribute('href') || '';
  if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;

  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin) return;

  const normalizedPath = normalizePath(url.pathname);
  const anchor = getRouteAnchor(normalizedPath);
  const target = anchor ? document.querySelector(anchor) : null;
  if (target) return;

  const sourceSection = link.closest('section[id], footer[id], [data-scroll-source]')?.id || '';
  rememberCurrentScroll(link.href, sourceSection);
}, true);

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

const revealNodes = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

revealNodes.forEach((node) => observer.observe(node));

document.querySelectorAll('[data-slider]').forEach((slider) => {
  const slides = Array.from(slider.querySelectorAll('.year-slide'));
  const dots = Array.from(slider.querySelectorAll('.year-dot'));
  const prev = slider.querySelector('.slider-btn.prev');
  const next = slider.querySelector('.slider-btn.next');
  const autoDelay = Number(slider.dataset.auto || 0);
  let current = 0;
  let timer = null;

  if (!slides.length) return;

  const render = (index) => {
    slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  };

  const go = (index) => {
    current = (index + slides.length) % slides.length;
    render(current);
  };

  if (prev) prev.addEventListener('click', () => go(current - 1));
  if (next) next.addEventListener('click', () => go(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => go(i)));
  render(0);

  if (autoDelay > 0 && slides.length > 1) {
    const startAuto = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => go(current + 1), autoDelay);
    };
    const stopAuto = () => {
      if (timer) clearInterval(timer);
    };
    startAuto();
    slider.addEventListener('mouseenter', stopAuto);
    slider.addEventListener('mouseleave', startAuto);
    slider.addEventListener('focusin', stopAuto);
    slider.addEventListener('focusout', startAuto);
  }
});

const brandLogo = document.querySelector('.brand-logo');
if (brandLogo) {
  brandLogo.addEventListener('error', () => {
    if (!brandLogo.src.includes('gcpc-logo.jpeg')) {
      brandLogo.src = 'gcpc-logo.jpeg';
    }
  });
}

const verifyForm = document.querySelector('#verify-form');
const verifyResult = document.querySelector('#verify-result');

if (verifyForm && verifyResult) {
  const certificateRecords = [
    {
      studentId: '221-15-1001',
      certificateId: 'GCPC-2026-ACM-017',
      title: 'ACM Contest Performance Sprint',
      type: 'Event',
      issueDate: 'March 12, 2026'
    },
    {
      studentId: '222-15-1044',
      certificateId: 'GCPC-2026-RSW-011',
      title: 'Research Paper Publishing Workshop',
      type: 'Workshop',
      issueDate: 'April 20, 2026'
    },
    {
      studentId: '221-15-1001',
      certificateId: 'GCPC-2026-RSW-032',
      title: 'Research Methodology Seminar',
      type: 'Seminar',
      issueDate: 'May 2, 2026'
    },
    {
      studentId: '221-15-1188',
      certificateId: 'GCPC-2026-CRD-025',
      title: 'Career Acceleration Bootcamp',
      type: 'Seminar',
      issueDate: 'May 18, 2026'
    }
  ];

  verifyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const studentInput = document.querySelector('#student-id');
    const studentId = studentInput.value.trim();
    const matches = certificateRecords.filter((record) => record.studentId === studentId);

    if (matches.length > 0) {
      const items = matches.map((record) => (
        `<li><strong>${record.title}</strong> (${record.type}) - ID: ${record.certificateId} - Issued: ${record.issueDate}</li>`
      )).join('');

      verifyResult.innerHTML = `<p>Valid certifications found for student ID <strong>${studentId}</strong>:</p><ul>${items}</ul>`;
      verifyResult.classList.add('success');
      verifyResult.classList.remove('error');
      return;
    }

    verifyResult.textContent = 'No certifications found for this student ID. Please check the ID or contact GCPC admin.';
    verifyResult.classList.add('error');
    verifyResult.classList.remove('success');
  });
}

const countdownElement = document.querySelector('#countdown');
if (countdownElement) {
  const eventDate = new Date('2026-04-20T10:00:00+06:00');

  const renderCountdown = () => {
    const now = new Date();
    const diff = eventDate - now;

    if (diff <= 0) {
      countdownElement.textContent = 'Event is live now.';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    countdownElement.textContent = `Starts in: ${days}d ${hours}h ${minutes}m`;
  };

  renderCountdown();
  setInterval(renderCountdown, 60000);
}
