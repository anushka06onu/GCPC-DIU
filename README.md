# DIU GCPC Portal (Firebase Edition)

Official website portal for **DIU Girls' Computer Programming Club (GCPC)**, Department of CSE, Daffodil International University.

This version is rebuilt as a dynamic Firebase-powered portal using **HTML + CSS + Vanilla JS** and is ready for static deployment on **Vercel**.

## What Was Built

### 1) Dynamic events from Firestore
- Home page now loads events from `events` collection.
- Upcoming highlight is auto-generated from Firestore.
- Hero ticker is animated and fetches upcoming events.
- Event cards are clickable and open `event.html?id=...`.
- Wing pages (`wing-acm.html`, `wing-research.html`, `wing-career.html`) show wing-matching events from Firestore.

### 2) Contact for queries page
- `contact.html` has a validated form:
  - Email, subject, message
- Submissions are saved in Firestore `messages`.
- Success/error toasts are shown.

### 3) Join page with Firestore + member stats
- `join.html` has validated form:
  - name, email, studentId, department, semester
- Submissions are saved in Firestore `memberships`.
- Members count section shows:
  - Total members
  - Members by selected semester

### 4) Certificate verification page
- `verify/index.html` supports:
  - Certificate ID input + verify button
  - Auto-verify with `?cert_id=...`
- Firestore lookup:
  - Collection: `certificates`
  - Doc ID = `cert_id`
- Behaviors:
  - If exists and `status == "VALID"` => valid details shown
  - If not exists => `Invalid Certificate`
  - If status is not VALID => warning shown

### 5) Admin panel with Firebase Auth
- `admin.html` includes:
  - Email/password login
  - Admin check via `admins/{uid}` document (secure approach)
  - CRUD for events
  - CRUD for certificates
  - Read views for messages and memberships

### 6) UI/UX overhaul
- Shared modular architecture:
  - `assets/styles.css`
  - `assets/app.js`
  - `assets/firebase.js`
- Full-screen hero (`100vh`) with animated ticker.
- Responsive navbar + hamburger menu.
- Toast feedback, loading states, inline validation.
- Scroll reset on refresh (page always starts at top).

## Current File Structure

- `index.html` -> dynamic home page
- `join.html` -> membership form + counts
- `contact.html` -> query form
- `event.html` -> event details
- `admin.html` -> admin console
- `verify/index.html` -> certificate verification
- `verify.html` -> redirect helper to `/verify/`
- `wing-acm.html`, `wing-research.html`, `wing-career.html`
- `assets/firebase.js` -> Firebase config/init
- `assets/app.js` -> app logic (all page controllers)
- `assets/styles.css` -> shared design system

## Firebase Setup

### 1. Paste Firebase config
Update config in:
- `assets/firebase.js`

```js
export const firebaseConfig = {
  apiKey: '... ',
  authDomain: '... ',
  projectId: '... ',
  storageBucket: '... ',
  messagingSenderId: '... ',
  appId: '... '
};
```

### 2. Collections used

#### `events`
```json
{
  "title": "...",
  "semester": "Spring 26",
  "dateISO": "2026-03-10",
  "deadlineISO": "2026-02-20",
  "venue": "...",
  "description": "...",
  "registrationLink": "https://...",
  "status": "UPCOMING",
  "createdAt": "serverTimestamp"
}
```

#### `memberships`
```json
{
  "name": "...",
  "email": "...",
  "studentId": "221-15-0000",
  "department": "CSE",
  "semester": "Spring 26",
  "createdAt": "serverTimestamp"
}
```

#### `messages`
```json
{
  "email": "...",
  "subject": "...",
  "message": "...",
  "createdAt": "serverTimestamp"
}
```

#### `certificates` (doc id = cert_id)
```json
{
  "name": "...",
  "student_id": "...",
  "course": "...",
  "issue_date": "2026-04-20",
  "status": "VALID",
  "issued_by": "DIU GCPC"
}
```

#### `admins` (secure admin check)
- Document path: `admins/{uid}`
- Example:
```json
{
  "email": "admin@diu.edu.bd",
  "role": "superadmin"
}
```

## Create First Admin User

1. Firebase Console -> Authentication -> add user (email/password).
2. Copy that user `uid`.
3. Firestore -> create document at `admins/{uid}`.
4. Now this account can access `admin.html` dashboard.

## Recommended Firestore Rules

> This rule set keeps events/certificates public, allows public submissions, and restricts admin operations with `admins/{uid}` check.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /events/{eventId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    match /certificates/{certId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    match /memberships/{docId} {
      allow create: if true;
      allow read: if true;
      allow update, delete: if isAdmin();
    }

    match /messages/{docId} {
      allow create: if true;
      allow read, update, delete: if isAdmin();
    }

    match /admins/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if isAdmin();
    }
  }
}
```

## Run Locally

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open:
- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/verify/`
- `http://127.0.0.1:8000/admin.html`

## Deploy on Vercel

1. Push repo to GitHub.
2. Import repo into Vercel.
3. Framework preset: **Other** (static).
4. Deploy.

No build command is required for this static setup.

## Note on Firebase config and Vercel env vars
- For pure static HTML/JS, easiest is keeping config inside `assets/firebase.js`.
- If you want env-driven injection on Vercel, you need a build step/script to replace placeholders before deploy.

## Credits
© Fateha Hossain Anushka
