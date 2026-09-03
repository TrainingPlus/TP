// =========================================================
// Floating chat widget (WhatsApp-style: DMs are private,
// "General" group is visible to everyone).
//
// Firestore layout:
//   chatThreads/{threadId} { isGroup, participants:[uid,...], name?, updatedAt }
//   chatThreads/{threadId}/messages/{msgId}
//        { sender, senderName, text, fileURL, fileName, fileType,
//          student: {id,name,cpr,phone,tamkeenStatus} | null, createdAt }
//
// DM thread id = the two uids sorted & joined with "_"
// Group thread id = "general" (all active users)
// =========================================================
import { auth, db, storage } from "./firebase-config.js";
import {
  collection, doc, setDoc, addDoc, updateDoc, arrayUnion,
  query, orderBy, onSnapshot, serverTimestamp, getDocs, where
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import { t } from "./i18n.js";

const EMOJIS = ["😀","😂","😍","👍","🙏","🎉","😢","🔥","✅","❌","📌","📎","😅","🤔","👏","🚀"];

let currentUid = null;
let currentThreadId = "general";
let unsubscribeMsgs = null;
let contacts = [];

export async function initChat(profile, uid){
  currentUid = uid;
  injectMarkup();
  await ensureGeneralMembership(uid);
  await loadContacts(uid);
  openThread("general", "General");
  wireGlobalDropTargetsForStudents();
}

function injectMarkup(){
  const launcher = document.createElement("button");
  launcher.id = "chat-launcher";
  launcher.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg><span class="unread hidden" id="chat-unread">0</span>`;
  document.body.appendChild(launcher);

  const panel = document.createElement("div");
  panel.id = "chat-panel";
  panel.innerHTML = `
    <div class="chat-head">
      <strong data-i18n="chat">${t("chat")}</strong>
      <button id="chat-close">✕</button>
    </div>
    <div class="chat-body">
      <div class="chat-list" id="chat-contact-list"></div>
      <div class="chat-thread">
        <div class="chat-msgs" id="chat-msgs"></div>
        <div class="chat-input">
          <button id="emoji-btn" title="Emoji">🙂</button>
          <input type="text" id="chat-text" data-i18n-placeholder="type_message" placeholder="${t("type_message")}">
          <label style="cursor:pointer;" title="Attach file">
            📎<input type="file" id="chat-file" style="display:none">
          </label>
          <button id="chat-send" title="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
        <div id="emoji-picker" class="hidden" style="display:none;flex-wrap:wrap;gap:4px;padding:8px;border-top:1px solid var(--line);"></div>
      </div>
    </div>`;
  document.body.appendChild(panel);

  document.getElementById("chat-launcher").addEventListener("click", () => {
    panel.classList.toggle("open");
    document.getElementById("chat-unread").classList.add("hidden");
  });
  document.getElementById("chat-close").addEventListener("click", () => panel.classList.remove("open"));

  const emojiPicker = document.getElementById("emoji-picker");
  emojiPicker.innerHTML = EMOJIS.map(e => `<button style="border:0;background:none;font-size:18px;cursor:pointer;">${e}</button>`).join("");
  emojiPicker.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      document.getElementById("chat-text").value += b.textContent;
    });
  });
  document.getElementById("emoji-btn").addEventListener("click", () => {
    emojiPicker.style.display = emojiPicker.style.display === "none" ? "flex" : "none";
  });

  document.getElementById("chat-send").addEventListener("click", sendTextMessage);
  document.getElementById("chat-text").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendTextMessage();
  });
  document.getElementById("chat-file").addEventListener("change", (e) => {
    if (e.target.files[0]) sendFileMessage(e.target.files[0]);
  });
}

async function ensureGeneralMembership(uid){
  const ref = doc(db, "chatThreads", "general");
  await setDoc(ref, {
    isGroup: true,
    name: "General",
    participants: arrayUnion(uid),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function loadContacts(uid){
  const snaps = await getDocs(query(collection(db, "users"), where("status", "==", "active")));
  contacts = [];
  snaps.forEach(d => { if (d.id !== uid) contacts.push({ id: d.id, ...d.data() }); });

  const list = document.getElementById("chat-contact-list");
  list.innerHTML = `<div class="contact active" data-thread="general" data-name="General">🌐 General</div>` +
    contacts.map(c => `<div class="contact" data-thread="${dmId(uid, c.id)}" data-name="${c.name}" data-other="${c.id}">${c.name}</div>`).join("");

  list.querySelectorAll(".contact").forEach(el => {
    el.addEventListener("click", async () => {
      list.querySelectorAll(".contact").forEach(x => x.classList.remove("active"));
      el.classList.add("active");
      const threadId = el.dataset.thread;
      if (threadId !== "general" && el.dataset.other){
        await setDoc(doc(db, "chatThreads", threadId), {
          isGroup: false,
          participants: [uid, el.dataset.other],
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
      openThread(threadId, el.dataset.name);
    });
  });
}

function dmId(a, b){ return [a, b].sort().join("_"); }

function openThread(threadId, name){
  currentThreadId = threadId;
  if (unsubscribeMsgs) unsubscribeMsgs();
  const msgsEl = document.getElementById("chat-msgs");
  msgsEl.innerHTML = "";
  const q = query(collection(db, "chatThreads", threadId, "messages"), orderBy("createdAt", "asc"));
  unsubscribeMsgs = onSnapshot(q, (snap) => {
    msgsEl.innerHTML = "";
    snap.forEach(d => renderMessage(d.data()));
    msgsEl.scrollTop = msgsEl.scrollHeight;
  });
}

function renderMessage(m){
  const msgsEl = document.getElementById("chat-msgs");
  const mine = m.sender === currentUid;
  const div = document.createElement("div");
  div.className = "msg" + (mine ? " mine" : "");
  let inner = "";
  if (m.student){
    inner += `<div class="student-card">
      <b>${m.student.name}</b><br>CPR: ${m.student.cpr || "-"}<br>Phone: ${m.student.phone || "-"}<br>Status: ${m.student.tamkeenStatus || "-"}
    </div>`;
  }
  if (m.fileURL){
    if ((m.fileType || "").startsWith("image/")){
      inner += `<a href="${m.fileURL}" target="_blank"><img src="${m.fileURL}" style="max-width:160px;border-radius:6px;display:block;margin-bottom:4px;"></a>`;
    } else {
      inner += `<a href="${m.fileURL}" target="_blank" style="color:inherit;text-decoration:underline;">📎 ${m.fileName || "file"}</a>`;
    }
  }
  if (m.text) inner += `<div>${escapeHTML(m.text)}</div>`;
  inner += `<div class="meta">${mine ? "You" : m.senderName}</div>`;
  div.innerHTML = inner;
  msgsEl.appendChild(div);
}

function escapeHTML(str){
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

async function sendTextMessage(){
  const input = document.getElementById("chat-text");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  await addDoc(collection(db, "chatThreads", currentThreadId, "messages"), {
    sender: currentUid,
    senderName: auth.currentUser.displayName,
    text,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, "chatThreads", currentThreadId), { updatedAt: serverTimestamp() });
}

async function sendFileMessage(file){
  const path = `chat/${currentThreadId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await addDoc(collection(db, "chatThreads", currentThreadId, "messages"), {
    sender: currentUid,
    senderName: auth.currentUser.displayName,
    fileURL: url,
    fileName: file.name,
    fileType: file.type,
    createdAt: serverTimestamp()
  });
}

/** Called with a student object to drop straight into the open thread. */
export async function sendStudentToChat(student){
  await addDoc(collection(db, "chatThreads", currentThreadId, "messages"), {
    sender: currentUid,
    senderName: auth.currentUser.displayName,
    student: {
      id: student.id, name: student.name, cpr: student.cpr,
      phone: student.phone, tamkeenStatus: student.tamkeenStatus
    },
    createdAt: serverTimestamp()
  });
}

/**
 * Lets pages make student directory rows draggable into the chat panel.
 * Call once; it listens globally for drop events over #chat-msgs.
 * Directory rows should set: row.draggable = true and
 *   row.addEventListener('dragstart', e => e.dataTransfer.setData('application/json', JSON.stringify(student)))
 */
function wireGlobalDropTargetsForStudents(){
  document.addEventListener("dragover", (e) => {
    if (e.target.closest("#chat-msgs")) e.preventDefault();
  });
  document.addEventListener("drop", async (e) => {
    if (!e.target.closest("#chat-msgs")) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const student = JSON.parse(raw);
      document.getElementById("chat-panel").classList.add("open");
      await sendStudentToChat(student);
    } catch (err) { console.warn("drop parse failed", err); }
  });
}
