// =========================================================
// Cloud Functions — Student Management System
//
// Sends all system emails through a Gmail account via
// Nodemailer (simplest path for "email in Gmail" requirement).
//
// One-time setup (see README for full steps):
//   1. Turn on 2-Step Verification on the sending Gmail account.
//   2. Create an "App Password" for it.
//   3. firebase functions:secrets:set GMAIL_USER
//   4. firebase functions:secrets:set GMAIL_APP_PASSWORD
//   5. firebase deploy --only functions
// =========================================================
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const db = admin.firestore();

const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

function buildTransport(){
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
  });
}

async function sendMail({ to, subject, html }){
  if (!to) return;
  const transporter = buildTransport();
  await transporter.sendMail({
    from: `"Student Management System" <${process.env.GMAIL_USER}>`,
    to, subject, html
  });
}

async function getManagerEmails(){
  const snap = await db.collection("users").where("role", "==", "manager").where("status", "==", "active").get();
  return snap.docs.map(d => d.data().email).filter(Boolean);
}

async function getOperatorEmails(){
  const snap = await db.collection("users").where("role", "==", "operator").where("status", "==", "active").get();
  return snap.docs.map(d => d.data().email).filter(Boolean);
}

async function getEmployeeEmails(){
  const snap = await db.collection("users").where("role", "==", "employee").where("status", "==", "active").get();
  return snap.docs.map(d => d.data().email).filter(Boolean);
}

// ---------------------------------------------------------
// 1. New user signed in for the first time -> email manager(s)
// ---------------------------------------------------------
exports.notifyManagerOfNewUser = onCall({ secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (req) => {
  const { uid } = req.data;
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return { ok: false };
  const user = userSnap.data();
  const managerEmails = await getManagerEmails();
  await sendMail({
    to: managerEmails.join(","),
    subject: `New sign-in request: ${user.name}`,
    html: `<p><b>${user.name}</b> (${user.email}) just signed in to the Student Management System for the first time.</p>
           <p>Open the Employees page to approve or reject this account.</p>`
  });
  return { ok: true };
});

// ---------------------------------------------------------
// 2. Manager approves a pending user -> assign role + welcome email
// ---------------------------------------------------------
exports.approveUser = onCall({ secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (req) => {
  const callerUid = req.auth && req.auth.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");
  const callerSnap = await db.collection("users").doc(callerUid).get();
  if (!callerSnap.exists || callerSnap.data().role !== "manager"){
    throw new HttpsError("permission-denied", "Only a manager can approve users.");
  }
  const { uid, role } = req.data; // role: "employee" | "operator"
  if (!["employee", "operator"].includes(role)){
    throw new HttpsError("invalid-argument", "role must be employee or operator.");
  }
  await db.collection("users").doc(uid).update({ role, status: "active" });
  const userSnap = await db.collection("users").doc(uid).get();
  await sendMail({
    to: userSnap.data().email,
    subject: "Your account has been approved",
    html: `<p>Hi ${userSnap.data().name},</p><p>Your account has been approved as <b>${role}</b>. You can now sign in to the Student Management System.</p>`
  });
  return { ok: true };
});

// ---------------------------------------------------------
// 3. Cascade-delete an employee/operator and everything they added
// ---------------------------------------------------------
exports.deleteEmployeeCascade = onCall(async (req) => {
  const callerUid = req.auth && req.auth.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");
  const callerSnap = await db.collection("users").doc(callerUid).get();
  if (!callerSnap.exists || callerSnap.data().role !== "manager"){
    throw new HttpsError("permission-denied", "Only a manager can delete users.");
  }
  const { uid } = req.data;
  const batchDeletes = [];

  const studentsSnap = await db.collection("students").where("addedBy", "==", uid).get();
  studentsSnap.forEach(doc => batchDeletes.push(doc.ref.delete()));

  await Promise.all(batchDeletes);
  await db.collection("users").doc(uid).delete();
  return { ok: true, deletedStudents: studentsSnap.size };
});

// ---------------------------------------------------------
// 4. Manager writes a free-form email to one user
// ---------------------------------------------------------
exports.sendCustomEmail = onCall({ secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (req) => {
  const callerUid = req.auth && req.auth.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "Sign in required.");
  const callerSnap = await db.collection("users").doc(callerUid).get();
  if (!callerSnap.exists || callerSnap.data().role !== "manager"){
    throw new HttpsError("permission-denied", "Only a manager can send this.");
  }
  const { toUid, subject, message } = req.data;
  const targetSnap = await db.collection("users").doc(toUid).get();
  if (!targetSnap.exists) throw new HttpsError("not-found", "User not found.");
  await sendMail({
    to: targetSnap.data().email,
    subject,
    html: `<p>${String(message).replace(/\n/g, "<br>")}</p>`
  });
  return { ok: true };
});

// ---------------------------------------------------------
// 5. Course created by the manager -> notify the operator
//    (courses store createdByRole so we know direction)
// ---------------------------------------------------------
exports.onCourseCreated = onDocumentCreated({ document: "courses/{courseId}", secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (event) => {
  const course = event.data.data();
  if (course.createdByRole !== "manager") return;
  const operatorEmails = await getOperatorEmails();
  await sendMail({
    to: operatorEmails.join(","),
    subject: `New course added: ${course.name}`,
    html: `<p>The manager added a new course: <b>${course.name}</b>.</p>`
  });
});

// ---------------------------------------------------------
// 6. Class opened by the operator -> notify all employees
// ---------------------------------------------------------
exports.onClassCreated = onDocumentCreated({ document: "courses/{courseId}/classes/{classId}", secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (event) => {
  const cls = event.data.data();
  const employeeEmails = await getEmployeeEmails();
  await sendMail({
    to: employeeEmails.join(","),
    subject: `New class opened: ${cls.name}`,
    html: `<p>A new class <b>${cls.name}</b> was opened in course <b>${cls.courseName}</b>. You can send students to it from their student page.</p>`
  });
});

// ---------------------------------------------------------
// 7. Daily reminder check — 1 month & 3 days before each
//    student's tracked year ends (trackingStartDate + 12 months)
// ---------------------------------------------------------
exports.dailyReminderCheck = onSchedule({ schedule: "every day 07:00", timeZone: "Asia/Bahrain", secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async () => {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  const studentsSnap = await db.collection("students").where("trackingStartDate", "!=", "").get();
  for (const doc of studentsSnap.docs){
    const s = doc.data();
    if (!s.trackingStartDate || !s.addedBy) continue;

    const start = new Date(s.trackingStartDate);
    const yearEnd = new Date(start); yearEnd.setMonth(yearEnd.getMonth() + 12);
    const oneMonthBefore = new Date(yearEnd); oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
    const threeDaysBefore = new Date(yearEnd); threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);

    const oneMonthISO = oneMonthBefore.toISOString().slice(0, 10);
    const threeDaysISO = threeDaysBefore.toISOString().slice(0, 10);

    let remindKey = null;
    if (todayISO === oneMonthISO) remindKey = "oneMonth";
    else if (todayISO === threeDaysISO) remindKey = "threeDays";
    if (!remindKey) continue;

    const alreadySentFlag = `reminderSent_${remindKey}`;
    if (s[alreadySentFlag]) continue;

    const employeeSnap = await db.collection("users").doc(s.addedBy).get();
    if (!employeeSnap.exists) continue;

    const remaining = remindKey === "oneMonth" ? "1 month" : "3 days";
    await sendMail({
      to: employeeSnap.data().email,
      subject: `Reminder: ${s.name} — ${remaining} left before the year ends`,
      html: `<p>Student <b>${s.name}</b> has <b>${remaining}</b> remaining before completing one year of tracking.</p>`
    });
    await doc.ref.update({ [alreadySentFlag]: true });
  }
});
