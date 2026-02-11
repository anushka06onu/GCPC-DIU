const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-links');

if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

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
  let current = 0;

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
