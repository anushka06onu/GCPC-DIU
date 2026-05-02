# DIU GCPC | Girls' Computer Programming Club Portal

The official web platform for the **Girls' Computer Programming Club (GCPC)** at Daffodil International University. This platform serves as a centralized hub for female students to engage in competitive programming, research, software development, and professional grooming.

## 🚀 Live Platform
**Website:** [https://gcpc.daffodilvarsity.edu.bd/](https://gcpc.daffodilvarsity.edu.bd/)

---

## 🛠 Features & Capabilities

### 🏢 Department-Specific Wings
*   **ACM Wing**: Focuses on competitive programming, data structures, and algorithms.
*   **Research Wing**: Guides members from idea formation to academic publication.
*   **Career & PR Wing**: Prepares students for internships, branding, and professional networking.
*   **Development Wing**: Strengthens software engineering through hands-on project building.

### 💎 Key Features
*   **Dynamic Event Management**: Automated "Upcoming Activities" section with wing-specific auto-sliding carousels.
*   **Unified Modal System**: High-fidelity detail views for all events (Upcoming & Past) with registration integrations.
*   **Certificate Verification Desk**: Secure infrastructure for verifying club-issued certificates via Student ID or Unique Certificate ID.
*   **Premium Dark Mode**: Native dark theme support with glassmorphic UI elements and theme-persistence.
*   **Interactive FAQ**: Modern, responsive 2-column accordion FAQ with smooth transitions and theme-aware styling.
*   **Management Dashboard**: Secure admin portal for real-time updates to events, gallery, and memberships.

---

## 💻 Tech Stack & Architecture

### Frontend
*   **Core**: Semantic HTML5, Modular CSS3 (Custom Design System), ES6+ JavaScript.
*   **Design**: Glassmorphism, Responsive Grid Layouts, Inter/Roboto Typography, Smooth Reveal-on-Scroll animations.

### Backend & DevOps
*   **Database/Auth**: **Firebase Firestore** (Real-time DB) & **Firebase Auth** (Identity Management).
*   **Routing**: Custom Apache `.htaccess` configuration for clean, SEO-friendly URLs and HTTPS enforcement.
*   **Hosting Compatibility**: Optimized for **cPanel** and standard web servers with support for shared hosting environments.

---

## 📦 Deployment on cPanel

This project is fully optimized for cPanel/Shared Hosting deployment.

1.  **Configure Environment**: 
    *   Rename `assets/config.sample.js` to `assets/config.js`.
    *   Inject your Firebase project configuration (API Key, Project ID, etc.).
2.  **Upload**:
    *   Upload the root contents to your `public_html` directory.
3.  **Routing**:
    *   The included `.htaccess` file will automatically handle clean URL routing (e.g., `/join` instead of `join.html`).
4.  **Security**:
    *   Ensure `assets/config.js` is not committed to public repositories (pre-configured in `.gitignore`).

---

## 📂 Directory Structure

```text
├── admin/          # Secure Management Portal
├── assets/         # CSS design tokens, Modular JS drivers, and SVGs
├── images/         # Local assets and fallbacks
├── join/           # Membership registration infrastructure
├── verify/         # Certificate verification engine
├── index.html      # Optimized Landing Page
└── .htaccess       # Server-level routing configuration
```

---

## 🔒 Security Best Practices

*   **Firebase Rules**: Ensure Firestore rules are locked down to authenticated users for write operations.
*   **API Security**: The platform uses restricted API keys; ensure your Firebase project has domain restriction enabled for `daffodilvarsity.edu.bd`.
*   **Hidden Configs**: Sensitive keys in `assets/config.js` are strictly excluded from version control via `.gitignore`.

---

Developed with ❤️ by **Anushka**
GCPC | Daffodil International University
