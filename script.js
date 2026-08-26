// 1. Firebase Initialization (Replace with your Firebase Config keys)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentRole = "employee";
let currentLang = "EN";

// Translation Dictionary
const i18n = {
    EN: {
        welcome_title: "Welcome Back",
        welcome_subtitle: "Sign in with your Google account to access the Directory",
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
        chat_header: "Team Group Chat",
        search_placeholder: "Search by CPR...",
        btn_send: "Send"
    },
    AR: {
        welcome_title: "مرحباً بك",
        welcome_subtitle: "سجل الدخول بحساب Google للوصول إلى دليل الطلاب",
        student_directory: "دليل الطلاب",
        add_new_cpr: "+ إضافة رقم شخصي جديد",
        register_cpr: "تسجيل رقم شخصي جديد",
        register_cpr_subtitle: "أدخل الرقم الشخصي (9 أرقام) لإضافة الطالب.",
        cpr_label: "الرقم الشخصي (9 أرقام):",
        btn_submit: "إرسال البيانات",
        btn_back: "عودة / إنتهاء",
        cpr_success_title: "تم إضافة الرقم الشخصي بنجاح!",
        cpr_success_subtitle: "هل ترغب في إضافة سجل رقم شخصي آخر؟",
        btn_add_another: "+ إضافة رقم شخصي آخر",
        btn_go_directory: "الانتقال للدليل",
        chat_header: "محادثة الفريق",
        search_placeholder: "البحث عن طريق الرقم الشخصي...",
        btn_send: "إرسال"
    }
};

// 2. Auth State Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById("search-box")?.classList.remove("hidden");
        document.getElementById("account-btn")?.classList.remove("hidden");
        document.getElementById("logout-btn")?.classList.remove("hidden");
        document.getElementById("download-all-btn")?.classList.remove("hidden");
        
        await syncUserWithBackend(user);
        showView("view-home");
        loadStudents();
        listenToChat();
    } else {
        currentUser = null;
        showView("view-auth");
        document.getElementById("search-box")?.classList.add("hidden");
        document.getElementById("account-btn")?.classList.add("hidden");
        document.getElementById("logout-btn")?.classList.add("hidden");
        document.getElementById("download-all-btn")?.classList.add("hidden");
    }
});

// Google Authentication
function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((err) => alert("Sign in failed: " + err.message));
}

function logoutUser() {
    auth.signOut();
}

async function syncUserWithBackend(user) {
    try {
        const response = await fetch("api.php?action=sync_user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || "Employee"
            })
        });
        const res = await response.json();
        if (res.status === "success") {
            currentRole = res.role;
        }
    } catch (e) {
        console.error("User Sync Error:", e);
    }
}

// 3. View Management
function showView(viewId) {
    document.querySelectorAll(".card-view").forEach(el => el.classList.add("hidden"));
    document.getElementById(viewId)?.classList.remove("hidden");
}

function resetAndAddAnotherCPR() {
    document.getElementById("cpr-input").value = "";
    showView("view-add-cpr");
}

// 4. CPR Operations
async function addStudentCPR() {
    const cpr = document.getElementById("cpr-input").value.trim();
    if (!/^\d{9}$/.exec(cpr)) {
        alert("Please enter a valid 9-digit CPR number.");
        return;
    }

    try {
        const response = await fetch("api.php?action=add_cpr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cpr: cpr, uid: currentUser.uid })
        });
        const res = await response.json();
        if (res.status === "success") {
            showView("view-cpr-success");
        } else {
            alert(res.message);
        }
    } catch (e) {
        alert("Error submitting CPR record.");
    }
}

async function loadStudents() {
    const container = document.getElementById("student-container");
    if (!container) return;

    try {
        const response = await fetch("api.php?action=get_students");
        const res = await response.json();
        
        if (res.status === "success") {
            container.innerHTML = res.data.map(student => `
                <div class="student-card" style="padding: 12px; margin-bottom: 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: var(--bg-card);">
                    <strong>CPR:</strong> ${student.cpr} 
                    <span style="float: right; font-size: 0.8rem; color: #64748b;">${new Date(student.created_at).toLocaleDateString()}</span>
                </div>
            `).join("");
        }
    } catch (e) {
        container.innerHTML = "<p>Error loading student records.</p>";
    }
}

// 5. Team Chat (Firestore Real-time)
function toggleChatWindow() {
    document.getElementById("chat-window")?.classList.toggle("hidden");
}

function toggleEmojiPicker() {
    document.getElementById("emoji-picker")?.classList.toggle("hidden");
}

function insertEmoji(emoji) {
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
        chatInput.value += emoji;
        document.getElementById("emoji-picker")?.classList.add("hidden");
    }
}

function listenToChat() {
    db.collection("chat_messages").orderBy("timestamp", "asc").onSnapshot(snapshot => {
        const messagesBox = document.getElementById("chat-messages");
        if (!messagesBox) return;

        messagesBox.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const isMe = currentUser && currentUser.uid === data.sender_uid;
            messagesBox.innerHTML += `
                <div style="text-align: ${isMe ? 'right' : 'left'}; margin-bottom: 8px;">
                    <div style="font-size: 0.75rem; color: #64748b;">${data.sender_name}</div>
                    <div style="display: inline-block; padding: 6px 12px; border-radius: 12px; background: ${isMe ? '#2b6cb0' : '#e2e8f0'}; color: ${isMe ? '#fff' : '#000'}; font-size: 0.9rem;">
                        ${data.message}
                    </div>
                </div>
            `;
        });
        messagesBox.scrollTop = messagesBox.scrollHeight;
    });
}

async function sendChatMessage() {
    const input = document.getElementById("chat-input");
    const msg = input.value.trim();
    if (!msg || !currentUser) return;

    await db.collection("chat_messages").add({
        sender_uid: currentUser.uid,
        sender_name: currentUser.displayName || "Employee",
        message: msg,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = "";
}

// 6. Excel Export & Account Modal
function downloadAllStudentsData() {
    fetch("api.php?action=get_students")
        .then(res => res.json())
        .then(res => {
            if (res.status === "success") {
                const worksheet = XLSX.utils.json_to_sheet(res.data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
                XLSX.writeFile(workbook, "Student_Directory.xlsx");
            }
        });
}

function openAccountModal() {
    if (!currentUser) return;
    document.getElementById("modal-userid").innerText = currentUser.uid;
    document.getElementById("modal-username").innerText = currentUser.displayName || "N/A";
    document.getElementById("modal-email").innerText = currentUser.email;
    document.getElementById("account-modal")?.classList.remove("hidden");
}

function closeAccountModal() {
    document.getElementById("account-modal")?.classList.add("hidden");
}

// 7. i18n Language Toggle
function toggleLanguage() {
    currentLang = currentLang === "EN" ? "AR" : "EN";
    document.documentElement.dir = currentLang === "AR" ? "rtl" : "ltr";
    
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (i18n[currentLang][key]) el.innerText = i18n[currentLang][key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (i18n[currentLang][key]) el.placeholder = i18n[currentLang][key];
    });
}

// Live Clock Footer Update
setInterval(() => {
    const footer = document.getElementById("live-footer-datetime");
    if (footer) footer.innerText = new Date().toLocaleString();
}, 1000);
