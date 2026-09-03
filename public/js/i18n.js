// =========================================================
// i18n — English / Arabic toggle
// Usage: give any translatable element data-i18n="key"
// and (optionally) data-i18n-placeholder="key" for inputs.
// =========================================================

export const dict = {
  en: {
    brand: "Student System",
    nav_home: "Home",
    nav_directory: "Student Directory",
    nav_courses: "Courses",
    nav_employees: "Employees",
    search_placeholder: "Search name, CPR or phone…",
    account: "Account",
    logout: "Log out",
    signed_in_as: "Signed in with Google as",
    add_student: "Add student",
    add_employee: "Add employee",
    add_course: "Add course",
    add_class: "Add class",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    send: "Send",
    download_excel: "Download Excel",
    name: "Name",
    cpr: "CPR",
    phone: "Phone number",
    degree: "Degree",
    tamkeen_status: "Tamkeen status",
    comment: "Comment",
    cv: "CV",
    upload_cv: "Upload CV",
    added_by: "Added by",
    status_accepted: "Accepted",
    status_processing: "Under processing",
    status_withdrawn: "Withdrawn",
    status_pending: "Pending approval",
    classes: "Classes",
    send_to_class: "Send to class",
    chat: "Chat",
    type_message: "Type a message…",
    already_added: "This student was already added by {name}.",
    added_success: "Student added successfully. Redirecting to Student Directory…",
    confirm_delete_employee_title: "Delete this user?",
    confirm_delete_employee_body: "All students and data added by this user will be permanently deleted. This cannot be undone.",
    yes_delete: "Yes, delete",
    email_to_user: "Email this user",
    subject: "Subject",
    message: "Message",
  },
  ar: {
    brand: "نظام الطلاب",
    nav_home: "الرئيسية",
    nav_directory: "دليل الطلاب",
    nav_courses: "الدورات",
    nav_employees: "الموظفون",
    search_placeholder: "ابحث بالاسم أو رقم البطاقة أو الهاتف…",
    account: "الحساب",
    logout: "تسجيل الخروج",
    signed_in_as: "تم تسجيل الدخول عبر جوجل باسم",
    add_student: "إضافة طالب",
    add_employee: "إضافة موظف",
    add_course: "إضافة دورة",
    add_class: "إضافة فصل",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    send: "إرسال",
    download_excel: "تحميل ملف إكسل",
    name: "الاسم",
    cpr: "الرقم الشخصي",
    phone: "رقم الهاتف",
    degree: "المؤهل",
    tamkeen_status: "حالة تمكين",
    comment: "ملاحظة",
    cv: "السيرة الذاتية",
    upload_cv: "رفع السيرة الذاتية",
    added_by: "أضيف بواسطة",
    status_accepted: "مقبول",
    status_processing: "قيد المعالجة",
    status_withdrawn: "منسحب",
    status_pending: "بانتظار الموافقة",
    classes: "الفصول",
    send_to_class: "إرسال إلى الفصل",
    chat: "المحادثة",
    type_message: "اكتب رسالة…",
    already_added: "تمت إضافة هذا الطالب مسبقًا بواسطة {name}.",
    added_success: "تمت إضافة الطالب بنجاح. جارٍ التوجيه إلى دليل الطلاب…",
    confirm_delete_employee_title: "هل تريد حذف هذا المستخدم؟",
    confirm_delete_employee_body: "سيتم حذف جميع الطلاب والبيانات التي أضافها هذا المستخدم نهائيًا. لا يمكن التراجع عن هذا الإجراء.",
    yes_delete: "نعم، احذف",
    email_to_user: "إرسال بريد لهذا المستخدم",
    subject: "الموضوع",
    message: "الرسالة",
  }
};

export function getLang(){
  return localStorage.getItem("sms_lang") || "en";
}

export function applyLang(lang){
  localStorage.setItem("sms_lang", lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[lang][key]) el.textContent = dict[lang][key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[lang][key]) el.placeholder = dict[lang][key];
  });
  const langBtn = document.getElementById("lang-toggle");
  if (langBtn) langBtn.textContent = lang === "ar" ? "EN" : "AR";
}

export function t(key, vars = {}){
  const lang = getLang();
  let str = dict[lang][key] || key;
  Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
  return str;
}

export function initLangToggle(){
  applyLang(getLang());
  const btn = document.getElementById("lang-toggle");
  if (btn){
    btn.addEventListener("click", () => {
      const next = getLang() === "ar" ? "en" : "ar";
      applyLang(next);
    });
  }
}
