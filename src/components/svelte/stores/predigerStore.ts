/**
 * predigerStore.ts
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
import type { Firestore } from 'firebase/firestore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PredigerEntry {
  kuerzel: string;
  langname?: string;
  vorname?: string;
  varianten?: string[];
  avatarUrl?: string;
  localImage?: string;
  [key: string]: unknown;
}

// ---- Stores ----------------------------------------------------------------

export const predigerList = writable<PredigerEntry[] | null>(null); // null = noch nicht geladen

/** true sobald Firestore-Daten mindestens einmal geladen wurden */
export const predigerReady = writable<boolean>(false);

// ---- Firestore-Anbindung ---------------------------------------------------

let unsubscribeSnapshot: (() => void) | null = null;

/**
 * Startet den Firestore-Listener auf Collection "prediger".
 * Wird einmal aus einer Svelte-Komponente mit Firebase-Zugang aufgerufen.
 */
export function initPredigerStore(db: Firestore): void {
  if (unsubscribeSnapshot) return; // bereits aktiv
  if (typeof window === 'undefined') return; // kein SSR
  _startListener(db);
}

async function _startListener(db: Firestore): Promise<void> {
  const { collection, onSnapshot } = await import('firebase/firestore');

  const col = collection(db, 'prediger');

  unsubscribeSnapshot = onSnapshot(
    col,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: PredigerEntry[] = snapshot.docs.map((d) => ({ ...d.data() } as PredigerEntry));
        predigerList.set(list);
        predigerReady.set(true);
      }
    },
    (error) => {
      console.error('predigerStore: onSnapshot Fehler:', error);
    }
  );
}

// ---- Hilfsfunktionen -------------------------------------------------------

/**
 * Gibt das Kürzel zurück, dessen Name-Variante in `text` vorkommt.
 */
export function getPredigerKuerzelFromStore(text: string): string {
  if (!text) return '';
  const list = get(predigerList);
  if (!list) return '';
  const upper = text.toUpperCase();
  for (const p of list) {
    for (const v of (p.varianten ?? [])) {
      if (upper.includes(v.toUpperCase())) return p.kuerzel;
    }
  }
  return '';
}

/**
 * Gibt den langen Namen für ein Kürzel zurück.
 */
export function getLongNameFromStore(kuerzel: string): string {
  if (!kuerzel) return '';
  const list = get(predigerList);
  if (list) {
    const found = list.find((p) => p.kuerzel === kuerzel);
    if (found?.langname) return found.langname;
  }
  return kuerzel;
}
