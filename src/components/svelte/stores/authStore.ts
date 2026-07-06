// src/components/svelte/stores/authStore.ts
//
// Zentraler Auth- und Rollen-Store.
// Initialisiert Firebase einmalig, liest Rollen aus accounts/{uid} genau
// einmal pro Session und stellt sie app-weit bereit.
//
// Verwendung in Komponenten:
//
//   import { initAuth, currentUser, userRoles, authReady, hasRole } from '../stores/authStore.ts';
//
//   onMount(() => initAuth());
//
//   $: loginRequired  = $authReady && !$currentUser;
//   $: accessGranted  = $authReady && $currentUser && $userRoles.includes('combolist');

import { writable, derived, type Readable } from 'svelte/store';
import { initAppCheck, getDb } from '../firebase/firebase.ts';
import { getAuth, onAuthStateChanged, type Auth, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  VName: string;
  FName: string;
  ShortName: string;
  email: string;
}

// ─── Public stores ────────────────────────────────────────────────────────────

/** Das eingeloggte Firebase-User-Objekt, oder null wenn nicht eingeloggt. */
export const currentUser = writable<User | null>(null);

/** Array der Rollen des eingeloggten Users (aus accounts/{uid}.roles[]).
 *  Leer-Array wenn kein User eingeloggt oder kein roles-Feld vorhanden. */
export const userRoles = writable<string[]>([]);

/** Profilfelder aus accounts/{uid}: { VName, FName, ShortName, email }.
 *  Null solange kein User eingeloggt. */
export const userProfile = writable<UserProfile | null>(null);

/** Wird true, sobald onAuthStateChanged seinen ersten Callback ausgeführt hat.
 *  Solange false: Auth-Status ist noch unbekannt → noch keinen Login-Dialog zeigen. */
export const authReady = writable<boolean>(false);

// ─── Initialization guard ─────────────────────────────────────────────────────

let _initialized = false;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialisiert Firebase Auth + AppCheck und setzt die Stores.
 * Idempotent: mehrfache Aufrufe starten keinen zweiten Listener.
 *
 * @returns das Auth-Objekt (für LoginFire-Komponente)
 */
export function initAuth(): Auth {
  if (_initialized) {
    const app = initAppCheck();
    return getAuth(app);
  }
  _initialized = true;

  const app = initAppCheck();
  const auth = getAuth(app);
  const db = getDb();

  onAuthStateChanged(auth, async (user) => {
    currentUser.set(user);

    if (user) {
      try {
        const snap = await getDoc(doc(db, 'accounts', user.uid));
        const data = snap.exists() ? snap.data() : {};
        const roles: string[] = data['roles'] ?? [];
        // combolist impliziert combo
        const effectiveRoles = roles.includes('combolist') && !roles.includes('combo')
          ? [...roles, 'combo']
          : roles;
        userRoles.set(effectiveRoles);
        userProfile.set({
          VName: data['VName'] ?? '',
          FName: data['FName'] ?? '',
          ShortName: data['ShortName'] ?? '',
          email: data['email'] ?? user.email ?? '',
        });
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
 */
export function hasRole(role: string): Readable<boolean> {
  return derived(userRoles, ($roles) => $roles.includes(role));
}

/**
 * Liest die Rollen des aktuell eingeloggten Users neu aus Firestore.
 * Nützlich nach einer Admin-Rollen-Änderung, damit der Store aktuell bleibt.
 */
export async function refreshUserRoles(): Promise<void> {
  const app = initAppCheck();
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) return;

  const db = getDb();
  try {
    const snap = await getDoc(doc(db, 'accounts', user.uid));
    const roles: string[] = snap.exists() ? (snap.data()['roles'] ?? []) : [];
    const effectiveRoles = roles.includes('combolist') && !roles.includes('combo')
      ? [...roles, 'combo']
      : roles;
    userRoles.set(effectiveRoles);
  } catch (e) {
    console.error('authStore: Fehler beim Aktualisieren der Rollen:', e);
  }
}
