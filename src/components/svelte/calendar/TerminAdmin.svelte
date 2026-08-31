<script lang="ts">
  import { onMount } from 'svelte';
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';

  import {
    Card,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
    Input,
    Select,
    Textarea,
    Button,
    GradientButton,
    Badge,
    Toggle,
    Alert,
    Spinner,
    ButtonGroup,
    Modal,
  } from 'flowbite-svelte';
  import {
    TrashBinOutline,
    FolderPlusOutline,
    CheckCircleSolid,
    ExclamationCircleOutline,
    CalendarMonthOutline,
    PlusOutline,
    EditOutline,
    CloseOutline,
    ArrowsRepeatOutline,
  } from 'flowbite-svelte-icons';
  import PredigtAvatar from '../predigt/PredigtAvatar.svelte';
  import { resolveLocalAvatarSrc } from '../predigt/PredigtConstants.ts';

  const kreuzSrc = resolveLocalAvatarSrc('kreuz-bunt.svg') ?? '';
  const musikSrc = resolveLocalAvatarSrc('musik.png') ?? '';

  import { getDatabase, ref as dbref, set, remove, query, orderByKey, startAt, onValue } from 'firebase/database';
  import { doc, getDoc } from 'firebase/firestore';
  import { initAuth, currentUser, authReady } from '../stores/authStore.ts';
  import { initAppCheck, getDb } from '../firebase/firebase.ts';
  import { predigerList, initPredigerStore } from '../stores/predigerStore.ts';
  import WaitPopup from '../popup/WaitPopup.svelte';
  import LoginFirebase from '../auth/LoginFirebase.svelte';

  dayjs.extend(utc);
  dayjs.extend(timezone);

  // ---------------------------------------------------------------------------
  // Konstanten
  // ---------------------------------------------------------------------------
  const calendarId = '095lkf9ujgaa4u1qmi4e2vf00k@group.calendar.google.com';
  const GOOGLE_CLIENT_ID =
    '110813316877-n4lna4ahat5ttf51mrvu22s8eb4dncdt.apps.googleusercontent.com';
  const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
  const GOOGLE_API_KEY = 'AIzaSyBU0NT8Jy8m_2UkJdThdIs1Ee0lL9ZzVus';

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let dbRealtime: any;
  let dbFireStore: any;
  let terminAdminRole = false;
  let dataLoaded = false;
  let popupSpinnerModal = false;
  let googleTokenClient: any = null;
  let googleAccessToken: string = '';
  let googleSignedIn = false;
  let googleConnectModalOpen = false;
  let pendingAction: (() => void) | null = null;
  let deleteConfirmIdx: number | null = null;
  let deleteConfirmOpen = false;
  let savingIdx: number | null = null;
  let newRowsTyp: TerminTyp | null = null;
  // Google-Calendar-Events (ab heute) als Map timestamp → event, für Abgleich
  let gcalEvents: Map<string, any> = new Map();
  let gcalLoading = false;
  $: gcalTimestamps = new Set(gcalEvents.keys());

  // Filter: 'ALL' | 'GD' | 'CP'
  type FilterTyp = 'ALL' | 'GD' | 'CP';
  let filterTyp: FilterTyp = 'ALL';

  // ---------------------------------------------------------------------------
  // TerminRow
  // ---------------------------------------------------------------------------
  type TerminTyp = 'GD' | 'CP';

  interface TerminRow {
    datum: string;            // YYYY-MM-DD
    uhrzeit: string;          // HH:mm
    typ: TerminTyp;
    lektor: string;           // Kürzel aus predigerList, oder 'GAST'
    gastName: string;         // Freitext-Name bei lektor === 'GAST'
    abendmahl: boolean;
    kommentar: string;
    saved: boolean;           // wurde gerade erfolgreich gespeichert (neue Zeile)
    error: string;
    isNew: boolean;           // true = neu anzulegen, false = aus Firebase geladen
    editing: boolean;         // true = Edit-Mode bei bestehenden
    originalTimestamp: string;// ursprünglicher Firebase-Key (für Umbenennung)
    // Instrument-Felder aus Firebase erhalten (beim Edit nicht überschreiben)
    _instruments: Record<string, string>;
  }

  function defaultUhrzeit(typ: TerminTyp) {
    return typ === 'GD' ? '10:00' : '17:30';
  }

  function createNewRow(datum = '', typ: TerminTyp = 'GD'): TerminRow {
    return {
      datum,
      uhrzeit: defaultUhrzeit(typ),
      typ,
      lektor: '',
      gastName: '',
      abendmahl: false,
      kommentar: '',
      saved: false,
      error: '',
      isNew: true,
      editing: true,
      originalTimestamp: '',
      _instruments: {},
    };
  }

  // Extrahiert Gastnamen aus Zusatzinfo ("Gast: Max Mustermann, ..." → "Max Mustermann")
  function extractGastName(zusatzinfo: string): string {
    const m = zusatzinfo?.match(/^Gast:\s*([^,\n]+)/);
    return m ? m[1].trim() : '';
  }

  // Entfernt den Gast-Präfix aus Zusatzinfo für Kommentar-Feld
  function stripGastPrefix(zusatzinfo: string): string {
    return (zusatzinfo ?? '').replace(/^Gast:\s*[^,\n]+(,\s*)?/, '').trim();
  }

  function firebaseEntryToRow(entry: any): TerminRow {
    const ts: string = entry.Termin ?? '';
    const [datePart, timePart] = ts.split(' ');
    const uhrzeit = timePart ? timePart.substring(0, 5) : '10:00';
    const typ: TerminTyp = entry.Veranstaltung === 'CP' ? 'CP' : 'GD';
    const rawLektor = entry.Verantwortlich === 'COM' ? '' : (entry.Verantwortlich ?? '');
    const isGast = rawLektor === 'GAST';
    return {
      datum: datePart ?? '',
      uhrzeit,
      typ,
      lektor: rawLektor,
      gastName: isGast ? extractGastName(entry.Zusatzinfo ?? '') : '',
      abendmahl: entry.Abendmahl === '1',
      kommentar: isGast ? stripGastPrefix(entry.Zusatzinfo ?? '') : (entry.Zusatzinfo ?? ''),
      saved: false,
      error: '',
      isNew: false,
      editing: false,
      originalTimestamp: ts,
      _instruments: {
        Bass:           entry.Bass           ?? '',
        Combo:          entry.Combo          ?? '1',
        Drums:          entry.Drums          ?? '',
        Gitarre:        entry.Gitarre        ?? '',
        KS_Koordination:entry.KS_Koordination?? '',
        Melodie:        entry.Melodie        ?? '',
        Tasten:         entry.Tasten         ?? '',
      },
    };
  }

  // Alle Zeilen (neue + geladene), sortiert nach Datum
  let rows: TerminRow[] = [];

  // Gefilterte Zeilen für die Tabelle
  $: filteredRows = filterTyp === 'ALL'
    ? rows
    : rows.filter((r) => r.typ === filterTyp);

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------------------

  function toTimestamp(datum: string, uhrzeit: string): string {
    return dayjs.tz(`${datum} ${uhrzeit}`, 'Europe/Vienna').format('YYYY-MM-DD HH:mm:ss');
  }

  function toGoogleDateTimeString(datum: string, uhrzeit: string): string {
    return dayjs.tz(`${datum} ${uhrzeit}`, 'Europe/Vienna').format();
  }

  function buildFirebasePayload(row: TerminRow) {
    const timestamp = toTimestamp(row.datum, row.uhrzeit);
    const instruments = row.isNew
      ? { Bass: '', Combo: '1', Drums: '', Gitarre: '', KS_Koordination: '', Melodie: '', Tasten: '' }
      : row._instruments;

    if (row.typ === 'CP') {
      return {
        ...instruments,
        Abendmahl: '',
        Termin: timestamp,
        Veranstaltung: 'CP',
        Verantwortlich: 'COM',
        Zusatzinfo: row.kommentar,
      };
    }
    // Gast: Verantwortlich = 'GAST', Gastname vorne in Zusatzinfo
    const zusatzinfo = row.lektor === 'GAST' && row.gastName
      ? `Gast: ${row.gastName}${row.kommentar ? ', ' + row.kommentar : ''}`
      : row.kommentar;
    return {
      ...instruments,
      Abendmahl: row.abendmahl ? '1' : '0',
      Termin: timestamp,
      Veranstaltung: 'GD',
      Verantwortlich: row.lektor || '',
      Zusatzinfo: zusatzinfo,
    };
  }

  function buildGoogleDescription(row: TerminRow): string {
    if (row.typ === 'CP') return '';
    const isGast = row.lektor === 'GAST';
    const lektorEntry = ($predigerList ?? []).find((p) => p.kuerzel === row.lektor);
    const lektorVariante = isGast
      ? (row.gastName || 'Gast')
      : (lektorEntry?.varianten?.[0] ?? row.lektor);
    // For guest rows: strip the gastName from kommentar in case old data duplicated it there
    const kommentar = isGast && row.gastName
      ? row.kommentar
          .replace(new RegExp(row.gastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*,?\\s*', 'gi'), '')
          .replace(/^[\s,]+|[\s,]+$/g, '')
          .trim()
      : row.kommentar;
    const lines: string[] = [];
    if (lektorVariante) lines.push(lektorVariante);
    if (row.abendmahl) lines.push('~ Y');
    if (kommentar) lines.push(kommentar);
    return lines.join('\n');
  }

  function buildGoogleEvent(row: TerminRow) {
    const start = toGoogleDateTimeString(row.datum, row.uhrzeit);
    const durMin = row.typ === 'GD' ? 75 : 120;
    const end = dayjs.tz(`${row.datum} ${row.uhrzeit}`, 'Europe/Vienna').add(durMin, 'minute').format();
    const summary = row.typ === 'GD' ? 'Sonntagsgottesdienst' : 'Comboprobe';
    return {
      summary,
      description: buildGoogleDescription(row),
      start: { dateTime: start, timeZone: 'Europe/Vienna' },
      end: { dateTime: end, timeZone: 'Europe/Vienna' },
    };
  }

  // ---------------------------------------------------------------------------
  // Typ-Änderung: alle neuen (nicht gespeicherten) Zeilen umschalten
  // ---------------------------------------------------------------------------
  function applyTypToAllNew(typ: TerminTyp) {
    newRowsTyp = typ;
    rows = rows.map((r) => {
      if (!r.isNew || r.saved) return r;
      const uhrzeitNeedsUpdate = r.uhrzeit === '10:00' || r.uhrzeit === '17:30';
      return {
        ...r,
        typ,
        uhrzeit: uhrzeitNeedsUpdate ? defaultUhrzeit(typ) : r.uhrzeit,
        lektor: typ === 'CP' ? '' : r.lektor,
        abendmahl: typ === 'CP' ? false : r.abendmahl,
      };
    });
  }

  function onTypChange(globalIdx: number) {
    const row = rows[globalIdx];
    const current = row.uhrzeit;
    if (current === '10:00' || current === '17:30') {
      rows[globalIdx].uhrzeit = defaultUhrzeit(row.typ);
    }
    if (row.typ === 'CP') {
      rows[globalIdx].lektor = '';
      rows[globalIdx].abendmahl = false;
    }
    rows = [...rows];
  }

  // ---------------------------------------------------------------------------
  // Google Calendar OAuth
  // ---------------------------------------------------------------------------
  function initGoogleSignIn() {
    if (typeof window === 'undefined') return;
    if (!(window as any).google) return;
    googleTokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPE,
      callback: (tokenResponse: any) => {
        if (tokenResponse?.access_token) {
          googleAccessToken = tokenResponse.access_token;
          googleSignedIn = true;
          if (pendingAction) {
            const fn = pendingAction;
            pendingAction = null;
            fn();
          }
        }
      },
    });
  }

  function requestGoogleToken() {
    if (googleTokenClient) googleTokenClient.requestAccessToken({ prompt: '' });
    googleConnectModalOpen = false;
  }

  // Lädt alle GCal-Events ab heute (read-only, API key) für Abgleich
  async function loadGcalTimestamps() {
    gcalLoading = true;
    try {
      const timeMin = dayjs().startOf('day').toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
        + `?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&maxResults=500&singleEvents=true&orderBy=startTime`;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const data = await resp.json();
      const map = new Map<string, any>();
      for (const e of (data.items ?? [])) {
        const start = e.start?.dateTime || e.start?.date;
        if (!start) continue;
        const ts = dayjs(start).tz('Europe/Vienna').format('YYYY-MM-DD HH:mm:ss');
        map.set(ts, e);
      }
      gcalEvents = map;
    } catch (e) { console.error('GCal fetch Fehler:', e); }
    finally { gcalLoading = false; }
  }

  // ---------------------------------------------------------------------------
  // GCal-Beschreibungs-Parser (identisch mit TerminCopy-Logik)
  // ---------------------------------------------------------------------------

  // Titel die aus der Beschreibung entfernt werden
  const REMOVE_TITLES_DIFF = [
    /Pf(?:arrer(?:in)?)?\.?\s*i\.?\s*[Rr]\.?\s*,?/gi,
    /Pfarrerin\s*,?/gi,
    /Pfarrer\s*,?/gi,
    /Lektorin\s*,?/gi,
    /Lektor\s*,?/gi,
  ];

  // Entfernt alle bekannten Prediger-Varianten und Titel aus einem Text
  function stripPredigerAndTitlesDiff(text: string): string {
    let result = text;
    for (const p of ($predigerList ?? [])) {
      for (const v of (p.varianten ?? [])) {
        result = result.replace(
          new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*,?', 'gi'), ' '
        );
      }
    }
    for (const re of REMOVE_TITLES_DIFF) {
      result = result.replace(re, ' ');
    }
    return result.replace(/^[\s,]+|[\s,]+$/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  // Parst eine GCal-Beschreibung → { abendmahl, kommentar }
  function parseGcalDescription(desc: string): { abendmahl: boolean; kommentar: string } {
    if (!desc) return { abendmahl: false, kommentar: '' };

    // Zeilenweise (neues Format mit \n)
    if (desc.includes('\n')) {
      let abendmahl = false;
      const zusatzLines: string[] = [];
      for (const line of desc.split('\n').map(l => l.trim()).filter(Boolean)) {
        if (/~\s*Y/i.test(line)) { abendmahl = true; continue; }
        // Prediger-Zeile überspringen
        const isPredigerLine = ($predigerList ?? []).some(p =>
          (p.varianten ?? []).some(v => line.toUpperCase().includes(v.toUpperCase()))
        );
        if (isPredigerLine) {
          const rest = stripPredigerAndTitlesDiff(line);
          if (rest) zusatzLines.push(rest);
          continue;
        }
        zusatzLines.push(line);
      }
      return { abendmahl, kommentar: zusatzLines.join(', ').trim() };
    }

    // Legacy-Einzeiler (komma-separiert): "Name, Titel, ~ Y, Kommentar"
    const abendmahl = /~\s*Y/i.test(desc);
    const kommentar = stripPredigerAndTitlesDiff(desc)
      .replace(/~\s*Y\s*/gi, ' ')   // ~ Y entfernen
      .replace(/\s{2,}/g, ' ')       // doppelte Leerzeichen
      .replace(/^[\s,]+|[\s,]+$/g, '') // führende/abschließende Kommas nach allen Removes
      .trim();
    return { abendmahl, kommentar };
  }

  // Vergleicht Firebase-Zeile mit Google-Calendar-Event.
  // Gibt Abweichungen als lesbaren String zurück, oder '' wenn alles gleich.
  function gcalDiff(row: TerminRow): string {
    if (row.isNew || row.editing) return '';
    const gcalEvent = gcalEvents.get(row.originalTimestamp);
    if (!gcalEvent) return '';
    if (row.typ === 'CP') return ''; // Comboproben haben keine relevanten Felder

    const { abendmahl: gcalAbendmahl, kommentar: gcalKommentar } =
      parseGcalDescription(gcalEvent.description ?? '');

    const diffs: string[] = [];
    if (row.abendmahl !== gcalAbendmahl) {
      diffs.push(`Abendmahl: Firebase=${row.abendmahl ? 'Ja' : 'Nein'}, GCal=${gcalAbendmahl ? 'Ja' : 'Nein'}`);
    }
    // Normalize both sides: for GAST rows, strip gastName from both fbKommentar and gcalKommentar
    // so old Firebase data with duplicated name doesn't cause a permanent false diff.
    const stripGastName = (s: string) => row.lektor === 'GAST' && row.gastName
      ? s.replace(new RegExp(row.gastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*,?\\s*', 'gi'), '')
          .replace(/^[\s,]+|[\s,]+$/g, '').trim()
      : s.trim();
    const fbKommentar = stripGastName(row.kommentar);
    const gcalKommentarNorm = stripGastName(gcalKommentar);
    if (fbKommentar !== gcalKommentarNorm) {
      diffs.push(`Kommentar: Firebase="${fbKommentar || '–'}", GCal="${gcalKommentarNorm || '–'}"`);
    }
    return diffs.join(' | ');
  }

  async function createGoogleCalendarEvent(row: TerminRow): Promise<string | null> {
    if (!googleAccessToken) return null;
    try {
      const resp = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(buildGoogleEvent(row)),
        }
      );
      if (!resp.ok) { console.error('GCal Fehler:', await resp.json()); return null; }
      const created = await resp.json();
      // Event in lokale Map aufnehmen (damit Diff-Warnung sofort verschwindet)
      gcalEvents.set(toTimestamp(row.datum, row.uhrzeit), created);
      gcalEvents = new Map(gcalEvents);
      return created.id as string;
    } catch (e) { console.error('GCal Fehler:', e); return null; }
  }

  async function updateGoogleCalendarEvent(row: TerminRow): Promise<boolean> {
    if (!googleAccessToken) return false;
    try {
      const timeMin = dayjs.tz(`${row.datum} ${row.uhrzeit}`, 'Europe/Vienna').subtract(1, 'minute').toISOString();
      const timeMax = dayjs.tz(`${row.datum} ${row.uhrzeit}`, 'Europe/Vienna').add(1, 'minute').toISOString();
      const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
        + `?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`;
      const searchResp = await fetch(searchUrl);
      if (!searchResp.ok) return false;
      const searchData = await searchResp.json();
      const existing = searchData.items?.[0];
      if (!existing) {
        return (await createGoogleCalendarEvent(row)) !== null;
      }
      const newEvent = buildGoogleEvent(row);
      const patchResp = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existing.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(newEvent),
        }
      );
      if (!patchResp.ok) return false;
      const updated = await patchResp.json();
      // Map-Eintrag aktualisieren damit gcalDiff sofort passt
      gcalEvents.set(toTimestamp(row.datum, row.uhrzeit), updated);
      gcalEvents = new Map(gcalEvents);
      return true;
    } catch (e) { console.error('GCal Update Fehler:', e); return false; }
  }

  async function deleteGoogleCalendarEvent(timestamp: string): Promise<boolean> {
    if (!googleAccessToken) return false;
    try {
      // Event per Timestamp suchen (±1 Minute, mit OAuth-Token)
      const dt = dayjs(timestamp, 'YYYY-MM-DD HH:mm:ss');
      const timeMin = dt.subtract(1, 'minute').toISOString();
      const timeMax = dt.add(1, 'minute').toISOString();
      const searchUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
        + `?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`;
      const searchResp = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      });
      if (!searchResp.ok) return false;
      const searchData = await searchResp.json();
      const existing = searchData.items?.[0];
      if (!existing) {
        console.warn('GCal Delete: Event nicht gefunden für', timestamp);
        return true; // nicht in GCal → aus unserer Sicht ok
      }
      const delResp = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existing.id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${googleAccessToken}` } }
      );
      // 204 No Content = erfolgreich gelöscht
      return delResp.ok || delResp.status === 204;
    } catch (e) { console.error('GCal Delete Fehler:', e); return false; }
  }

  // ---------------------------------------------------------------------------
  // Speichern (neu + edit)
  // ---------------------------------------------------------------------------
  function globalIdx(row: TerminRow): number {
    return rows.indexOf(row);
  }

  async function saveRow(gIdx: number) {
    // Immer direkt auf rows[gIdx] arbeiten — nie auf filteredRows-Referenz
    const snap = rows[gIdx];

    rows[gIdx] = { ...snap, error: '', saved: false };
    rows = [...rows];

    if (!snap.datum) { rows[gIdx] = { ...rows[gIdx], error: 'Datum fehlt.' }; rows = [...rows]; return; }
    if (snap.typ === 'GD' && !snap.lektor) { rows[gIdx] = { ...rows[gIdx], error: 'Bitte Lektor auswählen.' }; rows = [...rows]; return; }
    if (snap.typ === 'GD' && snap.lektor === 'GAST' && !snap.gastName.trim()) { rows[gIdx] = { ...rows[gIdx], error: 'Bitte Gastname eingeben.' }; rows = [...rows]; return; }

    const newTimestamp = toTimestamp(snap.datum, snap.uhrzeit);

    // Duplikatcheck
    if (snap.isNew || newTimestamp !== snap.originalTimestamp) {
      const conflict = rows.find(
        (r, i) => i !== gIdx && !r.isNew && toTimestamp(r.datum, r.uhrzeit) === newTimestamp
      ) || rows.find(
        (r, i) => i !== gIdx && r.isNew && r.saved && toTimestamp(r.datum, r.uhrzeit) === newTimestamp
      );
      if (conflict) {
        rows[gIdx] = { ...rows[gIdx], error: `Timestamp ${newTimestamp} existiert bereits.` };
        rows = [...rows];
        return;
      }
    }

    // Google Login ist Pflicht
    if (!googleSignedIn) {
      rows[gIdx] = { ...rows[gIdx], error: 'Bitte zuerst mit Google Calendar verbinden.' };
      rows = [...rows];
      return;
    }

    savingIdx = gIdx;
    try {
      const payload = buildFirebasePayload(snap);

      // Bei Edit + Timestamp-Änderung: alten Key löschen
      if (!snap.isNew && snap.originalTimestamp && snap.originalTimestamp !== newTimestamp) {
        await remove(dbref(dbRealtime, `combo/termine/${snap.originalTimestamp}`));
      }

      await set(dbref(dbRealtime, `combo/termine/${newTimestamp}`), payload);

      // Google Calendar: neu anlegen oder updaten
      const gcalOk = snap.isNew
        ? (await createGoogleCalendarEvent(snap)) !== null
        : await updateGoogleCalendarEvent(snap);

      if (!gcalOk) {
        await remove(dbref(dbRealtime, `combo/termine/${newTimestamp}`));
        rows[gIdx] = { ...rows[gIdx], error: 'Google Calendar Fehler — Termin wurde nicht gespeichert.' };
        rows = [...rows];
        return;
      }

      // Zeile als gespeichert markieren (neues Objekt → Svelte erkennt Änderung)
      rows[gIdx] = { ...rows[gIdx], originalTimestamp: newTimestamp, saved: true, editing: false, isNew: false };

      // Nach neuem Eintrag: bestehende offene NEU-Zeile aktualisieren (falls vorhanden),
      // sonst neue Zeile anhängen
      if (snap.isNew) {
        const savedDatum = snap.datum;
        const savedTyp = snap.typ;
        const savedLektor = snap.lektor === 'GAST' ? '' : snap.lektor;
        const nextDatum = savedTyp === 'GD' ? nextSunday(savedDatum) : dayjs(savedDatum).add(7, 'day').format('YYYY-MM-DD');
        // Suche eine bereits existierende offene NEU-Zeile (die durch addRow-Klick entstanden ist)
        const existingNewIdx = rows.findIndex((r, i) => i !== gIdx && r.isNew && !r.saved);
        if (existingNewIdx >= 0) {
          // Bereits eine offene Zeile → nur Datum, Lektor und Abendmahl korrigieren
          rows[existingNewIdx] = {
            ...rows[existingNewIdx],
            datum: nextDatum,
            uhrzeit: defaultUhrzeit(savedTyp),
            typ: savedTyp,
            lektor: savedLektor,
            abendmahl: false,
            kommentar: '',
            error: '',
          };
        } else {
          // Keine offene Zeile → neue anhängen
          const newRow = createNewRow(nextDatum, savedTyp);
          newRow.lektor = savedLektor;
          rows = [...rows, newRow];
        }
      }

      rows = [...rows];
    } catch (e: any) {
      rows[gIdx] = { ...rows[gIdx], error: `Fehler: ${e?.message ?? e}` };
      rows = [...rows];
    } finally {
      savingIdx = null;
    }
  }

  async function saveAll() {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].editing && !rows[i].saved) {
        await saveRow(i);
      }
    }
  }

  /** Nächsten Sonntag nach `fromDate` (oder ab heute wenn leer) */
  function nextSunday(fromDate: string): string {
    const base = fromDate ? dayjs(fromDate) : dayjs();
    const dow = base.day(); // 0 = Sonntag
    const daysUntilSunday = dow === 0 ? 7 : 7 - dow;
    return base.add(daysUntilSunday, 'day').format('YYYY-MM-DD');
  }

  function addRow() {
    if (!googleSignedIn) { pendingAction = addRow; googleConnectModalOpen = true; return; }
    // Typ: wenn Filter aktiv ist, neue Zeile passend zum Filter anlegen
    const preferredTyp: TerminTyp = filterTyp !== 'ALL' ? filterTyp : (newRowsTyp ?? 'GD');
    // Letzten sichtbaren Eintrag als Referenz nehmen
    const lastVisible = [...filteredRows].reverse().find((r) => r.datum);
    const lastDatum = lastVisible?.datum ?? '';

    // Datum: für GD → nächster Sonntag nach letztem Datum; für CP → +7 Tage
    const nextDatum = preferredTyp === 'GD'
      ? nextSunday(lastDatum)
      : (lastDatum ? dayjs(lastDatum).add(7, 'day').format('YYYY-MM-DD') : '');

    // Lektor vom letzten GD-Eintrag übernehmen, Abendmahl + Kommentar leer
    const lastLektor = preferredTyp === 'GD'
      ? ([...filteredRows].reverse().find((r) => r.typ === 'GD' && r.lektor)?.lektor ?? '')
      : '';

    const newRow = createNewRow(nextDatum, preferredTyp);
    newRow.lektor = lastLektor;
    // abendmahl und kommentar bleiben false/'' aus createNewRow
    rows = [...rows, newRow];
  }

  function removeRow(gIdx: number) {
    rows = rows.filter((_, i) => i !== gIdx);
  }

  // Überschreibt Google Calendar mit den Firebase-Daten (Firebase = Quelle der Wahrheit)
  async function syncRowToGcal(gIdx: number) {
    if (!googleSignedIn) { pendingAction = () => syncRowToGcal(gIdx); googleConnectModalOpen = true; return; }
    const row = rows[gIdx];
    rows[gIdx] = { ...rows[gIdx], error: '' };
    rows = [...rows];
    const ok = await updateGoogleCalendarEvent(row);
    if (!ok) {
      rows[gIdx] = { ...rows[gIdx], error: 'Bereinigung fehlgeschlagen — Google Calendar Fehler.' };
      rows = [...rows];
    }
    // gcalEvents wurde in updateGoogleCalendarEvent bereits aktualisiert
  }

  // Bereinigt alle Zeilen mit Abweichung in einem Durchgang
  async function syncAllToGcal() {
    if (!googleSignedIn) { pendingAction = syncAllToGcal; googleConnectModalOpen = true; return; }
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].isNew && !rows[i].editing && gcalDiff(rows[i])) {
        await syncRowToGcal(i);
      }
    }
  }

  function deleteExistingRow(gIdx: number) {
    if (!googleSignedIn) { pendingAction = () => deleteExistingRow(gIdx); googleConnectModalOpen = true; return; }
    deleteConfirmIdx = gIdx;
    deleteConfirmOpen = true;
  }

  async function confirmDelete() {
    const gIdx = deleteConfirmIdx;
    deleteConfirmIdx = null;
    deleteConfirmOpen = false;
    if (gIdx === null) return;
    const row = rows[gIdx];
    rows[gIdx] = { ...rows[gIdx], error: '' };
    rows = [...rows];
    try {
      // 1. Google Calendar zuerst löschen
      const gcalOk = await deleteGoogleCalendarEvent(row.originalTimestamp);
      if (!gcalOk) {
        rows[gIdx] = { ...rows[gIdx], error: 'Google Calendar Fehler — Termin wurde nicht gelöscht.' };
        rows = [...rows];
        return;
      }
      // 2. Firebase löschen
      await remove(dbref(dbRealtime, `combo/termine/${row.originalTimestamp}`));
      // Aus lokalem GCal-Map entfernen
      gcalEvents.delete(row.originalTimestamp);
      gcalEvents = new Map(gcalEvents);
      rows = rows.filter((_, i) => i !== gIdx);
    } catch (e: any) {
      rows[gIdx] = { ...rows[gIdx], error: `Fehler: ${e?.message ?? e}` };
      rows = [...rows];
    }
  }

  function startEdit(gIdx: number) {
    if (!googleSignedIn) { pendingAction = () => startEdit(gIdx); googleConnectModalOpen = true; return; }
    rows[gIdx] = { ...rows[gIdx], editing: true, saved: false };
    rows = [...rows];
  }

  function cancelEdit(gIdx: number) {
    const row = rows[gIdx];
    if (row.isNew) {
      rows = rows.filter((_, i) => i !== gIdx);
    } else {
      rows[gIdx].editing = false;
      rows[gIdx].error = '';
      rows = [...rows];
    }
  }

  // ---------------------------------------------------------------------------
  // Firebase laden
  // ---------------------------------------------------------------------------
  function loadTermine() {
    popupSpinnerModal = true;
    const fromDate = dayjs().format('YYYY-MM-DD');
    const q = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate));
    onValue(q, (snapshot) => {
      const existingNewRows = rows.filter((r) => r.isNew);
      if (snapshot.exists()) {
        const loaded: TerminRow[] = Object.values(snapshot.val()).map(firebaseEntryToRow);
        loaded.sort((a, b) => a.datum.localeCompare(b.datum) || a.uhrzeit.localeCompare(b.uhrzeit));
        rows = [...loaded, ...existingNewRows];
      } else {
        rows = [...existingNewRows];
      }
      popupSpinnerModal = false;
    });
  }

  // ---------------------------------------------------------------------------
  // Auth / Load
  // ---------------------------------------------------------------------------
  onMount(() => { initAuth(); });

  $: if ($currentUser && !dataLoaded) {
    dataLoaded = true;
    loadData($currentUser);
  }

  const loadData = async (user: any) => {
    const app = initAppCheck();
    if (!app) return;
    dbRealtime = getDatabase(app);
    dbFireStore = getDb();
    initPredigerStore(dbFireStore);
    popupSpinnerModal = true;

    const userDoc = await getDoc(doc(dbFireStore, 'accounts', user.uid));
    const roles = userDoc.exists() && userDoc.data().roles ? userDoc.data().roles : [];
    if (!roles.includes('terminadmin') && !roles.includes('admin')) {
      popupSpinnerModal = false;
      return;
    }
    terminAdminRole = true;
    loadTermine();

    if ((window as any).google?.accounts?.oauth2) {
      initGoogleSignIn();
    } else {
      document.getElementById('google-gis-script')?.addEventListener('load', initGoogleSignIn);
    }
    // GCal-Timestamps für Abgleich laden (read-only, kein Login nötig)
    loadGcalTimestamps();
  };
</script>

<svelte:head>
  <script id="google-gis-script" src="https://accounts.google.com/gsi/client" async defer></script>
</svelte:head>

<!-- Zugriff verweigert -->
{#if $authReady && $currentUser && !terminAdminRole}
  <div class="flex justify-center p-8">
    <Card class="border-2 border-red-600 bg-red-50 content-center max-w-none">
      <div class="p-8">
        <ExclamationCircleOutline class="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 class="text-xl font-bold mb-4 text-red-700">Zugriff verweigert</h1>
        <p>Du hast leider keine Berechtigung. Bitte wende dich an den Administrator.</p>
      </div>
    </Card>
  </div>
{/if}

{#if terminAdminRole}
  <div class="p-4">

    <!-- Header-Card -->
    <Card class="mb-4 p-4 max-w-none">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Termine anlegen &amp; bearbeiten</h1>
          <p class="text-sm text-gray-500 mt-1">Bestehende und neue Termine direkt in Firebase und Google Calendar verwalten.</p>
        </div>

        <!-- Google Calendar Verbindung -->
        <div class="flex items-center gap-2">
          {#if googleSignedIn}
            <Badge color="green" class="flex items-center gap-1">
              <CheckCircleSolid class="w-3 h-3 mr-1" /> Google Calendar verbunden
            </Badge>
          {:else}
            <Button color="blue" onclick={() => (googleConnectModalOpen = true)}>
              <CalendarMonthOutline class="mr-1 h-4 w-4" /> Mit Google Calendar verbinden
            </Button>
          {/if}
        </div>
      </div>

      <!-- Filter + Typ-Buttons -->
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Anzeigen:</span>
        <ButtonGroup>
          <Button size="xs" color={filterTyp === 'ALL' ? 'blue' : 'alternative'} onclick={() => (filterTyp = 'ALL')}>Alle</Button>
          <Button size="xs" color={filterTyp === 'GD' ? 'blue' : 'alternative'} onclick={() => (filterTyp = 'GD')}>
            <img src={kreuzSrc} alt="GD" class="w-4 h-4 mr-1 inline-block" />Gottesdienste
          </Button>
          <Button size="xs" color={filterTyp === 'CP' ? 'blue' : 'alternative'} onclick={() => (filterTyp = 'CP')}>
            <img src={musikSrc} alt="CP" class="w-4 h-4 mr-1 inline-block rounded-full" />Comboproben
          </Button>
        </ButtonGroup>

        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 ml-4">Neue Zeilen setzen auf:</span>
        <ButtonGroup>
          <Button size="xs" color={newRowsTyp === 'GD' ? 'blue' : 'alternative'} onclick={() => applyTypToAllNew('GD')}>
            <img src={kreuzSrc} alt="GD" class="w-4 h-4 mr-1 inline-block" />Alle → GD
          </Button>
          <Button size="xs" color={newRowsTyp === 'CP' ? 'blue' : 'alternative'} onclick={() => applyTypToAllNew('CP')}>
            <img src={musikSrc} alt="CP" class="w-4 h-4 mr-1 inline-block rounded-full" />Alle → CP
          </Button>
        </ButtonGroup>
      </div>
    </Card>

    <!-- Tabelle -->
    <Card class="p-0 overflow-visible max-w-none">
      <div class="overflow-x-auto">
        <Table class="w-full">
          <TableHead>
            <TableHeadCell class="w-[50px]">#</TableHeadCell>
            <TableHeadCell class="w-[145px]">Datum</TableHeadCell>
            <TableHeadCell class="w-[100px]">Uhrzeit</TableHeadCell>
            <TableHeadCell class="w-[220px]">Typ</TableHeadCell>
            <TableHeadCell class="w-[210px]">Lektor / Prediger</TableHeadCell>
            <TableHeadCell class="w-[95px]">Abendmahl</TableHeadCell>
            <TableHeadCell>Kommentar</TableHeadCell>
            <TableHeadCell class="w-[140px]">Aktion</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each filteredRows as row (row.originalTimestamp || row.datum + row.uhrzeit + row.isNew)}
              {@const gIdx = globalIdx(row)}
              <TableBodyRow class={
                row.saved         ? 'bg-green-50 dark:bg-green-950' :
                row.error         ? 'bg-red-50 dark:bg-red-950' :
                !row.isNew && !row.editing ? 'bg-gray-50 dark:bg-gray-900' : ''
              }>
                <!-- Nr / Status -->
                <TableBodyCell class="align-middle text-center">
                  {#if row.isNew}
                    <Badge color="blue" class="text-[10px]">NEU</Badge>
                  {:else if row.editing}
                    <Badge color="yellow" class="text-[10px]">EDIT</Badge>
                  {:else}
                    <Badge color="indigo" class="text-[10px]">✓</Badge>
                  {/if}
                </TableBodyCell>

                <!-- Datum -->
                <TableBodyCell class="align-top pt-2">
                  {#if row.editing}
                    <Input type="date" bind:value={row.datum} size="sm" class="w-full" />
                  {:else}
                    <span class="text-sm font-medium">{dayjs(row.datum).format('DD.MM.YYYY')}</span>
                  {/if}
                </TableBodyCell>

                <!-- Uhrzeit -->
                <TableBodyCell class="align-top pt-2">
                  {#if row.editing}
                    <Input type="time" bind:value={row.uhrzeit} size="sm" class="w-full" />
                  {:else}
                    <span class="text-sm">{row.uhrzeit}</span>
                  {/if}
                </TableBodyCell>

                <!-- Typ -->
                <TableBodyCell class="align-top pt-2">
                  {#if row.editing}
                    <div class="relative w-full">
                      <select
                        bind:value={row.typ}
                        onchange={() => onTypChange(gIdx)}
                        class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-1.5 pl-8 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
                      >
                        <option value="GD">Gottesdienst</option>
                        <option value="CP">Comboprobe</option>
                      </select>
                      <div class="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2">
                        {#if row.typ === 'GD'}
                          <img src={kreuzSrc} alt="GD" class="w-4 h-4 object-contain" />
                        {:else}
                          <img src={musikSrc} alt="CP" class="w-4 h-4 rounded-full object-cover" />
                        {/if}
                      </div>
                    </div>
                  {:else}
                    <div class="flex items-center gap-2">
                      <PredigtAvatar prediger={row.typ === 'GD' ? 'GD' : 'COM'} clazz="w-7 h-7 shrink-0 object-cover" />
                      <span class="text-sm">{row.typ === 'GD' ? 'Gottesdienst' : 'Comboprobe'}</span>
                    </div>
                  {/if}
                </TableBodyCell>

                <!-- Lektor -->
                <TableBodyCell class="align-top pt-2">
                  {#if row.typ === 'GD'}
                    {#if row.editing}
                      <Select
                        bind:value={row.lektor}
                        size="sm"
                        class="w-full"
                        items={[
                          { value: '', name: '— Lektor wählen —' },
                          ...($predigerList ?? [])
                            .slice()
                            .sort((a, b) => (a.langname ?? a.kuerzel).localeCompare(b.langname ?? b.kuerzel))
                            .map((p) => ({ value: p.kuerzel, name: p.langname ?? p.kuerzel })),
                          { value: 'GAST', name: '👤 Gast (Freitext)' },
                        ]}
                      />
                      {#if row.lektor === 'GAST'}
                        <Input
                          bind:value={row.gastName}
                          size="sm"
                          placeholder="Name des Gastes…"
                          class="w-full mt-1"
                        />
                      {/if}
                    {:else}
                      <div class="flex items-center gap-2">
                        <PredigtAvatar prediger={row.lektor === 'GAST' ? 'GD' : (row.lektor || 'GD')} clazz="w-7 h-7 shrink-0 object-cover" />
                        <span class="text-sm">
                          {#if row.lektor === 'GAST'}
                            <span class="text-gray-500 text-xs">Gast:</span> {row.gastName || '–'}
                          {:else}
                            {($predigerList ?? []).find(p => p.kuerzel === row.lektor)?.langname ?? row.lektor ?? '–'}
                          {/if}
                        </span>
                      </div>
                    {/if}
                  {:else}
                    <div class="flex items-center gap-2">
                      <PredigtAvatar prediger="COM" clazz="w-7 h-7 shrink-0 object-cover" />
                      <span class="text-xs text-gray-400 italic">Combo</span>
                    </div>
                  {/if}
                </TableBodyCell>

                <!-- Abendmahl -->
                <TableBodyCell class="align-middle text-center">
                  {#if row.typ === 'GD'}
                    {#if row.editing}
                      <label class="flex flex-col items-center gap-1 cursor-pointer select-none">
                        <span class="text-xs text-gray-500 font-medium">Abendmahl</span>
                        <input
                          type="checkbox"
                          class="w-5 h-5 accent-blue-600 cursor-pointer"
                          checked={rows[gIdx].abendmahl}
                          onchange={(e) => { rows[gIdx] = { ...rows[gIdx], abendmahl: (e.target as HTMLInputElement).checked }; rows = [...rows]; }}
                        />
                      </label>
                    {:else}
                      {#if row.abendmahl}
                        <Badge color="green">Ja</Badge>
                      {:else}
                        <span class="text-xs text-gray-400">Nein</span>
                      {/if}
                    {/if}
                  {:else}
                    <span class="text-xs text-gray-300">–</span>
                  {/if}
                </TableBodyCell>

                <!-- Kommentar -->
                <TableBodyCell class="align-top pt-2">
                  {#if row.editing}
                    <Textarea bind:value={row.kommentar} rows={1} placeholder="Bemerkung…" class="w-full text-sm resize-none" />
                  {:else}
                    <span class="text-sm text-gray-600 dark:text-gray-400">{row.kommentar || '–'}</span>
                  {/if}
                </TableBodyCell>

                <!-- Aktionen -->
                <TableBodyCell class="align-top pt-2">
                  <div class="flex flex-col gap-1">
                    {#if row.editing}
                      <!-- Speichern -->
                      <Button size="xs" color="blue" disabled={savingIdx !== null} onclick={() => saveRow(gIdx)}>
                        {#if savingIdx === gIdx}
                          <Spinner size="4" class="mr-1" /> Speichern…
                        {:else}
                          <FolderPlusOutline class="mr-1 h-3 w-3" /> Speichern
                        {/if}
                      </Button>
                      <!-- Abbrechen -->
                      <Button size="xs" color="alternative" onclick={() => cancelEdit(gIdx)}>
                        <CloseOutline class="mr-1 h-3 w-3" /> Abbrechen
                      </Button>
                    {:else}
                      <!-- Gespeichert-Badge -->
                      {#if row.saved}
                        <Badge color="green" class="flex items-center gap-1 mb-1">
                          <CheckCircleSolid class="h-3 w-3 mr-1" /> Gespeichert
                        </Badge>
                      {/if}
                      <!-- Abgleich-Warnung: fehlt in Google Calendar -->
                      {#if !row.isNew && !gcalLoading && !gcalTimestamps.has(row.originalTimestamp)}
                        <Alert color="red" class="p-1 text-xs mb-1 flex items-center gap-1">
                          <ExclamationCircleOutline class="h-3 w-3 shrink-0" /> Fehlt in Google Calendar
                        </Alert>
                      {/if}
                      <!-- Abgleich-Warnung: Inhalt weicht ab -->
                      {#if !gcalLoading && gcalDiff(row)}
                        <Alert color="yellow" class="p-1 text-xs mb-1">
                          <ExclamationCircleOutline class="h-3 w-3 shrink-0 inline mr-1" />
                          <strong>GCal weicht ab:</strong><br/>
                          {gcalDiff(row)}
                        </Alert>
                        <Button size="xs" color="yellow" onclick={() => syncRowToGcal(gIdx)}>
                          <ArrowsRepeatOutline class="mr-1 h-3 w-3" /> Bereinigen
                        </Button>
                      {/if}
                      <!-- Bearbeiten -->
                      <Button size="xs" color="alternative" onclick={() => startEdit(gIdx)}>
                        <EditOutline class="mr-1 h-3 w-3" /> Bearbeiten
                      </Button>
                      <!-- Löschen -->
                      <Button size="xs" color="red" onclick={() => deleteExistingRow(gIdx)}>
                        <TrashBinOutline class="h-3 w-3" />
                      </Button>
                    {/if}

                    {#if row.error}
                      <Alert color="red" class="p-1 text-xs mt-1">{row.error}</Alert>
                    {/if}
                  </div>
                </TableBodyCell>
              </TableBodyRow>
            {/each}

            {#if filteredRows.length === 0}
              <TableBodyRow>
                <TableBodyCell colspan={8} class="text-center text-sm text-gray-400 py-6">
                  {filterTyp === 'ALL' ? 'Keine Termine vorhanden.' : `Keine ${filterTyp === 'GD' ? 'Gottesdienste' : 'Comboproben'} vorhanden.`}
                </TableBodyCell>
              </TableBodyRow>
            {/if}
          </TableBody>
        </Table>
      </div>

      <!-- Footer -->
      <div class="flex flex-wrap items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
        <Button size="sm" color="alternative" onclick={addRow}>
          <PlusOutline class="mr-1 h-4 w-4" /> Neue Zeile
        </Button>
        <GradientButton color="cyanToBlue" size="sm" onclick={saveAll} disabled={savingIdx !== null}>
          <FolderPlusOutline class="mr-1 h-4 w-4" /> Alle offenen speichern
        </GradientButton>
        {#if rows.some(r => !r.isNew && !r.editing && gcalDiff(r))}
          <Button color="yellow" size="sm" onclick={syncAllToGcal}>
            <ArrowsRepeatOutline class="mr-1 h-4 w-4" /> Alle Abweichungen bereinigen
          </Button>
        {/if}

      </div>
    </Card>

  </div>
{/if}

<!-- Google Calendar Verbindungs-Modal -->
<Modal bind:open={googleConnectModalOpen} size="sm" title="Google Calendar Verbindung">
  <div class="text-center py-2">
    <CalendarMonthOutline class="mx-auto mb-4 w-14 h-14 text-blue-600" />
    <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
      Google Calendar Verbindung erforderlich
    </h3>
    <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
      Um Termine anzulegen, zu bearbeiten oder zu löschen,<br />
      muss die App mit deinem Google-Konto verbunden sein.
    </p>
    <div class="flex gap-3 justify-center">
      <Button color="blue" onclick={requestGoogleToken}>
        <CalendarMonthOutline class="mr-2 h-4 w-4" /> Mit Google verbinden
      </Button>
      <Button color="alternative" onclick={() => { googleConnectModalOpen = false; pendingAction = null; }}>
        Abbrechen
      </Button>
    </div>
  </div>
</Modal>

<!-- Termin löschen Bestätigungs-Modal -->
<Modal
  bind:open={deleteConfirmOpen}
  size="sm"
  title="Termin löschen"
>
  {#if deleteConfirmIdx !== null}
    <div class="text-center py-2">
      <TrashBinOutline class="mx-auto mb-4 w-14 h-14 text-red-600" />
      <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
        Termin wirklich löschen?
      </h3>
      <p class="mb-1 text-sm font-mono font-medium text-gray-800 dark:text-gray-200">
        {rows[deleteConfirmIdx]?.originalTimestamp}
      </p>
      <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Der Termin wird unwiderruflich aus <strong>Firebase</strong> und
        <strong>Google Calendar</strong> entfernt.
      </p>
      <div class="flex gap-3 justify-center">
        <Button color="red" onclick={confirmDelete}>
          <TrashBinOutline class="mr-2 h-4 w-4" /> Ja, löschen
        </Button>
        <Button color="alternative" onclick={() => { deleteConfirmOpen = false; deleteConfirmIdx = null; }}>
          Abbrechen
        </Button>
      </div>
    </div>
  {/if}
</Modal>

<WaitPopup {popupSpinnerModal} message="Daten werden geladen…" />
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
