// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
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

let currentUserData = null;
let currentRole = 'employee';
let studentList = [];
let currentLang = 'en';
const pageLoadedAt = new Date();

// Manager Gmail Address for Notifications
const MANAGER_GMAIL = "manager@gmail.com"; // Replace with real manager email

// ==========================================
// 2. LANGUAGE TRANSLATIONS
// ==========================================
const translations = {
    en: {
        search_placeholder: "Search by name or CPR...",
        download_all: "Download All (Excel)",
        account: "Account",
        logout: "Logout",
        welcome_title: "Welcome",
        welcome_subtitle: "Sign in to access the Training Plus Student Directory",
        btn_google: "Sign in with Google",
        student_directory: "Student Directory",
        add_new_cpr: "+ Add New CPR",
        register_cpr: "Register New CPR",
        register_cpr_subtitle: "Enter a 9-digit CPR number to add a student.",
        cpr_label: "CPR Number (9 Digits):",
        btn_submit: "Submit Record",
        btn_back: "Done / Back",
        cpr_success_title: "CPR Added Successfully!",
        cpr_success_subtitle: "Would you like to add another student CPR record?",
        btn_add_another: "+ Add Another CPR",
        btn_go_directory: "Go to Directory",
        modal_account_title: "User Account",
        lbl_user_id: "User ID:",
        lbl_username: "Username:",
        lbl_email: "Email:",
        chat_header: "Team Group Chat",
        chat_placeholder: "Type a message...",
        btn_send: "Send",
        btn_download_excel: "Download Excel",
        btn_delete_student: "Delete Student",
        lbl_full_name: "Full Name:",
        lbl_cpr: "CPR:",
        lbl_gender: "Gender:",
        opt_male: "Male",
        opt_female: "Female",
        lbl_cv_doc: "Student CV Document",
        btn_upload_cv: "Upload CV",
        btn_view_cv: "📄 View / Download CV",
        btn_delete_cv: "Delete CV",
        lbl_no_cv: "No CV uploaded",
        lbl_enrolled_courses: "Enrolled Courses",
        ph_course: "Enter course name (e.g. Web Development)",
        btn_add_course: "+ Add Course",
        btn_delete_course: "Delete Course",
        lbl_no_courses: "No courses added yet.",
        lbl_no_students: "No student records found.",
        lbl_student_number: "Student Number:",
        lbl_major: "Major:"
    },
    ar: {
        search_placeholder: "البحث بالاسم أو الرقم الشخصي...",
        download_all: "تحميل الكل (إكسل)",
        account: "الحساب",
        logout: "تسجيل الخروج",
        welcome_title: "مرحباً بك",
        welcome_subtitle: "سجل الدخول للوصول إلى دليل طلاب ترينينج بلس",
        btn_google: "تسجيل الدخول باستخدام جوجل",
        student_directory: "دليل الطلاب",
        add_new_cpr: "+ إضافة رقم شخصي جديد",
        register_cpr: "تسجيل رقم شخصي جديد",
        register_cpr_subtitle: "أدخل الرقم الشخصي المكون من 9 أرقام لإضافة طالب.",
        cpr_label: "الرقم الشخصي (9 أرقام):",
        btn_submit: "إرسال السجل",
        btn_back: "تم / العودة",
        cpr_success_title: "تمت إضافة الرقم الشخصي بنجاح!",
        cpr_success_subtitle: "هل ترغب في إضافة سجل طالب آخر؟",
        btn_add_another: "+ إضافة رقم شخصي آخر",
        btn_go_directory: "الانتقال إلى الدليل",
        modal_account_title: "حساب المستخدم",
        lbl_user_id: "معرف المستخدم:",
        lbl_username: "اسم المستخدم:",
        lbl_email: "البريد الإلكتروني:",
        chat_header: "محادثة الفريق الجماعية",
        chat_placeholder: "اكتب رسالة...",
        btn_send: "إرسال",
        btn_download_excel: "تحميل إكسل",
        btn_delete_student: "حذف الطالب",
        lbl_full_name: "الاسم الكامل:",
        lbl_cpr: "الرقم الشخصي:",
        lbl_gender: "الجنس:",
        opt_male: "ذكر",
        opt_female: "أنثى",
        lbl_cv_doc: "مستند السيرة الذاتية للطالب",
        btn_upload_cv: "رفع السيرة الذاتية",
        btn_view_cv: "📄 عرض / تحميل السيرة الذاتية",
        btn_delete_cv: "حذف السيرة الذاتية",
        lbl_no_cv: "لم يتم رفع سيرة ذاتية",
        lbl_enrolled_courses: "الدورات المسجلة",
        ph_course: "أدخل اسم الدورة (مثال: تطوير الويب)",
        btn_add_course: "+ إضافة دورة",
        btn_delete_course: "حذف الدورة",
        lbl_no_courses: "لم يتم إضافة دورات بعد.",
        lbl_no_students: "لم يتم العثور على سجلات للطلاب.",
        lbl_student_number: "الرقم الجامعي:",
        lbl_major: "التخصص:"
    }
};

function toggleLanguage() {
    currentLang = (currentLang === 'en') ? 'ar' : 'en';
    document.documentElement.dir = (currentLang === 'ar') ? 'rtl' : 'ltr';
    applyLanguageTranslations();
    renderStudentDirectory(studentList);
}

function applyLanguageTranslations() {
    const langObj = translations[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (langObj[key]) el.innerText = langObj[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (langObj[key]) el.placeholder = langObj[key];
    });
}

// Monitor Auth State
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Block pending employees
            if (userData.role === 'employee' && userData.status === 'pending') {
                alert("Your Employee account is currently pending Manager approval.");
                auth.signOut();
                return;
            }
            currentRole = userData.role || 'employee';
        }

        currentUserData = user;
        updateUserUI(true);
        listenToStudentDirectory();
        listenToGroupChat();
    } else {
        currentUserData = null;
        updateUserUI(false);
    }
});

// ==========================================
// 3. AUTHENTICATION & EMAIL NOTIFICATIONS
// ==========================================
// Toggle forms based on role dropdown selection
function handleRoleSelectionChange() {
    const role = document.getElementById('auth-role-select').value;
    
    document.getElementById('manager-form-container').classList.add('hidden');
    document.getElementById('operator-form-container').classList.add('hidden');
    document.getElementById('employee-form-container').classList.add('hidden');

    if (role === 'manager') {
        document.getElementById('manager-form-container').classList.remove('hidden');
    } else if (role === 'operator') {
        document.getElementById('operator-form-container').classList.remove('hidden');
    } else if (role === 'employee') {
        document.getElementById('employee-form-container').classList.remove('hidden');
    }
}

// 1. Manager Authentication (Email & Password)
async function signInManager() {
    const email = document.getElementById('manager-email').value.trim();
    const password = document.getElementById('manager-password').value.trim();

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const userRef = db.collection('users').doc(userCredential.user.uid);
        await userRef.set({
            uid: userCredential.user.uid,
            email: email,
            role: 'manager',
            status: 'approved'
        }, { merge: true });
    } catch (error) {
        console.error("Manager Login Error:", error);
        alert("Manager Sign-In Failed: " + error.message);
    }
}

// 2. Operator Authentication (Create or Login with Password)
async function handleOperatorAuth() {
    const email = document.getElementById('operator-email').value.trim();
    const password = document.getElementById('operator-password').value.trim();

    if (!email || !password) {
        alert("Please enter an email and password.");
        return;
    }

    try {
        // Try logging in first
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set({
            role: 'operator',
            status: 'approved'
        }, { merge: true });
    } catch (error) {
        // If account doesn't exist, create operator account with given password
        if (error.code === 'auth/user-not-found') {
            try {
                const newUser = await auth.createUserWithEmailAndPassword(email, password);
                await db.collection('users').doc(newUser.user.uid).set({
                    uid: newUser.user.uid,
                    email: email,
                    role: 'operator',
                    status: 'approved',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert("Operator account created and signed in successfully!");
            } catch (createError) {
                alert("Operator Sign-Up Failed: " + createError.message);
            }
        } else {
            alert("Operator Sign-In Failed: " + error.message);
        }
    }
}

// 3. Employee Google Authentication (Sends EmailJS approval request to manager)
async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();

    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const userRef = db.collection('users').doc(user.uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists()) {
            await userRef.set({
                uid: user.uid,
                name: user.displayName || 'Employee',
                email: user.email,
                role: 'employee',
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            sendApprovalEmailToManager(user);
            alert("Employee sign-in request submitted! An email notification was sent to the Manager for approval.");
            await auth.signOut();
        } else {
            const userData = userSnap.data();
            if (userData.role === 'employee' && userData.status === 'pending') {
                alert("Your Employee account is still pending Manager approval.");
                await auth.signOut();
            }
        }
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        alert("Google Sign-In Failed: " + error.message);
    }
}

// Function to update current user's password (for Manager and Operator)
async function changeUserPassword() {
    const user = auth.currentUser;
    const newPassword = document.getElementById('new-password-input')?.value.trim();
    const confirmPassword = document.getElementById('confirm-password-input')?.value.trim();

    if (!user) {
        alert("No active session found.");
        return;
    }

    if (!newPassword || newPassword.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    try {
        await user.updatePassword(newPassword);
        alert("Password updated successfully! Next time you log in, use your new password.");
        document.getElementById('new-password-input').value = "";
        document.getElementById('confirm-password-input').value = "";
        closeAccountModal();
    } catch (error) {
        console.error("Error updating password:", error);
        if (error.code === 'auth/requires-recent-login') {
            alert("Security Notice: Please log out and log back in before changing your password.");
        } else {
            alert("Failed to update password: " + error.message);
        }
    }
}
//
//
// Show/Hide password section depending on whether the user logged in via Password or Google
function openAccountModal() { 
    const user = auth.currentUser;
    const passwordSection = document.getElementById('change-password-section');
    
    // Hide password change option for Google Sign-In (Employees)
    if (user && user.providerData.some(p => p.providerId === 'google.com')) {
        if (passwordSection) passwordSection.style.display = 'none';
    } else {
        if (passwordSection) passwordSection.style.display = 'block';
    }

    document.getElementById('account-modal').classList.remove('hidden'); 
}

// ==========================================
// 4. CPR RECORD MANAGEMENT
// ==========================================
async function addStudentCPR() {
    const cprInput = document.getElementById('cpr-input');
    if (!cprInput) return;

    const cpr = cprInput.value.trim();

    if (!/^\d{9}$/.test(cpr)) {
        alert("CPR must be exactly 9 digits.");
        return;
    }

    try {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            alert("You must be logged in to add a CPR.");
            return;
        }

        const accountUsername = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : "User");
        const currentUid = currentUser.uid;
        const currentEmail = currentUser.email;

        const docRef = db.collection("students").doc(cpr);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const existingData = docSnap.data();
            const creatorUid = existingData.createdByUid;
            const creatorEmail = existingData.createdByEmail || existingData.added_by;

            const isMyRecord = (creatorUid && creatorUid === currentUid) || 
                               (creatorEmail && creatorEmail === currentEmail);

            if (isMyRecord) {
                alert(`This CPR (${cpr}) is already registered by you.`);
            } else {
                let username = existingData.createdByName || existingData.username || existingData.added_by;
                alert(`This CPR (${cpr}) is already registered by user: ${username}`);
            }
            return;
        }

        await docRef.set({
            cpr: cpr,
            studentNumber: cpr,
            major: "N/A",
            phone: "N/A",
            comments: "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdByUid: currentUid,
            createdByEmail: currentEmail,
            createdByName: accountUsername,
            added_by: currentEmail
        });

        cprInput.value = '';
        showView('view-cpr-success');
    } catch (error) {
        console.error("Error processing CPR addition:", error);
        alert("Failed to process request: " + error.message);
    }
}

function resetAndAddAnotherCPR() {
    const cprInput = document.getElementById('cpr-input');
    if (cprInput) cprInput.value = '';
    showView('view-add-cpr');
    setTimeout(() => { if (cprInput) cprInput.focus(); }, 100);
}

// ==========================================
// 5. STUDENT DIRECTORY & COMMENTS
// ==========================================
function listenToStudentDirectory() {
    if (!currentUserData) return;
    const currentUid = currentUserData.uid;
    const activeEmail = currentUserData.email;
    const activeName = currentUserData.displayName;

    db.collection('students').onSnapshot((snapshot) => {
        studentList = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const isMine = (data.createdByUid && data.createdByUid === currentUid) ||
                           (data.added_by && data.added_by === activeEmail) ||
                           (data.added_by && data.added_by === activeName) ||
                           (data.createdByEmail && data.createdByEmail === activeEmail);

            if (isMine) {
                studentList.push({ id: doc.id, ...data });
            }
        });
        renderStudentDirectory(studentList);
    }, (error) => {
        console.error("Error fetching student directory:", error);
    });
}

function handleSearch() {
    const q = document.getElementById('search-input')?.value.toLowerCase().trim() || "";
    const filtered = studentList.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) || 
        (s.cpr && s.cpr.includes(q)) ||
        (s.studentNumber && s.studentNumber.toLowerCase().includes(q)) ||
        (s.major && s.major.toLowerCase().includes(q))
    );
    renderStudentDirectory(filtered);
}

function renderStudentDirectory(list) {
    const container = document.getElementById('student-container');
    if (!container) return;
    container.innerHTML = "";

    const t = (typeof translations !== 'undefined' && translations[currentLang]) 
        ? translations[currentLang] 
        : {
            lbl_no_students: "No student records found.",
            btn_delete_course: "Delete Course",
            lbl_no_courses: "No courses added yet.",
            btn_view_cv: "📄 View / Download CV",
            btn_delete_cv: "Delete CV",
            lbl_no_cv: "No CV uploaded",
            btn_download_excel: "Download Excel",
            btn_delete_student: "Delete Student",
            lbl_full_name: "Full Name:",
            lbl_student_number: "Student Number:",
            lbl_major: "Major:",
            lbl_cpr: "CPR:",
            lbl_gender: "Gender:",
            opt_male: "Male",
            opt_female: "Female",
            lbl_email: "Email:",
            lbl_cv_doc: "Student CV Document",
            btn_upload_cv: "Upload CV",
            lbl_enrolled_courses: "Enrolled Courses",
            ph_course: "Enter course name",
            btn_add_course: "+ Add Course"
        };

    if (list.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#a0aec0; padding:20px;">${t.lbl_no_students}</p>`;
        return;
    }

    list.forEach((student) => {
        const item = document.createElement('div');
        item.className = "student-item";

        let coursesHTML = "";
        if (student.courses && Array.isArray(student.courses) && student.courses.length > 0) {
            coursesHTML = student.courses.map((c, index) => `
                <li style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:8px 12px; border: 1px solid #e2e8f0; border-radius:6px; margin-bottom:6px; font-size:0.88rem;">
                    <div>
                        <strong style="color: #2d3748;">${escapeHTML(c.name)}</strong> 
                        <span style="color:#718096; margin-left:8px; font-size:0.80rem;">(${c.addedAt})</span>
                    </div>
                    <button type="button" onclick="removeCourse('${student.id}', ${index})" 
                        style="background: #fff5f5; border: 1px solid #feb2b2; color: #e53e3e; cursor: pointer; font-size: 0.75rem; padding: 4px 10px; border-radius: 100px;">
                        ${t.btn_delete_course}
                    </button>
                </li>
            `).join("");
        } else {
            coursesHTML = `<p style="font-size:0.82rem; color:#a0aec0; margin-top:4px;">${t.lbl_no_courses}</p>`;
        }

        const cvDisplay = student.cvUrl 
            ? `<div style="display: flex; align-items: center; gap: 8px;">
                <a href="${student.cvUrl}" download="${student.cvName || 'Student_CV'}" target="_blank" style="color:#2b6cb0; font-weight:600; text-decoration:underline; font-size:0.85rem;">${t.btn_view_cv}</a>
                <button type="button" onclick="deleteStudentCV('${student.id}')" 
                    style="background: #fff5f5; border: 1px solid #feb2b2; color: #e53e3e; cursor: pointer; font-size: 0.75rem; padding: 4px 10px; border-radius: 100px;">
                    ${t.btn_delete_cv}
                </button>
               </div>`
            : `<span style="color:#a0aec0; font-size:0.85rem;">${t.lbl_no_cv}</span>`;

        item.innerHTML = `
            <div class="student-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span>${escapeHTML(student.name)} (${escapeHTML(student.cpr)})</span>
                <svg class="arrow-icon" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div class="student-details hidden">
                <div class="student-actions-wrapper" style="display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 12px;">
                    <button class="nav-btn" onclick="downloadSingleStudentData('${student.id}')" style="background: #edf2f7; border: 1px solid #cbd5e0; color: #2d3748; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.82rem;">${t.btn_download_excel}</button>
                    <button class="delete-icon-btn" onclick="deleteStudent('${student.id}')">${t.btn_delete_student}</button>
                </div>
                
                <div class="grid-form">
                    <label>${t.lbl_full_name} 
                        <input type="text" value="${escapeHTML(student.name || '')}" onchange="updateStudentField('${student.id}', 'name', this.value)">
                    </label>
                    <label>${t.lbl_student_number || 'Student Number:'} 
                        <input type="text" value="${escapeHTML(student.studentNumber || '')}" onchange="updateStudentField('${student.id}', 'studentNumber', this.value)">
                    </label>
                    <label>${t.lbl_major || 'Major:'} 
                        <input type="text" value="${escapeHTML(student.major || '')}" onchange="updateStudentField('${student.id}', 'major', this.value)">
                    </label>
                    <label>${t.lbl_cpr} 
                        <input type="text" value="${escapeHTML(student.cpr)}" readonly>
                    </label>
                    <label>${t.lbl_gender} 
                        <select onchange="updateStudentField('${student.id}', 'gender', this.value)">
                            <option value="male" ${student.gender === 'male' ? 'selected' : ''}>${t.opt_male}</option>
                            <option value="female" ${student.gender === 'female' ? 'selected' : ''}>${t.opt_female}</option>
                        </select>
                    </label>
                    <label>${t.lbl_email} 
                        <input type="email" value="${escapeHTML(student.email || '')}" onchange="updateStudentField('${student.id}', 'email', this.value)">
                    </label>
                </div>

                <!-- Student Directory Comments Section -->
                <div style="margin-top: 16px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <h4 style="margin-bottom: 6px; color: #2b6cb0; font-size: 0.9rem;">Comments / Notes</h4>
                    <textarea id="comment-${student.id}" rows="2" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e0; font-size: 0.85rem;" placeholder="Add a comment or administrative note...">${escapeHTML(student.comments || '')}</textarea>
                    <button type="button" class="primary-btn" onclick="saveStudentComment('${student.id}')" style="margin-top: 6px; padding: 4px 12px; font-size: 0.8rem;">Save Comment</button>
                </div>

                <hr style="margin: 16px 0; border: none; border-top: 1px solid #e2e8f0;">

                <div style="margin-bottom: 16px;">
                    <h4 style="margin-bottom: 8px; color: #2b6cb0;">${t.lbl_cv_doc}</h4>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <input type="file" id="cv-input-${student.id}" accept=".pdf,.doc,.docx" style="font-size: 0.85rem;">
                        <button type="button" class="primary-btn" onclick="uploadStudentCV('${student.id}')" style="padding: 6px 12px; font-size: 0.85rem;">${t.btn_upload_cv}</button>
                        <div style="margin-left: auto;">${cvDisplay}</div>
                    </div>
                </div>

                <hr style="margin: 16px 0; border: none; border-top: 1px solid #e2e8f0;">

                <div>
                    <h4 style="margin-bottom: 8px; color: #2b6cb0;">${t.lbl_enrolled_courses}</h4>
                    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                        <input type="text" id="course-input-${student.id}" placeholder="${t.ph_course}" style="flex: 1; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.85rem;">
                        <button type="button" class="primary-btn" onclick="addCourseToStudent('${student.id}')" style="padding: 6px 14px; font-size: 0.85rem;">${t.btn_add_course}</button>
                    </div>
                    
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${coursesHTML}
                    </ul>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

async function saveStudentComment(studentId) {
    const commentVal = document.getElementById(`comment-${studentId}`)?.value.trim();
    try {
        await db.collection('students').doc(studentId).update({ comments: commentVal });
        alert("Comment saved successfully!");
    } catch (err) {
        console.error("Error saving comment:", err);
        alert("Failed to save comment: " + err.message);
    }
}

async function updateStudentField(id, field, value) {
    await db.collection('students').doc(id).update({ [field]: value });
}

async function deleteStudent(id) {
    if (confirm("Delete this student entry?")) {
        await db.collection('students').doc(id).delete();
    }
}

// ==========================================
// 6. EXCEL EXPORTS
// ==========================================
function downloadAllStudentsData() {
    if (studentList.length === 0) {
        alert("No student data available to download.");
        return;
    }

    const studentsRows = studentList.map(s => {
        const courseNames = Array.isArray(s.courses) ? s.courses.map(c => c.name).join(', ') : 'None';
        return {
            "Full Name": s.name || '',
            "Student Number": s.studentNumber || '',
            "Major": s.major || '',
            "CPR": s.cpr || '',
            "Gender": s.gender || '',
            "Email": s.email || '',
            "Comments": s.comments || '',
            "Enrolled Courses": courseNames,
            "CV Status": s.cvUrl ? 'Uploaded' : 'No CV',
            "Added By": s.added_by || s.createdByName || ''
        };
    });

    const wb = XLSX.utils.book_new();
    const wsStudents = XLSX.utils.json_to_sheet(studentsRows);
    XLSX.utils.book_append_sheet(wb, wsStudents, "All Students");

    const todayStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `All_Students_Data_${todayStr}.xlsx`);
}

function downloadSingleStudentData(studentId) {
    const student = studentList.find(s => s.id === studentId);
    if (!student) return;

    const recordRows = [
        ["STUDENT RECORD INFORMATION", ""],
        ["Full Name", student.name || 'N/A'],
        ["Student Number", student.studentNumber || 'N/A'],
        ["Major", student.major || 'N/A'],
        ["CPR", student.cpr || 'N/A'],
        ["Gender", student.gender || 'N/A'],
        ["Email", student.email || 'N/A'],
        ["Comments", student.comments || 'None'],
        ["Added By", student.added_by || student.createdByName || 'N/A'],
        ["", ""],
        ["ENROLLED COURSES", "ADDED DATE"]
    ];

    if (Array.isArray(student.courses) && student.courses.length > 0) {
        student.courses.forEach(c => recordRows.push([c.name, c.addedAt || '']));
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(recordRows);
    XLSX.utils.book_append_sheet(wb, ws, "Student Details");
    XLSX.writeFile(wb, `Student_${student.cpr || studentId}.xlsx`);
}

// ==========================================
// 7. COURSE MANAGEMENT
// ==========================================
async function addCourseToStudent(studentId) {
    const inputEl = document.getElementById(`course-input-${studentId}`);
    if (!inputEl) return;

    const courseName = inputEl.value.trim();
    if (!courseName) {
        alert("Please enter a course name.");
        return;
    }

    const now = new Date();
    const formattedDateTime = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ", " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
        const studentRef = db.collection('students').doc(studentId);
        const docSnap = await studentRef.get();
        if (!docSnap.exists) return;

        const data = docSnap.data();
        let currentCourses = Array.isArray(data.courses) ? data.courses : [];
        currentCourses.push({ name: courseName, addedAt: formattedDateTime });

        await studentRef.update({ courses: currentCourses });
        inputEl.value = "";
    } catch (err) {
        console.error("Error adding course:", err);
    }
}

async function removeCourse(studentId, courseIndex) {
    if (!confirm("Delete this course?")) return;
    try {
        const studentRef = db.collection('students').doc(studentId);
        const docSnap = await studentRef.get();

        if (docSnap.exists) {
            let existingCourses = Array.isArray(docSnap.data().courses) ? docSnap.data().courses : [];
            existingCourses.splice(courseIndex, 1);
            await studentRef.update({ courses: existingCourses });
        }
    } catch (err) {
        console.error("Error removing course:", err);
    }
}

// ==========================================
// 8. CV UPLOAD & DELETE
// ==========================================
async function uploadStudentCV(studentId) {
    const fileInput = document.getElementById(`cv-input-${studentId}`);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Please select a file first!");
        return;
    }

    const file = fileInput.files[0];
    if (file.size > 700 * 1024) {
        alert("File size is too large! Please select a file under 700KB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            await db.collection('students').doc(studentId).update({
                cvUrl: e.target.result,
                cvName: file.name
            });
            alert("CV saved successfully!");
        } catch (err) {
            console.error("CV update error:", err);
        }
    };
    reader.readAsDataURL(file);
}

async function deleteStudentCV(studentId) {
    if (!confirm("Delete this CV?")) return;
    try {
        await db.collection('students').doc(studentId).update({
            cvUrl: firebase.firestore.FieldValue.delete(),
            cvName: firebase.firestore.FieldValue.delete()
        });
        alert("CV deleted successfully!");
    } catch (err) {
        console.error("Error deleting CV:", err);
    }
}

// ==========================================
// 9. GROUP CHAT
// ==========================================
function listenToGroupChat() {
    db.collection('chat_messages').orderBy('timestamp', 'asc').limitToLast(50)
      .onSnapshot((snapshot) => {
          const box = document.getElementById('chat-messages');
          if (!box) return;
          box.innerHTML = "";

          const currentUserId = currentUserData ? currentUserData.uid : null;
          const currentName = currentUserData ? (currentUserData.displayName || currentUserData.email?.split('@')[0]) : null;

          snapshot.forEach(doc => {
              const m = doc.data();
              const div = document.createElement('div');
              const senderName = m.username || "Anonymous";
              const isMe = (m.uid && m.uid === currentUserId) || (senderName === currentName);

              div.className = `chat-msg ${isMe ? 'my-msg' : 'other-msg'}`;
              div.innerHTML = `
                  <div class="msg-header">
                      <strong class="msg-sender">${escapeHTML(senderName)}</strong>
                  </div>
                  <div class="msg-body">${escapeHTML(m.message || "")}</div>
              `;
              box.appendChild(div);
          });
          box.scrollTop = box.scrollHeight;
      });
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;

    const user = currentUserData || auth.currentUser;
    if (!user) return;

    try {
        input.value = "";
        await db.collection('chat_messages').add({
            uid: user.uid,
            username: user.displayName || user.email.split('@')[0],
            message: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (err) {
        console.error("Failed to send message:", err);
    }
}

function toggleEmojiPicker() {
    document.getElementById('emoji-picker')?.classList.toggle('hidden');
}

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

// ==========================================
// 10. NAVIGATION, MODALS & CLOCK
// ==========================================
function showView(id) {
    document.querySelectorAll('.card-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(id)?.classList.remove('hidden');
}

function openAccountModal() { document.getElementById('account-modal').classList.remove('hidden'); }
function closeAccountModal() { document.getElementById('account-modal').classList.add('hidden'); }

function toggleChatWindow() { 
    document.getElementById('chat-window')?.classList.toggle('hidden');
}

function runLiveFooterClock() {
    const el = document.getElementById('live-footer-datetime');
    if (el) {
        setInterval(() => {
            const now = new Date();
            el.innerText = now.toLocaleDateString(currentLang === 'ar' ? 'ar-BH' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + " | " + now.toLocaleTimeString();
        }, 1000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    runLiveFooterClock();
    applyLanguageTranslations();
    
    const emojiPicker = document.getElementById('emoji-picker');
    const chatInput = document.getElementById('chat-input');
    if (emojiPicker && chatInput) {
        emojiPicker.querySelectorAll('span').forEach(emoji => {
            emoji.addEventListener('click', () => {
                chatInput.value += emoji.innerText;
                chatInput.focus();
                emojiPicker.classList.add('hidden');
            });
        });
    }
});
