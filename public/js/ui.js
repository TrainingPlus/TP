// =========================================================
// Shared UI chrome: header, footer, toasts, tiny modal helper
// =========================================================
import { auth, db } from "./firebase-config.js";
import { logout } from "./auth.js";
import { initLangToggle, t } from "./i18n.js";
import {
  collection, query, where, orderBy, limit, getDocs, or
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const NAV = {
  employee: [
    { href: "/employee/dashboard.html", key: "nav_home" },
    { href: "/employee/dashboard.html#directory", key: "nav_directory" },
  ],
  operator: [
    { href: "/operator/dashboard.html", key: "nav_home" },
    { href: "/operator/courses.html", key: "nav_courses" },
  ],
  manager: [
    { href: "/manager/dashboard.html", key: "nav_home" },
    { href: "/manager/courses.html", key: "nav_courses" },
    { href: "/manager/employees.html", key: "nav_employees" },
  ],
};

export function renderHeader(role, profile, activeHref = ""){
  const host = document.getElementById("app-header");
  if (!host) return;
  const navItems = (NAV[role] || []).map(n =>
    `<a href="${n.href}" class="${activeHref === n.href ? "active" : ""}" data-i18n="${n.key}">${t(n.key)}</a>`
  ).join("");

  host.className = "app-header";
  host.innerHTML = `
    <div class="brand"><span class="dot"></span> <span data-i18n="brand">${t("brand")}</span></div>
    <nav class="app-nav">${navItems}</nav>
    <div class="header-search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
      <input id="global-search" type="text" data-i18n-placeholder="search_placeholder" placeholder="${t("search_placeholder")}" autocomplete="off">
    </div>
    <div class="header-actions">
      ${role === "employee" ? `<button class="icon-btn" id="export-directory-btn" title="${t("download_excel")}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>
      </button>` : ""}
      <button class="icon-btn lang-btn" id="lang-toggle">AR</button>
      <div class="account-menu">
        <button class="avatar-btn" id="account-btn">
          <img src="${profile.photoURL || "https://www.gravatar.com/avatar?d=mp"}" alt="">
        </button>
        <div class="dropdown" id="account-dropdown">
          <div class="who">
            <div class="name">${profile.name}</div>
            <div class="email" data-i18n="signed_in_as">${t("signed_in_as")}</div>
            <div class="email">${profile.email}</div>
          </div>
          <button class="item danger" id="logout-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            <span data-i18n="logout">${t("logout")}</span>
          </button>
        </div>
      </div>
    </div>
  `;

  initLangToggle();

  const accountBtn = document.getElementById("account-btn");
  const dropdown = document.getElementById("account-dropdown");
  accountBtn.addEventListener("click", (e) => { e.stopPropagation(); dropdown.classList.toggle("open"); });
  document.addEventListener("click", () => dropdown.classList.remove("open"));

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await logout();
    window.location.href = "/index.html";
  });

  wireGlobalSearch(role);
}

function wireGlobalSearch(role){
  const input = document.getElementById("global-search");
  if (!input) return;
  let box;
  input.addEventListener("input", async () => {
    const val = input.value.trim();
    if (box) box.remove();
    if (!val) return;
    const results = await searchStudents(val);
    box = document.createElement("div");
    box.className = "dropdown open";
    box.style.position = "fixed";
    const rect = input.getBoundingClientRect();
    box.style.top = (rect.bottom + 6) + "px";
    box.style.left = rect.left + "px";
    box.style.width = rect.width + "px";
    box.innerHTML = results.length
      ? results.map(r => `<button class="item" data-id="${r.id}"><b>${r.name}</b>&nbsp; <span class="muted">${r.cpr || ""} ${r.phone || ""}</span></button>`).join("")
      : `<div style="padding:10px;color:var(--text-dim);font-size:13px;">No matches</div>`;
    document.body.appendChild(box);
    box.querySelectorAll(".item").forEach(btn => {
      btn.addEventListener("click", () => {
        window.location.href = `/${role}/student.html?id=${btn.dataset.id}`;
      });
    });
  });
}

async function searchStudents(term){
  const col = collection(db, "students");
  const snaps = await getDocs(query(col, limit(200)));
  const results = [];
  snaps.forEach(d => {
    const s = d.data();
    const hay = `${s.name || ""} ${s.cpr || ""} ${s.phone || ""}`.toLowerCase();
    if (hay.includes(term.toLowerCase())) results.push({ id: d.id, ...s });
  });
  return results.slice(0, 8);
}

export function renderFooter(){
  const host = document.getElementById("app-footer");
  if (!host) return;
  host.className = "app-footer";
  host.innerHTML = `<span id="footer-clock"></span><span>Student Management System</span>`;
  const clock = document.getElementById("footer-clock");
  const tick = () => {
    const now = new Date();
    clock.textContent = now.toLocaleString(undefined, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  };
  tick();
  setInterval(tick, 1000);
}

export function toast(message, type = "default"){
  let stack = document.getElementById("toast-stack");
  if (!stack){
    stack = document.createElement("div");
    stack.id = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

/** Simple confirm modal. Returns a Promise<boolean>. */
export function confirmModal(title, body, confirmLabel = "Confirm"){
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop open";
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-head"><h3>${title}</h3></div>
        <div class="modal-body">${body}</div>
        <div class="modal-foot">
          <button class="btn" id="modal-cancel">${t("cancel")}</button>
          <button class="btn btn-danger" id="modal-confirm">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.querySelector("#modal-cancel").onclick = () => { backdrop.remove(); resolve(false); };
    backdrop.querySelector("#modal-confirm").onclick = () => { backdrop.remove(); resolve(true); };
  });
}
