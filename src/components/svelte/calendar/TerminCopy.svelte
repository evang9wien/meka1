<script lang="ts">
  import { onMount } from 'svelte';
  import axios from 'axios';
  import {
    Input,
    Label,
    GradientButton,
    Card,
    Table,
    TableHead,
    TableBody,
    TableBodyRow,
    TableBodyCell,
    TableHeadCell,
  } from 'flowbite-svelte';
  import { Button } from 'flowbite-svelte';
  import { ArrowsRepeatOutline, TrashBinOutline, FolderPlusOutline, CheckCircleSolid } from 'flowbite-svelte-icons';
  import PredigtAvatar from '../predigt/PredigtAvatar.svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import dayjs from 'dayjs';

  import { getDatabase, ref as dbref, query, orderByKey, startAt, onValue, set, update, remove } from 'firebase/database';
  import { initAuth, currentUser, authReady } from '../stores/authStore.ts';
  import { initAppCheck, getDb } from '../firebase/firebase.ts';
  import {
    predigerList,
    initPredigerStore,
    getPredigerKuerzelFromStore,
  } from '../stores/predigerStore.ts';
  import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
  import WaitPopup from '../popup/WaitPopup.svelte';
  import LoginFirebase from '../auth/LoginFirebase.svelte';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';

  dayjs.extend(utc);
  dayjs.extend(timezone);

  let popupSpinnerModal = false;
  let dataLoaded = false;

  let fromDate: string = new Date().toISOString().split('T')[0];
  let toDate: string = new Date(Date.now() + 32 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const calendarId = '095lkf9ujgaa4u1qmi4e2vf00k@group.calendar.google.com';
  const apiKey = 'AIzaSyBU0NT8Jy8m_2UkJdThdIs1Ee0lL9ZzVus';

  let dbRealtime: any;
  let dbFireStore: any;

  let googleEvents: any[] = [];
  let firebaseEvents: any[] = [];

  // Hilfsstruktur für kombinierte Darstellung
  let combinedEvents: any[] = [];

  let terminAdminRole = false;
  let members;

  // ---------------------------------------------------------------------------
  // Prediger-Verwaltung
  // ---------------------------------------------------------------------------
  let predigerForm: {
    kuerzel: string;
    langname: string;
    vorname: string;
    varianten: string;   // komma-getrennt im Formular
    avatarUrl: string;
  } = { kuerzel: '', langname: '', vorname: '', varianten: '', avatarUrl: '' };
  let predigerEditKuerzel: string | null = null; // null = neuer Eintrag, string = Edit
  let predigerFormOpen = false;
  let predigerSaving = false;
  let predigerFormEl: HTMLElement | null = null; // Referenz zum Scrollen

  function openNewPrediger() {
    predigerEditKuerzel = null;
    predigerForm = { kuerzel: '', langname: '', vorname: '', varianten: '', avatarUrl: '' };
    predigerFormOpen = true;
    scrollToForm();
  }

  function openEditPrediger(p: any) {
    predigerEditKuerzel = p.kuerzel;
    predigerForm = {
      kuerzel:   p.kuerzel,
      langname:  p.langname  || '',
      vorname:   p.vorname   || '',
      varianten: Array.isArray(p.varianten) ? p.varianten.join(', ') : '',
      avatarUrl: p.avatarUrl || '',
    };
    predigerFormOpen = true;
    scrollToForm();
  }

  function scrollToForm() {
    // Nach dem nächsten Render-Zyklus scrollen damit das Element sichtbar ist
    setTimeout(() => predigerFormEl?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function savePrediger() {
    if (!predigerForm.kuerzel.trim()) return;
    predigerSaving = true;
    try {
      const entry = {
        kuerzel:   predigerForm.kuerzel.trim(),
        langname:  predigerForm.langname.trim(),
        vorname:   predigerForm.vorname.trim(),
        varianten: predigerForm.varianten.split(',').map((v) => v.trim()).filter(Boolean),
        avatarUrl: predigerForm.avatarUrl.trim(),
      };
      await setDoc(doc(dbFireStore, 'prediger', entry.kuerzel), entry);
      predigerFormOpen = false;
    } finally {
      predigerSaving = false;
    }
  }

  async function deletePrediger(kuerzel: string) {
    if (!confirm(`Prediger "${kuerzel}" wirklich löschen?`)) return;
    await deleteDoc(doc(dbFireStore, 'prediger', kuerzel));
  }

  // ---------------------------------------------------------------------------
  // Titel/Bezeichnungen die aus der Beschreibung herausgefiltert werden sollen
  // ---------------------------------------------------------------------------
  const REMOVE_TITLES = [
    /Pf(?:arrer(?:in)?)?\.?\s*i\.?\s*[Rr]\.?\s*,?/gi,  // Pf.i.R. / Pfarrer(in) i.R. u.ä.
    /Pfarrerin\s*,?/gi,
    /Pfarrer\s*,?/gi,
    /Lektorin\s*,?/gi,
    /Lektor\s*,?/gi,
  ];

  // ---------------------------------------------------------------------------
  // Einheitliche Beschreibungs-Parserfunktion
  //
  // Gibt zurück: { verantwortlich, abendmahl, zusatzinfo, veranstaltung }
  //
  // Logik:
  //   1. Comboprobe (summary): feste Werte, description wird ignoriert
  //   2. Zeilenweise (description enthält \n): jede Zeile wird einzeln
  //      ausgewertet — Zeile mit bekanntem Namen → Verantwortlich,
  //      Zeile mit "~ Y" → Abendmahl, Rest → Zusatzinfo
  //   3. Legacy-Einzeiler: subtraktiver Filter (abwärtskompatibel)
  // ---------------------------------------------------------------------------
  function parseDescription(description: string, summary: string): {
    verantwortlich: string;
    abendmahl: string;
    zusatzinfo: string;
    veranstaltung: string;
  } {
    // 1. Comboprobe — description vollständig ignorieren
    if (summary?.trim().replace(/\s+/g, '') === 'Comboprobe') {
      return { verantwortlich: 'COM', abendmahl: '', zusatzinfo: '', veranstaltung: 'CP' };
    }

    const desc = description || '';

    // 2. Zeilenweise: Beschreibung enthält Zeilenumbrüche
    if (desc.includes('\n')) {
      const lines = desc.split('\n').map((l) => l.trim()).filter(Boolean);
      let verantwortlich = '';
      let abendmahl = '0';
      const zusatzLines: string[] = [];

      for (const line of lines) {
        // Abendmahl-Zeile
        if (/~\s*Y/i.test(line)) {
          abendmahl = '1';
          continue;
        }
        // Prediger-Zeile: enthält einen bekannten Namen
        const kuerzel = getPredigerKuerzelFromStore(line);
        if (kuerzel) {
          verantwortlich = kuerzel;
          // Resttext der Zeile nach dem Namen als Zusatzinfo aufnehmen
          const rest = stripPredigerAndTitles(line);
          if (rest) zusatzLines.push(rest);
          continue;
        }
        // Alles andere ist Zusatzinfo
        zusatzLines.push(line);
      }

      return {
        verantwortlich,
        abendmahl,
        zusatzinfo: zusatzLines.join(', ').trim(),
        veranstaltung: 'GD',
      };
    }

    // 3. Legacy-Einzeiler: subtraktiver Filter (abwärtskompatibel)
    const verantwortlich = getPredigerKuerzelFromStore(desc);
    const abendmahl = /~\s*Y/i.test(desc) ? '1' : '0';
    const zusatzinfo = stripPredigerAndTitles(desc).replace(/~\s*Y\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim();

    return { verantwortlich, abendmahl, zusatzinfo, veranstaltung: 'GD' };
  }

  // Entfernt alle bekannten Predigernamen und Titel aus einem Text
  function stripPredigerAndTitles(text: string): string {
    let result = text;
    // Predigernamen aus Store entfernen (nur wenn geladen)
    const sourceList = $predigerList ?? [];
    for (const p of sourceList) {
      for (const v of (p.varianten || [])) {
        result = result.replace(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*,?', 'gi'), ' ');
      }
    }
    // Titel entfernen
    for (const re of REMOVE_TITLES) {
      result = result.replace(re, ' ');
    }
    // Führende/abschließende Kommas und Leerzeichen bereinigen
    result = result.replace(/^[\s,]+|[\s,]+$/g, '').replace(/\s{2,}/g, ' ').trim();
    return result;
  }

  // Firebase App absichern

  async function fetchGoogleEvents() {
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}` +
      `&timeMin=${new Date(fromDate).toISOString()}` +
      `&timeMax=${new Date(new Date(toDate).getTime() + 24 * 60 * 60 * 1000).toISOString()}`;

    try {
      const response = await axios.get(url);
      googleEvents = response.data.items.map((event) => {
        const start = event.start.dateTime || event.start.date;
        const timestamp = dayjs(start).tz('Europe/Vienna').format('YYYY-MM-DD HH:mm:ss');
        return {
          id: event.id,
          timestamp,
          summary: event.summary || '',
          description: event.description || '',
        };
      });

      combineEvents();
    } catch (error) {
      console.error('Fehler beim Abrufen der Google Calendar Termine:', error);
    }
  }

  async function fetchFirebaseEvents() {
    const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate));
    onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        firebaseEvents = Object.values(snapshot.val());
      } else {
        firebaseEvents = [];
      }
      combineEvents();
    });
  }
  async function deleteFromFirebase(timestamp: string) {
    try {
      await remove(dbref(dbRealtime, `combo/termine/${timestamp}`));
      fetchFirebaseEvents();
    } catch (error) {
      console.error('Fehler beim Löschen aus Firebase:', error);
    }
  }

  async function addComboprobe(timestamp: string) {
    const data = {
      Abendmahl: '',
      Bass: '',
      Combo: '',
      Drums: '',
      Gitarre: '',
      KS_Koordination: '',
      Melodie: '',
      Tasten: '',
      Termin: timestamp,
      Veranstaltung: 'CP',
      Verantwortlich: 'COM',
      Zusatzinfo: '',
    };

    try {
      await set(dbref(dbRealtime, `combo/termine/${timestamp}`), data);
      fetchFirebaseEvents();
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Comboprobe:', error);
    }
  }

  // Kombiniert Termine mit gleichem Zeitstempel
  function combineEvents() {
    const map = new Map();

    for (const ge of googleEvents) {
      map.set(ge.timestamp, { timestamp: ge.timestamp, google: ge, firebase: null });
    }

    for (const fe of firebaseEvents) {
      if (map.has(fe.Termin)) {
        map.get(fe.Termin).firebase = fe;
      } else {
        map.set(fe.Termin, { timestamp: fe.Termin, google: null, firebase: fe });
      }
    }

    combinedEvents = Array.from(map.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    console.log(combineEvents);
  }

  function isSynced(timestamp: string) {
    return firebaseEvents.some((e) => e.Termin === timestamp);
  }


  // Felder, die aus Google Calendar abgeleitet werden
  function googleDerivedFields(event) {
    const parsed = parseDescription(event.description, event.summary);
    return {
      Abendmahl: parsed.abendmahl,
      Termin: event.timestamp,
      Veranstaltung: parsed.veranstaltung,
      Verantwortlich: parsed.verantwortlich,
      Zusatzinfo: parsed.zusatzinfo,
    };
  }

  async function syncToFirebase(event) {
    const existing = firebaseEvents.find((e) => e.Termin === event.timestamp);
    try {
      if (existing) {
        // Nur die Google-abgeleiteten Felder aktualisieren; Instrumentenfelder bleiben erhalten
        await update(dbref(dbRealtime, `combo/termine/${event.timestamp}`), googleDerivedFields(event));
      } else {
        // Neuer Eintrag: alle Felder anlegen
        await set(dbref(dbRealtime, `combo/termine/${event.timestamp}`), {
          ...googleDerivedFields(event),
          Bass: '',
          Combo: '1',
          Drums: '',
          Gitarre: '',
          KS_Koordination: '',
          Melodie: '',
          Tasten: '',
        });
      }
      fetchFirebaseEvents();
    } catch (error) {
      console.error('Fehler beim Schreiben in Firebase:', error);
    }
  }

  // Gibt die konkreten Feldänderungen zurück (leer = kein Update nötig)
  function getChanges(googleEvent): { field: string; old: string; new: string }[] {
    const fb = firebaseEvents.find((e) => e.Termin === googleEvent.timestamp);
    if (!fb) return [];
    const derived = googleDerivedFields(googleEvent);
    const changes: { field: string; old: string; new: string }[] = [];
    if (fb.Abendmahl !== derived.Abendmahl)
      changes.push({ field: 'Abendmahl', old: fb.Abendmahl, new: derived.Abendmahl });
    if (fb.Verantwortlich !== derived.Verantwortlich)
      changes.push({ field: 'Verantwortlich', old: fb.Verantwortlich, new: derived.Verantwortlich });
    if (fb.Zusatzinfo !== derived.Zusatzinfo)
      changes.push({ field: 'Zusatzinfo', old: fb.Zusatzinfo, new: derived.Zusatzinfo });
    return changes;
  }

  function needsUpdate(googleEvent): boolean {
    return getChanges(googleEvent).length > 0;
  }

  onMount(() => {
    initAuth();
  });

  // Reaktiv: sobald User eingeloggt → Daten laden (einmalig)
  $: if ($currentUser && !dataLoaded) {
    dataLoaded = true;
    loadData($currentUser);
  }

  const loadData = async (user: any) => {
    const app = initAppCheck();
    if (!app) return;
    dbRealtime = getDatabase(app);
    dbFireStore = getDb();
    // Prediger-Store starten (lädt Firestore collection "prediger", seeded bei erstem Start)
    initPredigerStore(dbFireStore);
    popupSpinnerModal = true;
    await fetchGoogleEvents();
    await fetchFirebaseEvents();

    // Rollencheck
    const userDoc = await getDoc(doc(dbFireStore, 'accounts', user.uid));
    console.log('User Data: ', userDoc.data());
    if (!userDoc.exists() || !userDoc.data().roles || !userDoc.data().roles.includes('terminadmin')) {
      console.log('No terminadmin role!');
      popupSpinnerModal = false;
      return;
    }
    terminAdminRole = true;
    popupSpinnerModal = false;
  };
</script>

<!-- UI -->
{#if $currentUser && !popupSpinnerModal && !terminAdminRole}
   <div class="flex justify-center p-8 ">
    <Card class="border-2 border-red-600 bg-red-50 content-center">
      <div class="p-8"    >
        <ExclamationCircleOutline class="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 class="text-xl font-bold mb-4 text-red-700">Zugriff verweigert</h1>
        <p>Du hast leider keine Berechtigung, um diese Seite zu sehen. Bitte wende dich an den Administrator.</p>
      </div>  
    </Card>
   </div>
{/if}
{#if $currentUser && !popupSpinnerModal && terminAdminRole}
  <div class="p-4">
    <Card>
      <h1 class="text-xl font-bold mb-4">Terminübersicht</h1>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label for="fromDate">Von Datum</Label>
          <Input id="fromDate" bind:value={fromDate} />
        </div>
        <div>
          <Label for="toDate">Bis Datum</Label>
          <Input id="toDate" bind:value={toDate} />
        </div>
      </div>
      <GradientButton
        color="cyanToBlue"
        onclick={async () => {
          popupSpinnerModal = true;
          await fetchGoogleEvents();
          await fetchFirebaseEvents();
          popupSpinnerModal = false;
        }}
      >
        Termine neu laden
      </GradientButton>
    </Card>

    <Table class="mt-6 table-fixed">
      <TableHead>
        <TableHeadCell class="w-[15%]">Datum & Uhrzeit</TableHeadCell>
        <TableHeadCell class="w-[30%]">Google Calendar</TableHeadCell>
        <TableHeadCell class="w-[30%]">Firebase</TableHeadCell>
        <TableHeadCell class="w-[25%]">Aktion</TableHeadCell>
      </TableHead>
      <TableBody>
        {#each combinedEvents as entry}
          <TableBodyRow>
            <TableBodyCell class="align-top">{entry.timestamp}</TableBodyCell>
            <TableBodyCell class="align-top">
              {#if entry.google}
                <div class="font-bold break-words">{entry.google.summary}</div>
                <div class="text-sm text-gray-500 break-words whitespace-normal">{entry.google.description}</div>
              {:else}
                <span class="text-gray-400 italic">Kein Eintrag</span>
              {/if}
            </TableBodyCell>
            <TableBodyCell class="align-top">
              {#if entry.firebase}
                <div class="font-bold break-words">{entry.firebase.Veranstaltung}</div>
                <div class="text-sm break-words">
                  Verantworlich: <span class="font-semibold">{entry.firebase.Verantwortlich}</span>
                </div>
                {#if entry.firebase.Abendmahl === '1'}
                  <div class="text-sm text-green-600 font-semibold">Abendmahl: Ja</div>
                {/if}
                <div class="text-sm text-gray-500 break-words whitespace-normal">{entry.firebase.Zusatzinfo}</div>
              {:else}
                <span class="text-gray-400 italic">Nicht vorhanden</span>
              {/if}
            </TableBodyCell>
            <TableBodyCell class="flex flex-col gap-2">
              {#if entry.google && entry.google?.summary.replaceAll(" ", "") !== 'Comboprobe'}
                {#if isSynced(entry.timestamp) && !needsUpdate(entry.google)}
                  <!-- Bereits synchronisiert, keine Änderungen → nur passiv anzeigen -->
                  <span class="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                    <CheckCircleSolid class="h-4 w-4 text-green-600" />
                    Aktuell
                  </span>
                {:else if isSynced(entry.timestamp) && needsUpdate(entry.google)}
                  <!-- Bereits synchronisiert, aber Google-Daten haben sich geändert -->
                  <Button size="xs" color="yellow" onclick={() => syncToFirebase(entry.google)}>
                    <ArrowsRepeatOutline class="mr-2 h-4 w-4" />
                    ↻ Update {entry.google?.summary}
                  </Button>
                  <ul class="mt-1 space-y-1">
                    {#each getChanges(entry.google) as change}
                      <li class="text-xs leading-snug">
                        <span class="font-semibold text-gray-600">{change.field}:</span><br />
                        <span class="line-through text-red-500">{change.old || '–'}</span>
                        <span class="mx-1 text-gray-400">→</span>
                        <span class="text-green-700">{change.new || '–'}</span>
                      </li>
                    {/each}
                  </ul>
                {:else}
                  <!-- Noch nicht synchronisiert -->
                  <Button size="xs" color="blue" onclick={() => syncToFirebase(entry.google)}>
                    <ArrowsRepeatOutline class="mr-2 h-4 w-4" />
                    Sync {entry.google?.summary}
                  </Button>
                {/if}
              {/if}
              {#if entry.google && entry.google?.summary.replaceAll(" ", "") === 'Comboprobe' && isSynced(entry.timestamp)}
                <!-- Comboprobe bereits synchronisiert → nur passiv anzeigen -->
                <span class="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                  <CheckCircleSolid class="h-4 w-4 text-green-600" />
                  Aktuell
                </span>
              {/if}
              {#if !entry.google}
                <Button size="xs" color="red" onclick={() => deleteFromFirebase(entry.timestamp)}>
                  <TrashBinOutline class="mr-2 h-4 w-4" />
                  Löschen
                </Button>
              {:else if entry.google?.summary.replaceAll(" ", "") === 'Comboprobe' && !entry.firebase}
                <Button size="xs" color="yellow" onclick={() => addComboprobe(entry.timestamp)}>
                  <FolderPlusOutline class="mr-2 h-4 w-4" />
                  Sync Comboprobe
                </Button>
              {/if}
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
    <Card class="p-4 sm:p-6 md:p-8">
      <h5 class="mb-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Anleitung für die Terminpflege
      </h5>

      <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">
        Termine werden zuerst im <strong>Meka Google Kalender</strong> eingepflegt und dann hier in den Combo Kalender
        kopiert. Die Google-Beschreibung wird dabei automatisch ausgewertet.
      </p>

      <!-- Gottesdienst -->
      <h6 class="mt-6 mb-2 font-bold text-gray-800 dark:text-gray-200">Gottesdienst</h6>
      <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
        Titel des Termins: beliebiger Gottesdienst-Titel (z.B. <em>Gottesdienst</em>).<br />
        In der <strong>Beschreibung</strong> werden folgende Informationen erkannt:
      </p>

      <div class="mb-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800">
        <p class="mb-1 font-semibold text-gray-700 dark:text-gray-300">Empfohlenes Format (eine Info pro Zeile):</p>
        <pre class="text-xs leading-relaxed text-gray-600 dark:text-gray-400">Stefan FLEISCHNER-JANITS
~ Y
Taufe</pre>
        <p class="mt-2 mb-1 font-semibold text-gray-700 dark:text-gray-300">Auch weiterhin unterstützt (Einzeiler):</p>
        <pre class="text-xs leading-relaxed text-gray-600 dark:text-gray-400">Stefan FLEISCHNER-JANITS, Pfarrer ~ Y, Taufe</pre>
      </div>

      <ul class="mb-4 space-y-3">
        <li class="flex gap-2">
          <CheckCircleSolid class="text-primary-600 dark:text-primary-500 mt-0.5 h-4 w-4 shrink-0" />
          <span class="text-sm text-gray-600 dark:text-gray-400">
            <strong>Name des Predigers / Lektors</strong> — wird automatisch dem Verantwortlichen zugeordnet
            (z.B. <em>Stefan FLEISCHNER-JANITS</em> → SFJ).
            Beim Zeilenformat: Name in einer eigenen Zeile.
          </span>
        </li>
        <li class="flex gap-2">
          <CheckCircleSolid class="text-primary-600 dark:text-primary-500 mt-0.5 h-4 w-4 shrink-0" />
          <span class="text-sm text-gray-600 dark:text-gray-400">
            <strong>Abendmahl</strong> — wird erkannt durch das Zeichen <code class="rounded bg-gray-100 px-1 dark:bg-gray-700">~ Y</code>
            irgendwo in der Beschreibung. Beim Zeilenformat: <code class="rounded bg-gray-100 px-1 dark:bg-gray-700">~ Y</code> in einer eigenen Zeile.
            Kein <code class="rounded bg-gray-100 px-1 dark:bg-gray-700">~ Y</code> = kein Abendmahl.
          </span>
        </li>
        <li class="flex gap-2">
          <CheckCircleSolid class="text-primary-600 dark:text-primary-500 mt-0.5 h-4 w-4 shrink-0" />
          <span class="text-sm text-gray-600 dark:text-gray-400">
            <strong>Zusatzinfo</strong> — alles was nicht Name, Titel oder <code class="rounded bg-gray-100 px-1 dark:bg-gray-700">~ Y</code> ist.
            Beim Zeilenformat: jede übrige Zeile wird als Zusatzinfo übernommen.
            Beim Einzeiler: der Resttext nach dem Entfernen von Name und Abendmahl.
          </span>
        </li>
      </ul>

      <div class="mb-2 rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300">
        <strong>Beispiele Zeilenformat:</strong>
        <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">GD mit Abendmahl + Zusatzinfo</p>
            <pre class="text-xs leading-relaxed">Stefan FLEISCHNER-JANITS
~ Y
Taufe</pre>
          </div>
          <div>
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">GD ohne Abendmahl</p>
            <pre class="text-xs leading-relaxed">Wolfgang WALDSCHÜTZ</pre>
          </div>
          <div>
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">GD mit Zusatzinfo, kein Abendmahl</p>
            <pre class="text-xs leading-relaxed">Tanja DIETRICH-HÜBNER
Jubiläumsgottesdienst</pre>
          </div>
          <div>
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">GD nur Name</p>
            <pre class="text-xs leading-relaxed">Harald GESCHL</pre>
          </div>
        </div>
      </div>

      <!-- Comboprobe -->
      <h6 class="mt-6 mb-2 font-bold text-gray-800 dark:text-gray-200">Comboprobe</h6>
      <ul class="mb-2 space-y-3">
        <li class="flex gap-2">
          <CheckCircleSolid class="text-primary-600 dark:text-primary-500 mt-0.5 h-4 w-4 shrink-0" />
          <span class="text-sm text-gray-600 dark:text-gray-400">
            Titel des Termins muss <strong>Comboprobe</strong> sein — die Beschreibung wird vollständig ignoriert.
            Veranstaltungstyp, Verantwortlicher und Abendmahl werden automatisch gesetzt.
          </span>
        </li>
      </ul>

      <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Sobald die Termine im Google Kalender eingetragen sind, können sie hier in den Combo Kalender kopiert werden.
      </p>
    </Card>
  </div>

  <!-- ============================================================
       Prediger-Verwaltung — eigener breiter Container
       ============================================================ -->
  <div class="px-4 pb-8">
    <Card class="mt-6 p-4 sm:p-6 max-w-none">
      <div class="mb-4 flex items-center justify-between">
        <h5 class="text-xl font-bold text-gray-900 dark:text-white">Prediger &amp; Lektoren</h5>
        <Button size="xs" color="blue" onclick={openNewPrediger}>
          <FolderPlusOutline class="mr-1 h-4 w-4" /> Neu
        </Button>
      </div>

      <!-- Formular (Neu / Bearbeiten) -->
      {#if predigerFormOpen}
        <div bind:this={predigerFormEl} class="mb-6 rounded border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
          <h6 class="mb-3 font-semibold text-gray-800 dark:text-gray-200">
            {predigerEditKuerzel ? `Bearbeiten: ${predigerEditKuerzel}` : 'Neuer Eintrag'}
          </h6>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label for="p-kuerzel" class="mb-1 text-xs">Kürzel *</Label>
              <Input id="p-kuerzel" bind:value={predigerForm.kuerzel}
                disabled={!!predigerEditKuerzel}
                placeholder="z.B. SFJ" />
            </div>
            <div>
              <Label for="p-vorname" class="mb-1 text-xs">Vorname (für Avatar)</Label>
              <Input id="p-vorname" bind:value={predigerForm.vorname} placeholder="z.B. Stefan" />
            </div>
            <div class="sm:col-span-2">
              <Label for="p-langname" class="mb-1 text-xs">Langer Name</Label>
              <Input id="p-langname" bind:value={predigerForm.langname}
                placeholder="z.B. Pfarrer Stefan Fleischner-Janits" />
            </div>
            <div class="sm:col-span-2">
              <Label for="p-varianten" class="mb-1 text-xs">
                Name-Varianten im Google Kalender <span class="font-normal text-gray-400">(komma-getrennt)</span>
              </Label>
              <Input id="p-varianten" bind:value={predigerForm.varianten}
                placeholder="Stefan FLEISCHNER-JANITS, Stefan Fleischner-Janits" />
            </div>
            <div class="sm:col-span-2">
              <Label for="p-avatarUrl" class="mb-1 text-xs">
                Avatar-URL <span class="font-normal text-gray-400">(z.B. Cloudinary-Link)</span>
              </Label>
              <div class="flex items-center gap-3">
                {#if predigerForm.avatarUrl}
                  <img src={predigerForm.avatarUrl} alt="Vorschau" class="h-10 w-10 rounded-full object-cover shrink-0" />
                {/if}
                <Input id="p-avatarUrl" bind:value={predigerForm.avatarUrl}
                  placeholder="https://res.cloudinary.com/…/avatar.jpg" />
              </div>
            </div>
          </div>
          <div class="mt-4 flex gap-2">
            <Button size="xs" color="blue" onclick={savePrediger} disabled={predigerSaving}>
              {predigerSaving ? 'Speichern…' : 'Speichern'}
            </Button>
            <Button size="xs" color="alternative" onclick={() => (predigerFormOpen = false)}>Abbrechen</Button>
          </div>
        </div>
      {/if}

      <!-- Tabelle -->
      <Table class="w-full">
        <TableHead>
          <TableHeadCell class="w-12">Avatar</TableHeadCell>
          <TableHeadCell class="w-20">Kürzel</TableHeadCell>
          <TableHeadCell class="w-56">Langer Name</TableHeadCell>
          <TableHeadCell>Varianten (Google Kalender)</TableHeadCell>
          <TableHeadCell class="w-28">Aktion</TableHeadCell>
        </TableHead>
        <TableBody>
          {#if $predigerList}
            {#each $predigerList as p}
              <TableBodyRow>
                <TableBodyCell>
                  <div class="flex flex-col items-center gap-1">
                    <PredigtAvatar prediger={p.kuerzel} clazz="w-9 h-9 object-cover" />
                    {#if p.avatarUrl}
                      <span class="rounded bg-blue-100 px-1 py-0.5 text-[10px] font-semibold text-blue-700">URL</span>
                    {:else}
                      <span class="rounded bg-gray-100 px-1 py-0.5 text-[10px] font-semibold text-gray-500">statisch</span>
                    {/if}
                  </div>
                </TableBodyCell>
                <TableBodyCell class="font-mono font-semibold">{p.kuerzel}</TableBodyCell>
                <TableBodyCell class="text-sm">{p.langname || '–'}</TableBodyCell>
                <TableBodyCell class="text-xs text-gray-500 break-words">
                  {Array.isArray(p.varianten) ? p.varianten.join(', ') : '–'}
                </TableBodyCell>
                <TableBodyCell>
                  <div class="flex gap-1">
                    <Button size="xs" color="alternative" onclick={() => openEditPrediger(p)}>
                      Bearb.
                    </Button>
                    <Button size="xs" color="red" onclick={() => deletePrediger(p.kuerzel)}>
                      <TrashBinOutline class="h-3 w-3" />
                    </Button>
                  </div>
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          {:else}
            <TableBodyRow>
              <TableBodyCell colspan={5} class="text-center text-sm text-gray-400">Lädt…</TableBodyCell>
            </TableBodyRow>
          {/if}
        </TableBody>
      </Table>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Termine werden neu geladen." />
<!-- <LoginWarn {popupUserAuthModal} /> -->
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
