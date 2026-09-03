# Student Management System

A bilingual (English/Arabic) system for a Manager, one Operator, and Employees to
track students through Tamkeen applications, courses and classes — with Google
sign-in, live team chat, Excel export, and automatic Gmail reminder emails.

Stack: plain **HTML / CSS / JS** (no build step) on **Firebase Hosting**, data in
**Firestore**, files in **Firebase Storage**, emails/privileged actions in
**Firebase Cloud Functions** (Node.js), with an **optional PHP backend** (`/api`)
as a drop-in alternative to Functions if you'd rather host emails/exports on a
classic PHP server. You do not need both — pick one (Firebase Functions is the
simpler path and is wired up by default).

---

## 1. What's included

```
public/                  → everything Firebase Hosting serves (static)
  index.html              Google sign-in
  pending.html             "waiting for manager approval" screen
  employee/                dashboard (add + directory), student.html (edit + calendar + classes)
  operator/                dashboard, courses.html, course.html, class.html
  manager/                 dashboard, employees.html, employee-email.html, courses.html, course-view.html, class-view.html
  js/                      firebase-config, auth, i18n, ui (header/footer/search/toasts), chat, calendar, export
  css/style.css            shared design system (also handles Arabic RTL)
functions/                Cloud Functions: emails, reminders, approvals, cascade delete
api/                       OPTIONAL PHP alternative (send-email.php, export-excel.php, check-reminders.php)
firestore.rules            security rules
storage.rules               file upload rules
firebase.json / firestore.indexes.json
```

## 2. Data model (Firestore)

```
users/{uid}            { name, email, photoURL, role: manager|operator|employee|null, status: pending|active }
invites/{email}        { role }                       — manager pre-authorizes someone before they sign in
students/{id}          { name, cpr, phone, degree, tamkeenStatus, comment, cvURL, cvName,
                          trackingStartDate, classAssignments[], addedBy, addedByName }
courses/{id}            { name, createdBy, createdByName, createdByRole }
courses/{id}/classes/{id}                { name, courseId, courseName, createdBy, createdByName }
courses/{id}/classes/{id}/students/{id}   { name, cpr, tamkeenStatus, comment, sentBy, sentByName }
chatThreads/{id}         { isGroup, participants:[uid], name }
chatThreads/{id}/messages/{id}            { sender, senderName, text?, fileURL?, student?, createdAt }
```

## 3. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project**.
2. In the project: **Build → Authentication → Sign-in method → Google → Enable.**
3. **Build → Firestore Database → Create database** (production mode, pick your region).
4. **Build → Storage → Get started** (production mode).
5. **Project settings → General → Your apps → Add app → Web** — copy the config
   object into `public/js/firebase-config.js`.

## 4. Install the CLI and connect this folder

```bash
npm install -g firebase-tools
firebase login
cd student-management-system
firebase use --add          # pick the project you just created
```

## 5. Create the first Manager (one-time, manual)

Everyone else signs up through the app and gets approved by the manager — but
the *first* manager has no one to approve them. In the Firebase Console:

1. Sign in to the deployed app once with the Google account that should be
   manager. It will land on `pending.html` and create a `users/{uid}` doc.
2. Firestore Database → open that `users/{uid}` document → edit it:
   `role: "manager"`, `status: "active"`.
3. Reload the app — you're in as manager.

## 6. Gmail sending (Cloud Functions path — recommended)

The system emails go out through a Gmail account via Nodemailer.

1. On the sending Gmail account: turn on **2-Step Verification**, then create
   an **App Password** (Google Account → Security → App passwords).
2. Set the two secrets Functions needs:
   ```bash
   firebase functions:secrets:set GMAIL_USER
   firebase functions:secrets:set GMAIL_APP_PASSWORD
   ```
3. Install and deploy:
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions,firestore:rules,storage
   ```

## 7. Deploy the front end

```bash
firebase deploy --only hosting
```

Firebase gives you a URL like `https://your-project.web.app` — that's the app.

## 8. Put it in Git

```bash
git init
git add .
git commit -m "Initial commit: student management system"
git branch -M main
git remote add origin <your-empty-repo-url>
git push -u origin main
```
`.gitignore` already excludes `node_modules`, `.firebase`, and log files.

---

## Option B: PHP backend (alternative to Cloud Functions)

Firebase Hosting only serves **static** files — it cannot execute PHP. The
`/api` folder is provided for teams who'd rather run emails/exports off a
normal PHP host (cPanel, shared hosting, etc.) instead of Firebase Functions.
You only need one of the two options; Functions is simpler to operate.

```bash
cd api
composer install
cp config.php.example config.php   # fill in Gmail + Firebase service account
```
- `send-email.php` — POST `{to, subject, html}` → sends via Gmail SMTP.
- `export-excel.php` — POST `{filename, sheet, rows}` → streams an .xlsx.
- `check-reminders.php` — run daily via cron; mirrors the Cloud Function's
  11-month / 1-month / 3-days reminder logic using the Firestore REST API.

Note: the front end's Excel buttons already export **client-side** with
SheetJS (`public/js/export.js`) and work with zero server — `export-excel.php`
is only needed if you specifically want server-side generation instead.

---

## How the reminder emails work

When an employee picks a **tracking start date** on a student's mini
calendar, a scheduled Cloud Function (`dailyReminderCheck`, runs daily at
07:00 Asia/Bahrain time) checks every student with a start date and emails
the employee who added them:

- **1 month before** the one-year mark (i.e. 11 months after the start date)
- **3 days before** the one-year mark

Each reminder only fires once per student (tracked with a flag on the
student's document), so no duplicate emails.

## Notable behavior

- **Duplicate student check**: adding a student by CPR or phone checks both
  fields across the whole directory; if it matches, the employee sees who
  already added them and nothing new is created.
- **Chat**: the floating widget in the bottom-right has a "General" group
  everyone (including the manager) can see, plus private 1-to-1 threads —
  a user only ever sees messages in threads they're a participant of,
  exactly like WhatsApp DMs vs. groups. Drag a row from the Student Directory
  straight onto the open chat thread to share that student's file.
- **Language button**: toggles the whole UI (and layout direction) between
  English and Arabic instantly, no reload, saved per-browser.
- **Employees added manually**: the manager's "Add employee" button just
  pre-authorizes a Google email address (`invites/{email}`); that person gets
  instant access — no separate pending step — the moment they sign in with
  that exact Google account.

## Known limitations / next steps to review before going live

- `firestore.rules` and `storage.rules` are a solid starting point but
  should be reviewed against your real threat model before production use
  (e.g. restrict Storage reads to signed-in users only, add file-size/type
  validation server-side).
- The CPR-vs-phone auto-detect on quick-add uses a simple digit-length
  heuristic — adjust the regex in `employee/dashboard.html` to match your
  country's real CPR/phone formats.
- Emoji picker is a small fixed set inline in `chat.js`; swap in a full
  picker library if you want the complete Unicode set.
- `collectionGroup(db, "classes")` (used on the student page to list all open
  classes) may prompt Firebase the first time to auto-create a collection
  group index — click the link in the browser console error if it appears.
