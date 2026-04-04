# DIU GCPC Portal

Official site for the Girls' Computer Programming Club (GCPC) under the Department of CSE, Daffodil International University. The portal showcases initiatives, highlights achievements, and keeps members informed.

## What the Portal Delivers
- Central landing page with club story, hero visuals, and quick entry points to core sections.
- Event spotlights covering ACM practice, research tracks, and career-development series.
- Certificate verification flow that lets visitors confirm issued IDs (scan-friendly links supported).
- Join and contact funnels to collect interest, success stories, and collaboration queries.
- Lightweight admin dashboard for club moderators to curate content and validate requests.

## Tech Snapshot
- Built with semantic HTML, modular CSS, and vanilla JavaScript for animations/interactions.
- Uses Firebase (Authentication + Firestore) strictly for dynamic content, membership stats, and message inboxes.
- Assets and static data are versioned in-repo; deployment-ready for any static host (Vercel, Netlify, etc.).

## Page Map
- `index.html` — hero, key metrics, quick links.
- `join.html` — intake form + live member counter.
- `contact.html` — inbox handoff for partners and students.
- `verify/` — certificate search detail view with QR entry support.
- `event.html` plus wing-specific pages for ACM, Research, Career, PR, and Women in Tech storytelling.
- `admin.html` — private utilities for updates and validation.

## Security & Secrets
- Firebase config in the browser is public by design. Protect the project with: (1) domain-restricted API keys, (2) strict Firestore/Storage rules that block public writes, and (3) rotating keys after enabling restrictions.
- Cloudinary uploads now require a **signed upload** endpoint at `/api/cloudinary-sign` (Netlify/Vercel function or small backend). That endpoint must return `{ uploadUrl, fields }` for direct POST to Cloudinary. Do not commit Cloudinary API keys or upload presets.
- Keep environment variables in your hosting provider’s secrets, not in the repo. If you add serverless functions, guard them with auth/role checks.

## Development Notes
- For local previews, serve the project with any static server (e.g., `python3 -m http.server 8000`).

## Ownership
Designed, built, and maintained by Fateha Hossain Anushka for the GCPC community.
