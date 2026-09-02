// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCzTs_zw28wkHij4Jj9-EEW3XOpQ5si2yc",
    authDomain: "training-plus-212a2.firebaseapp.com",
    projectId: "training-plus-212a2",
    storageBucket: "training-plus-212a2.firebasestorage.app",
    messagingSenderId: "330136803727",
    appId: "1:330136803727:web:3013a358a547a112ff93fa",
    measurementId: "G-FX3XRSLD8W"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    initClock();
    auth.onAuthStateChanged(user => {
        if (user) {
            fetchStudentsDirectory();
            loadManagerApprovals();
        }
    });
});

// Live Footer Clock
function initClock() {
    const el = document.getElementById('live-footer-datetime');
    setInterval(() => {
        if (el) el.textContent = new Date().toLocaleString();
    }, 1000);
}

function toggleLanguage() {
    alert("Language toggled between AR / EN");
}

// Live Search Filter Across Tables
function handleSearch() {
    const q = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
}

// 1. Dual CPR / Phone Number Student Creation
async function addStudentWithCprOrPhone() {
    const name = document.getElementById('std-name').value.trim();
    const cprOrPhone = document.getElementById('cpr-input').value.trim();
    const status = document.getElementById('std-status').value;
    const comment = document.getElementById('std-comment').value.trim();

    if (!name || !/^\d{8,9}$/.test(cprOrPhone)) {
        alert("Please enter a valid name and a 9-digit CPR or phone number.");
        return;
    }

    const currentUser = auth.currentUser;
    const employeeUsername = currentUser ? (currentUser.displayName || currentUser.email.split('@')[0]) : "Employee";

    await db.collection("students").doc(cprOrPhone).set({
        name: name,
        cprOrPhone: cprOrPhone,
        tamkeenStatus: status,
        comment: comment,
        addedByEmployee: employeeUsername,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    alert("Student record saved successfully.");
    fetchStudentsDirectory();
}

// 2. Fetch Directory (Delete Button Excluded)
async function fetchStudentsDirectory() {
    const tbody = document.getElementById('students-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const snap = await db.collection('students').get();

    snap.forEach(doc => {
        const d = doc.data();
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${d.name || 'N/A'}</td>
            <td>${d.cprOrPhone || doc.id}</td>
            <td>${d.tamkeenStatus || 'Under Processing'}</td>
            <td>${d.comment || ''}</td>
            <td>${d.addedByEmployee || 'System'}</td>
            <td>
                <input type="date" value="${d.startDate || ''}" onchange="setStudentStartDate('${doc.id}', this.value)">
            </td>
            <td>${d.expiryDate || 'Not Set'}</td>
            <td>
                <button class="primary-btn" onclick="transferStudentPrompt('${doc.id}')">➔ Transfer</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. 12-Month Calendar Expiry & Notification Trigger
async function setStudentStartDate(studentId, dateVal) {
    if (!dateVal) return;

    const start = new Date(dateVal);
    const expiry = new Date(start);
    expiry.setFullYear(expiry.getFullYear() + 1);

    const currentUser = auth.currentUser;

    await db.collection('students').doc(studentId).update({
        startDate: dateVal,
        expiryDate: expiry.toISOString().slice(0, 10),
        assignedEmail: currentUser ? currentUser.email : ''
    });

    sendSystemEmail({
        to_email: currentUser ? currentUser.email : '',
        subject: "12-Month Program Schedule Updated",
        body: `Student CPR ${studentId} program completion deadline is ${expiry.toISOString().slice(0, 10)}. Direct reminders scheduled.`
    });

    alert(`12-Month Expiry Date set: ${expiry.toISOString().slice(0, 10)}`);
    fetchStudentsDirectory();
}

// 4. Transfer Student to Class Roster (Arrow Click)
async function transferStudentPrompt(studentId) {
    const courseId = prompt("Enter Course ID:");
    const classId = prompt("Enter Class Batch ID:");
    if (!courseId || !classId) return;

    const currentUser = auth.currentUser;
    const employeeUsername = currentUser ? (currentUser.displayName || currentUser.email.split('@')[0]) : "Employee";

    const docSnap = await db.collection('students').doc(studentId).get();
    if (!docSnap.exists) return;

    const data = docSnap.data();

    await db.collection('courses').doc(courseId)
            .collection('classes').doc(classId)
            .collection('students').doc(studentId).set({
        studentName: data.name || 'N/A',
        cpr: data.cprOrPhone || studentId,
        tamkeenStatus: data.tamkeenStatus || 'Under Processing',
        addedByEmployeeUsername: employeeUsername,
        transferredAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Student transferred to class roster.");
}

// 5. Excel Export Functionality
function downloadClassRosterToExcel(courseName, className, tableId) {
    const tbl = document.getElementById(tableId);
    if (!tbl) return;
    const wb = XLSX.utils.table_to_book(tbl, { sheet: className });
    XLSX.writeFile(wb, `${courseName}_${className}_Roster.xlsx`);
}

// 6. Access Approval & Automatic Chat Sync
async function acceptUserAccess(userId, userEmail, userName) {
    await db.collection('users').doc(userId).update({ status: 'Accepted' });

    await db.collection('chat_messages').add({
        username: "System",
        message: `🎉 User ${userName} (${userEmail}) has been accepted and added to group chat.`,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("User accepted and added to chat!");
}

// 7. Danger Delete Modal Control
let selectedDeleteUser = null;

function promptDeleteUser(userId, email) {
    selectedDeleteUser = userId;
    const modal = document.getElementById('full-page-delete-modal');
    if (modal) modal.classList.remove('hidden');

    document.getElementById('confirm-delete-btn').onclick = async () => {
        sendSystemEmail({
            to_email: email,
            subject: "Account Termination Notice",
            body: "Your account has been deleted by the Manager. Future logins will require new registration."
        });

        await db.collection('users').doc(selectedDeleteUser).delete();
        closeDeleteModal();
        alert("User permanently removed.");
        location.reload();
    };
}

function closeDeleteModal() {
    document.getElementById('full-page-delete-modal')?.classList.add('hidden');
}

function sendSystemEmail(params) {
    console.log("Triggering Email Notification:", params);
}

function logoutUser() {
    auth.signOut().then(() => {
        window.location.href = "index.html";
    });
}
