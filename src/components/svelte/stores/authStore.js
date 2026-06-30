// src/components/svelte/stores/authStore.js
//
// Zentraler Auth- und Rollen-Store.
// Initialisiert Firebase einmalig, liest Rollen aus accounts/{uid} genau
// einmal pro Session und stellt sie app-weit bereit.
//
// Verwendung in Komponenten:
//
//   import { initAuth, currentUser, userRoles, authReady, hasRole } from '../stores/authStore.js';
//
//   onMount(() => initAuth());
//
//   $: loginRequired  = $authReady && !$currentUser;
//   $: accessGranted  = $authReady && $currentUser && $userRoles.includes('combolist');

import { writable, derived, get } from 'svelte/store';
import { initAppCheck } from '../firebase/firebase.js';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// ─── Public stores ────────────────────────────────────────────────────────────

/** Das eingeloggte Firebase-User-Objekt, oder null wenn nicht eingeloggt. */
export const currentUser = writable(null);

/** Array der Rollen des eingeloggten Users (aus accounts/{uid}.roles[]).
 *  Leer-Array wenn kein User eingeloggt oder kein roles-Feld vorhanden. */
export const userRoles = writable(/** @type {string[]} */ ([]));

/** Profilfelder aus accounts/{uid}: { VName, FName, ShortName, email }.
 *  Null solange kein User eingeloggt. */
export const userProfile = writable(/** @type {{ VName: string, FName: string, ShortName: string, email: string } | null} */ (null));

/** Wird true, sobald onAuthStateChanged seinen ersten Callback ausgeführt hat.
 *  Solange false: Auth-Status ist noch unbekannt → noch keinen Login-Dialog zeigen. */
export const authReady = writable(false);

// ─── Initialization guard ─────────────────────────────────────────────────────

let _initialized = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialisiert Firebase Auth + AppCheck und setzt die Stores.
 * Idempotent: mehrfache Aufrufe starten keinen zweiten Listener.
 *
 * @returns {import('firebase/auth').Auth} das Auth-Objekt (für LoginFire-Komponente)
 */
export function initAuth() {
  if (_initialized) {
    // Bereits initialisiert – Auth-Objekt aus bestehendem App zurückgeben
    const app = initAppCheck();
    return getAuth(app);
  }
  _initialized = true;

  const app = initAppCheck();
  const auth = getAuth(app);
  const db = getFirestore(app);

  onAuthStateChanged(auth, async (user) => {
    currentUser.set(user);

    if (user) {
      try {
        const snap = await getDoc(doc(db, 'accounts', user.uid));
        const data = snap.exists() ? snap.data() : {};
        const roles = data.roles ?? [];
        // combolist impliziert combo
        const effectiveRoles = roles.includes('combolist') && !roles.includes('combo')
          ? [...roles, 'combo']
          : roles;
        userRoles.set(effectiveRoles);
        userProfile.set({ VName: data.VName ?? '', FName: data.FName ?? '', ShortName: data.ShortName ?? '', email: data.email ?? user.email ?? '' });
      } catch (e) {
        console.error('authStore: Fehler beim Laden der Rollen:', e);
        userRoles.set([]);
      }
    } else {
      userRoles.set([]);
      userProfile.set(null);
    }

    authReady.set(true);
  });

  return auth;
}

/**
 * Derived store: gibt true zurück wenn der aktuelle User die angegebene Rolle hat.
 * @param {string} role
 * @returns {import('svelte/store').Readable<boolean>}
 */
export function hasRole(role) {
  return derived(userRoles, ($roles) => $roles.includes(role));
}

/**
 * Liest die Rollen des aktuell eingeloggten Users neu aus Firestore.
 * Nützlich nach einer Admin-Rollen-Änderung, damit der Store aktuell bleibt.
 */
export async function refreshUserRoles() {
  const app = initAppCheck();
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) return;

  const db = getFirestore(app);
  try {
    const snap = await getDoc(doc(db, 'accounts', user.uid));
    const roles = snap.exists() ? (snap.data().roles ?? []) : [];
    const effectiveRoles = roles.includes('combolist') && !roles.includes('combo')
      ? [...roles, 'combo']
      : roles;
    userRoles.set(effectiveRoles);
  } catch (e) {
    console.error('authStore: Fehler beim Aktualisieren der Rollen:', e);
  }
}
