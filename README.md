# DIU GCPC | Girls' Computer Programming Club Portal

This is the repository for the official website and management portal of the **Girls' Computer Programming Club (GCPC)** at Daffodil International University. I designed and developed this platform to empower female students in programming, research, and leadership through a modern, responsive, and functional web experience.

## 🚀 Live Demo
**Website:** [https://gcpc.daffodilvarsity.edu.bd/](https://gcpc.daffodilvarsity.edu.bd/)  
*(Portal hosted on DIU University Domain)*

---

## 🛠 Features & Architecture

I built this site focusing on high performance, clean design, and easy management.

### Platform Features:
- **Dynamic Content Management**: I integrated a custom **Admin Panel** that allows club officials to manage events, certificates, and memberships in real-time.
- **Certificate Verification System**: A secure desk for students and employers to verify certification validity via Student ID or Certificate ID.
- **Responsive Slideshows & Galleries**: Premium interactive sliders showcasing club moments, seminars, and workshops.
- **Department-Specific Wings**: Detailed sections for ACM, Research, Career, and Development wings.
- **Glassmorphic UI**: High-end modern aesthetics featuring smooth animations, reveal-on-scroll effects, and a premium dark-themed color palette.

### Technical Stack:
- **Frontend**: Vanilla HTML5, CSS3 (Custom Design System), and Modular ES6+ JavaScript.
- **Backend/Database**: **Firebase Firestore** for real-time document storage and management.
- **Authentication**: **Firebase Auth** securing the Management Console.
- **Server Support**: Custom `.htaccess` configuration for cPanel/Apache stability, clean SEO-friendly URLs, and HTTPS enforcement.

---

## 📂 Project Structure

- `/admin`: Management console for club officials.
- `/assets`: Modular JavaScript drivers, design tokens, and core CSS.
- `/join`: Membership registration flow.
- `/verify`: Certification verification desk.
- `index.html`: Optimized landing page with structural SEO.

---

## 🔧 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/anushka06onu/GCPC-DIU.git
   ```
2. **Setup Discovery**:
   Open `index.html` via a local server (I recommend Python's `http.server` or VS Code Live Server).
3. **Configure Database**:
   Add your Firebase credentials within `assets/firebase.js` to enable the dynamic features.

---

## 📜 Documentation & Usage

I have ensured the codebase is modular. Managing the club data is straightforward through the Admin Portal, which communicates directly with the Firestore collection. For production deployment on cPanel, simply upload the root directory; the included `.htaccess` handles the custom routing.

---

Developed with ❤️ by **Anushka**
