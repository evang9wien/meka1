/**
 * predigerStore.js
 *
 * Lädt die Prediger-Stammdaten aus Firestore (Collection "prediger")
 * und stellt sie als reaktiven Svelte-Store bereit.
 *
 * Firestore Collection: prediger/{kuerzel}
 *   kuerzel:    string      z.B. "SFJ"
 *   langname:   string      z.B. "Pfarrer Stefan Fleischner-Janits"
 *   vorname:    string      z.B. "Stefan"
 *   varianten:  string[]    Name-Varianten wie im Google Kalender
 *   avatarUrl:  string      Download-URL aus Firebase Storage (oder '')
 *   localImage: string      Dateiname des lokalen Avatarbildes (oder ''),
 *                           z.B. "stefan-Avatar.png". Wenn gesetzt, wird das
 *                           lokale Bild aus /assets/images/avatar/ verwendet.
 */

import { writable, get } from 'svelte/store';

// ---- Stores ----------------------------------------------------------------

/** @type {import('svelte/store').Writable<Array|null>} */
export const predigerList = writable(null); // null = noch nicht geladen

/** true sobald Firestore-Daten mindestens einmal geladen wurden */
export const predigerReady = writable(false);

// ---- Firestore-Anbindung ---------------------------------------------------

let unsubscribeSnapshot = null;

/**
 * Startet den Firestore-Listener auf Collection "prediger".
 * Wird einmal aus einer Svelte-Komponente mit Firebase-Zugang aufgerufen.
 *
 * @param {import('firebase/firestore').Firestore} db  Firestore-Instanz
 */
export function initPredigerStore(db) {
  if (unsubscribeSnapshot) return; // bereits aktiv
  if (typeof window === 'undefined') return; // kein SSR
  _startListener(db);
}

async function _startListener(db) {
  const { collection, onSnapshot } = await import('firebase/firestore');

  const col = collection(db, 'prediger');

  unsubscribeSnapshot = onSnapshot(
    col,
    (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map((d) => ({ ...d.data() }));
        predigerList.set(list);
        predigerReady.set(true);
      }
      // Leere Collection → Store bleibt null, kein automatisches Seeden mehr.
    },
    (error) => {
      console.error('predigerStore: onSnapshot Fehler:', error);
      // Kein statischer Fallback mehr — Store bleibt null.
    }
  );
}

// ---- Hilfsfunktionen -------------------------------------------------------

/**
 * Gibt das Kürzel zurück, dessen Name-Variante in `text` vorkommt.
 * @param {string} text
 * @returns {string}
 */
export function getPredigerKuerzelFromStore(text) {
  if (!text) return '';
  const list = get(predigerList);
  if (!list) return '';
  const upper = text.toUpperCase();
  for (const p of list) {
    for (const v of (p.varianten || [])) {
      if (upper.includes(v.toUpperCase())) return p.kuerzel;
    }
  }
  return '';
}

/**
 * Gibt den langen Namen für ein Kürzel zurück.
 * @param {string} kuerzel
 * @returns {string}
 */
export function getLongNameFromStore(kuerzel) {
  if (!kuerzel) return '';
  const list = get(predigerList);
  if (list) {
    const found = list.find((p) => p.kuerzel === kuerzel);
    if (found?.langname) return found.langname;
  }
  return kuerzel;
}
