/**
 * predigerStore.js
 *
 * Lädt die Prediger-Stammdaten aus Firestore (Collection "prediger")
 * und stellt sie als reaktiven Svelte-Store bereit.
 *
 * Firestore Collection: prediger/{kuerzel}
 *   kuerzel:   string      z.B. "SFJ"
 *   langname:  string      z.B. "Pfarrer Stefan Fleischner-Janits"
 *   vorname:   string      z.B. "Stefan"  (für Avatar-Lookup in Calendar)
 *   varianten: string[]    Name-Varianten wie im Google Kalender
 *   avatarUrl: string      Download-URL aus Firebase Storage (oder '')
 *
 * Hinweis: Die Collection heißt "prediger", nicht "combo/prediger" —
 * Prediger-Stammdaten sind unabhängig vom Combo-Bereich.
 */

import { writable, get } from 'svelte/store';
import { PREDIGER as STATIC_PREDIGER } from '../predigt/PredigtConstants.js';

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
  const { collection, onSnapshot, doc, setDoc } = await import('firebase/firestore');

  const col = collection(db, 'prediger');

  unsubscribeSnapshot = onSnapshot(
    col,
    async (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map((d) => ({ ...d.data() }));
        predigerList.set(list);
        predigerReady.set(true);
      } else {
        // Collection leer → einmalig mit statischen Daten seeden
        try {
          await _seedFromStatic(db, doc, setDoc);
          // onSnapshot feuert danach erneut mit den neuen Docs
        } catch (e) {
          console.error('predigerStore: Seed fehlgeschlagen:', e);
          // Fallback: statische Daten direkt in den Store laden
          _loadStaticFallback();
        }
      }
    },
    (error) => {
      // Firestore-Zugriffsfehler (z.B. Security Rules) → statischer Fallback
      console.error('predigerStore: onSnapshot Fehler:', error);
      _loadStaticFallback();
    }
  );
}

/** Lädt die statischen Prediger direkt in den Store (kein Firestore-Schreiben). */
function _loadStaticFallback() {
  const list = STATIC_PREDIGER.map((p) => ({
    kuerzel:   p.kuerzel,
    langname:  p.langname || '',
    vorname:   p.vornamen[0],
    varianten: p.varianten,
    avatarUrl: '',
  }));
  predigerList.set(list);
  predigerReady.set(true);
  console.warn('predigerStore: Statischer Fallback aktiv — Firestore nicht erreichbar.');
}

/**
 * Schreibt die statischen Prediger einmalig in Firestore.
 */
async function _seedFromStatic(db, doc, setDoc) {
  for (const p of STATIC_PREDIGER) {
    const entry = {
      kuerzel:   p.kuerzel,
      langname:  p.langname || '',
      vorname:   p.vornamen[0],
      varianten: p.varianten,
      avatarUrl: '',
    };
    await setDoc(doc(db, 'prediger', p.kuerzel), entry);
  }
}

// ---- Hilfsfunktionen -------------------------------------------------------

/**
 * Gibt das Kürzel zurück, dessen Name-Variante in `text` vorkommt.
 * Verwendet Store-Daten wenn vorhanden, sonst statischen Fallback.
 * @param {string} text
 * @returns {string}
 */
export function getPredigerKuerzelFromStore(text) {
  if (!text) return '';
  const list = get(predigerList);
  const source = list ?? STATIC_PREDIGER;
  const upper = text.toUpperCase();
  for (const p of source) {
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
  const list = get(predigerList);
  if (list) {
    const found = list.find((p) => p.kuerzel === kuerzel);
    if (found) return found.langname || kuerzel;
  }
  const staticP = STATIC_PREDIGER.find((p) => p.kuerzel === kuerzel);
  return staticP ? (staticP.langname || kuerzel) : kuerzel;
}

/**
 * Gibt die Avatar-URL für ein Kürzel zurück.
 * @param {string} kuerzel
 * @returns {string}
 */
export function getAvatarUrlFromStore(kuerzel) {
  const list = get(predigerList);
  if (list) {
    const found = list.find((p) => p.kuerzel === kuerzel);
    if (found) return found.avatarUrl || '';
  }
  return '';
}

/**
 * Gibt den Vornamen für ein Kürzel zurück (für Avatar-Lookup in Calendar).
 * @param {string} kuerzel
 * @returns {string}
 */
export function getVornameFromStore(kuerzel) {
  const list = get(predigerList);
  if (list) {
    const found = list.find((p) => p.kuerzel === kuerzel);
    if (found) return found.vorname || '';
  }
  const staticP = STATIC_PREDIGER.find((p) => p.kuerzel === kuerzel);
  return staticP ? staticP.vornamen[0] : '';
}
