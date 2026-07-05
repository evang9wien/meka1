/**
 * PredigtConstants.js
 *
 * Verwaltet lokale Avatar-Bilddateien für Prediger.
 * Alle Prediger-Stammdaten (Namen, Kürzel, Varianten) werden zur Laufzeit
 * aus der Firestore Collection "prediger" geladen (→ predigerStore.js).
 *
 * localImage-Feld in Firestore:
 *   Dateiname eines Bildes aus /assets/images/avatar/ (z.B. "stefan-Avatar.png").
 *   Um ein neues Bild zu unterstützen: PNG in diesen Ordner legen, dann den
 *   Dateinamen in Firestore unter `localImage` eintragen — fertig.
 */

// Alle PNGs aus dem Avatar-Ordner per Glob importieren.
// Vite verarbeitet damit automatisch jede neue Datei im Ordner.
const avatarModules = import.meta.glob(
  '../../../assets/images/avatar/*.png',
  { eager: true }
);

// Dateiname → build-verarbeitete URL  (z.B. "stefan-Avatar.png" → "/_astro/stefan-Avatar.XXX.png")
const avatarByFilename = Object.fromEntries(
  Object.entries(avatarModules).map(([path, mod]) => {
    const filename = path.split('/').at(-1);
    return [filename, mod.default?.src ?? mod.default ?? ''];
  })
);

// ─── Exports ─────────────────────────────────────────────────────────────────

/**
 * Gibt die build-verarbeitete Avatar-URL für einen Dateinamen zurück,
 * der im Firestore-Dokument unter `localImage` gespeichert ist.
 * Gibt null zurück wenn die Datei nicht im Avatar-Ordner gefunden wird.
 *
 * @param {string} filename  z.B. "stefan-Avatar.png"
 * @returns {string|null}
 */
export function resolveLocalAvatarSrc(filename) {
  if (!filename) return null;
  return avatarByFilename[filename] ?? null;
}

/**
 * Gibt die Avatar-URL für einen Vornamen zurück (Kalender-Lookup).
 * Sucht nach einer Datei deren Name den Vornamen enthält.
 *
 * @param {string} vorname  z.B. "Stefan"
 * @returns {string|null}
 */
export function getLocalAvatarByVorname(vorname) {
  if (!vorname) return null;
  const lower = vorname.toLowerCase();
  const entry = Object.entries(avatarByFilename).find(([name]) =>
    name.toLowerCase().includes(lower)
  );
  return entry?.[1] ?? null;
}
