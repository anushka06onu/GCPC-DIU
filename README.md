# DIU GCPC Portal (HTML/CSS/JS + Firebase)

Official website portal for Girls' Computer Programming Club (GCPC), Department of CSE, Daffodil International University.

## Project Highlights
- Full-screen hero section (`min-height: 100vh`) with animated upcoming-events ticker.
- Firestore-driven upcoming activities (ACM / Research / Career & Development).
- Certification validity page with:
  - Search by Certificate ID
  - Search by Student ID
  - QR-friendly `?cert_id=...` support
- Join page using DIU Student Hub registration link.
- Animated member count cards from Firestore `memberships`.
- Contact forms (contact page + footer compact form) writing to Firestore `messages`.
- Admin panel with Firebase Auth + allowlist check from `admins/allowed`.

## Pages
- `index.html` - Home
- `join.html` - Join + members count
- `contact.html` - Query form
- `verify/index.html` - Certification validity
- `event.html` - Event details
- `admin.html` - Admin CRUD panel
- `wing-acm.html`, `wing-research.html`, `wing-career.html` - Wing pages

## Firebase Config
Set Firebase config in:
- `assets/firebase.js`

## Firebase Manual Steps

1. Create Firestore collections:
- `events`
- `memberships`
- `messages`
- `certificates`
- `admins`

2. Enable Authentication:
- Firebase Console -> Authentication -> Sign-in method -> Enable **Email/Password**.

3. Create admin allowlist document:
- Collection: `admins`
- Document ID: `allowed`
- Field:
```json
{
  "emails": [
    "anushka2305101844@diu.edu.bd"
  ]
}
```

4. Add sample `events` documents:
```json
{
  "title": "Fundamentals of Graphic Design Workshop",
  "wing": "career",
  "semester": "Spring 2026",
  "dateISO": "2026-03-10",
  "deadlineISO": "2026-02-20",
  "venue": "DIU Campus",
  "description": "Hands-on beginner to practical design workshop.",
  "registrationLink": "https://example.com/register",
  "status": "UPCOMING",
  "createdAt": "serverTimestamp"
}
```

5. Required Firestore fields by collection:

`events`
- `title` (string)
- `wing` (string: `acm` | `research` | `career`)
- `semester` (string)
- `dateISO` (string, `YYYY-MM-DD`)
- `deadlineISO` (string, `YYYY-MM-DD`)
- `venue` (string)
- `description` (string)
- `registrationLink` (string)
- `status` (string: optional for UI split, because upcoming/past is computed from `dateISO`)
- `createdAt` (timestamp)

`memberships`
- `name` (string)
- `email` (string)
- `studentId` (string)
- `department` (string)
- `semester` (string)
- `createdAt` (timestamp)

`messages`
- `email` (string)
- `subject` (string)
- `message` (string)
- `createdAt` (timestamp)

`certificates` (doc ID = certificate ID)
- `name` (string)
- `student_id` (string)
- `course` (string)
- `issue_date` (string/date)
- `status` (string)
- `issued_by` (string)
- `certImageUrl` (string, optional but recommended for verification image display)

```json
{
  "title": "Introduction to Research & Complete Guideline",
  "wing": "research",
  "semester": "Spring 2026",
  "dateISO": "2026-04-20",
  "deadlineISO": "2026-04-15",
  "venue": "DIU Campus",
  "description": "Beginner-friendly research seminar.",
  "registrationLink": "",
  "status": "UPCOMING",
  "createdAt": "serverTimestamp"
}
```

```json
{
  "title": "Java Core to Java Career",
  "wing": "acm",
  "semester": "Spring 2026",
  "dateISO": "2026-03-22",
  "deadlineISO": "2026-03-18",
  "venue": "CSE Lab",
  "description": "Core Java fundamentals with practical roadmap.",
  "registrationLink": "",
  "status": "UPCOMING",
  "createdAt": "serverTimestamp"
}
```

## Firestore Rules (Recommended)
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAllowedAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/admins/allowed)
        && request.auth.token.email in get(/databases/$(database)/documents/admins/allowed).data.emails;
    }

    match /events/{id} {
      allow read: if true;
      allow create, update, delete: if isAllowedAdmin();
    }

    match /certificates/{id} {
      allow read: if true;
      allow create, update, delete: if isAllowedAdmin();
    }

    match /memberships/{id} {
      allow read: if isAllowedAdmin();
      allow create: if true;
      allow update, delete: if isAllowedAdmin();
    }

    match /messages/{id} {
      allow read: if isAllowedAdmin();
      allow create: if true;
      allow update, delete: if isAllowedAdmin();
    }

    match /admins/{id} {
      allow read: if isAllowedAdmin();
      allow write: if isAllowedAdmin();
    }
  }
}
```

## Local Run
```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

## Deploy
Push to GitHub and deploy with Vercel as static site.

## Credits
© Fateha Hossain Anushka
