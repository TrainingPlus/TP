// =========================================================
// Auth — Google Sign-In + role/approval routing
//
// Data model: collection "users", doc id = Firebase Auth uid
//   { name, email, photoURL, role: "manager"|"operator"|"employee"|null,
//     status: "pending"|"active", createdAt }
//
// The very FIRST manager must be created manually once in the
// Firestore console (role:"manager", status:"active") — see README.
// Every sign-in after that goes through the pending-approval flow.
// =========================================================
import { auth, googleProvider, db } from "./firebase-config.js";
import {
  signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";
import { functions } from "./firebase-config.js";

export async function signInWithGoogle(){
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()){
    // If the manager already pre-invited this email with a role, activate immediately.
    const inviteRef = doc(db, "invites", user.email);
    const inviteSnap = await getDoc(inviteRef);

    if (inviteSnap.exists()){
      await setDoc(ref, {
        name: user.displayName, email: user.email, photoURL: user.photoURL,
        role: inviteSnap.data().role, status: "active", createdAt: serverTimestamp()
      });
      await deleteDoc(inviteRef);
    } else {
      // brand-new, un-invited user -> create as pending, notify manager by email
      await setDoc(ref, {
        name: user.displayName, email: user.email, photoURL: user.photoURL,
        role: null, status: "pending", createdAt: serverTimestamp()
      });
      try {
        const notifyManager = httpsCallable(functions, "notifyManagerOfNewUser");
        await notifyManager({ uid: user.uid });
      } catch (e) { console.warn("notifyManagerOfNewUser failed", e); }
    }
  }
  return user;
}

export function logout(){
  return signOut(auth);
}

/**
 * Call at the top of every protected page.
 * requiredRole: "manager" | "operator" | "employee" | null (any active role)
 * Redirects automatically if not signed in / not approved / wrong role.
 */
export function guardPage(requiredRole, onReady){
  onAuthStateChanged(auth, async (user) => {
    if (!user){
      window.location.href = "/index.html";
      return;
    }
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()){
      window.location.href = "/index.html";
      return;
    }
    const profile = snap.data();
    if (profile.status !== "active"){
      window.location.href = "/pending.html";
      return;
    }
    if (requiredRole && profile.role !== requiredRole){
      // send them to their own dashboard instead of blocking hard
      window.location.href = `/${profile.role}/dashboard.html`;
      return;
    }
    onReady(user, profile);
  });
}
