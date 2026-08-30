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
    Label,
    Input,
    Select,
    Textarea,
    Button,
    GradientButton,
    Badge,
    Toggle,
    Alert,
    Spinner,
  } from 'flowbite-svelte';
  import {
    TrashBinOutline,
    FolderPlusOutline,
    CheckCircleSolid,
    ExclamationCircleOutline,
    CalendarMonthOutline,
    PlusOutline,
  } from 'flowbite-svelte-icons';

  import { getDatabase, ref as dbref, set, query, orderByKey, startAt, onValue } from 'firebase/database';
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
  // OAuth2 Client-ID (Google Cloud Console → APIs & Dienste → Anmeldedaten)
  // Muss mit dem API-Key-Projekt übereinstimmen und den Redirect auf diese Domain erlauben.
  const GOOGLE_CLIENT_ID =
    '110813316877-n4lna4ahat5ttf51mrvu22s8eb4dncdt.apps.googleusercontent.com';
  const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

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
  let savingIdx: number | null = null;

  // Geladene Firebase-Termine (zur Duplikatprüfung)
  let existingTermine: string[] = [];

  // ---------------------------------------------------------------------------
  // Termin-Typ Optionen
  // ---------------------------------------------------------------------------
  type TerminTyp = 'GD' | 'CP';

  interface TerminRow {
    datum: string;       // YYYY-MM-DD
    uhrzeit: string;     // HH:mm
    typ: TerminTyp;
    lektor: string;      // Kürzel aus predigerList
    abendmahl: boolean;
    kommentar: string;
    saved: boolean;
    error: string;
  }

  function defaultUhrzeit(typ: TerminTyp) {
    return typ === 'GD' ? '10:00' : '17:30';
  }

  function createRow(datum = '', typ: TerminTyp = 'GD'): TerminRow {
    return {
      datum,
      uhrzeit: defaultUhrzeit(typ),
      typ,
      lektor: '',
      abendmahl: false,
      kommentar: '',
      saved: false,
      error: '',
    };
  }

  let rows: TerminRow[] = [createRow()];

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------------------

  function toTimestamp(datum: string, uhrzeit: string): string {
    // Gibt "YYYY-MM-DD HH:mm:ss" in der Europe/Vienna-Zeitzone zurück
    return dayjs.tz(`${datum} ${uhrzeit}`, 'Europe/Vienna').format('YYYY-MM-DD HH:mm:ss');
  }

  function toGoogleDateTimeString(datum: string, uhrzeit: string): string {
    // ISO-8601 mit Vienna-Offset für Google Calendar API
    return dayjs.tz(`${datum} ${uhrzeit}`, 'Europe/Vienna').format();
  }

  function buildFirebasePayload(row: TerminRow) {
    const timestamp = toTimestamp(row.datum, row.uhrzeit);
    if (row.typ === 'CP') {
      return {
        Abendmahl: '',
        Bass: '',
        Combo: '1',
        Drums: '',
        Gitarre: '',
        KS_Koordination: '',
        Melodie: '',
        Tasten: '',
        Termin: timestamp,
        Veranstaltung: 'CP',
        Verantwortlich: 'COM',
        Zusatzinfo: row.kommentar,
      };
    }
    return {
      Abendmahl: row.abendmahl ? '1' : '0',
      Bass: '',
      Combo: '1',
      Drums: '',
      Gitarre: '',
      KS_Koordination: '',
      Melodie: '',
      Tasten: '',
      Termin: timestamp,
      Veranstaltung: 'GD',
      Verantwortlich: row.lektor,
      Zusatzinfo: row.kommentar,
    };
  }

  function buildGoogleDescription(row: TerminRow): string {
    if (row.typ === 'CP') return '';
    const lektorEntry = ($predigerList ?? []).find((p) => p.kuerzel === row.lektor);
    const lektorVariante = lektorEntry?.varianten?.[0] ?? row.lektor;
    const lines: string[] = [];
    if (lektorVariante) lines.push(lektorVariante);
    if (row.abendmahl) lines.push('~ Y');
    if (row.kommentar) lines.push(row.kommentar);
    return lines.join('\n');
  }

  function buildGoogleEvent(row: TerminRow) {
    const start = toGoogleDateTimeString(row.datum, row.uhrzeit);
    const durMin = row.typ === 'GD' ? 75 : 120;
    const end = dayjs.tz(`${row.datum} ${row.uhrzeit}`, 'Europe/Vienna')
      .add(durMin, 'minute')
      .format();
    const summary = row.typ === 'GD' ? 'Sonntagsgottesdienst' : 'Comboprobe';
    return {
      summary,
      description: buildGoogleDescription(row),
      start: { dateTime: start, timeZone: 'Europe/Vienna' },
      end: { dateTime: end, timeZone: 'Europe/Vienna' },
    };
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
        }
      },
    });
  }

  function requestGoogleToken() {
    if (googleTokenClient) {
      googleTokenClient.requestAccessToken({ prompt: '' });
    }
  }

  async function createGoogleCalendarEvent(row: TerminRow): Promise<string | null> {
    if (!googleAccessToken) return null;
    const event = buildGoogleEvent(row);
    try {
      const resp = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );
      if (!resp.ok) {
        const err = await resp.json();
        console.error('Google Calendar Fehler:', err);
        return null;
      }
      const data = await resp.json();
      return data.id as string;
    } catch (e) {
      console.error('Google Calendar Fehler:', e);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Speichern
  // ---------------------------------------------------------------------------

  async function saveRow(idx: number) {
    const row = rows[idx];
    row.error = '';
    row.saved = false;

    if (!row.datum) {
      row.error = 'Datum fehlt.';
      rows = [...rows];
      return;
    }
    if (row.typ === 'GD' && !row.lektor) {
      row.error = 'Bitte einen Lektor auswählen.';
      rows = [...rows];
      return;
    }

    const timestamp = toTimestamp(row.datum, row.uhrzeit);
    if (existingTermine.includes(timestamp)) {
      row.error = `Termin ${timestamp} existiert bereits in Firebase.`;
      rows = [...rows];
      return;
    }

    savingIdx = idx;
    try {
      // 1. Firebase
      const payload = buildFirebasePayload(row);
      await set(dbref(dbRealtime, `combo/termine/${timestamp}`), payload);

      // 2. Google Calendar (nur wenn eingeloggt)
      if (googleSignedIn) {
        const gcalId = await createGoogleCalendarEvent(row);
        if (!gcalId) {
          row.error = 'Firebase OK, aber Google Calendar Fehler.';
        }
      }

      row.saved = true;
      existingTermine = [...existingTermine, timestamp];
    } catch (e: any) {
      row.error = `Fehler: ${e?.message ?? e}`;
    } finally {
      savingIdx = null;
      rows = [...rows];
    }
  }

  async function saveAll() {
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].saved) {
        await saveRow(i);
      }
    }
  }

  function addRow() {
    // Datum des letzten Eintrags + 7 Tage als Vorschlag
    const lastDatum = rows[rows.length - 1]?.datum ?? '';
    let nextDatum = '';
    if (lastDatum) {
      nextDatum = dayjs(lastDatum).add(7, 'day').format('YYYY-MM-DD');
    }
    const lastTyp = rows[rows.length - 1]?.typ ?? 'GD';
    rows = [...rows, createRow(nextDatum, lastTyp)];
  }

  function removeRow(idx: number) {
    rows = rows.filter((_, i) => i !== idx);
    if (rows.length === 0) rows = [createRow()];
  }

  function onTypChange(idx: number) {
    // Uhrzeit anpassen wenn noch Standard-Zeit steht
    const row = rows[idx];
    const current = row.uhrzeit;
    if (current === '10:00' || current === '17:30') {
      rows[idx].uhrzeit = defaultUhrzeit(row.typ);
    }
    rows = [...rows];
  }

  // ---------------------------------------------------------------------------
  // Firebase-Termine laden (zur Duplikatprüfung)
  // ---------------------------------------------------------------------------
  function loadExistingTermine() {
    const fromDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const q = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate));
    onValue(q, (snapshot) => {
      if (snapshot.exists()) {
        existingTermine = Object.keys(snapshot.val());
      } else {
        existingTermine = [];
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Auth / Load
  // ---------------------------------------------------------------------------
  onMount(() => {
    initAuth();
  });

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
    loadExistingTermine();
    popupSpinnerModal = false;

    // Google Sign-In initialisieren sobald Script geladen
    if ((window as any).google?.accounts?.oauth2) {
      initGoogleSignIn();
    } else {
      const script = document.getElementById('google-gis-script');
      if (script) {
        script.addEventListener('load', initGoogleSignIn);
      }
    }
  };
</script>

<!-- Google Identity Services Script -->
<svelte:head>
  <script id="google-gis-script" src="https://accounts.google.com/gsi/client" async defer></script>
</svelte:head>

<!-- Zugriff verweigert -->
{#if $authReady && $currentUser && !terminAdminRole}
  <div class="flex justify-center p-8">
    <Card class="border-2 border-red-600 bg-red-50 content-center">
      <div class="p-8">
        <ExclamationCircleOutline class="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 class="text-xl font-bold mb-4 text-red-700">Zugriff verweigert</h1>
        <p>Du hast leider keine Berechtigung, um diese Seite zu sehen. Bitte wende dich an den Administrator.</p>
      </div>
    </Card>
  </div>
{/if}

<!-- Hauptinhalt -->
{#if terminAdminRole}
  <div class="p-4">
    <!-- Header -->
    <Card class="mb-4 p-4 max-w-none">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Neue Termine anlegen</h1>
          <p class="text-sm text-gray-500 mt-1">
            Termine direkt in Firebase und Google Calendar eintragen — ohne Umweg über Google Calendar.
          </p>
        </div>

        <!-- Google Calendar Login -->
        <div class="flex items-center gap-2">
          {#if googleSignedIn}
            <Badge color="green" class="flex items-center gap-1">
              <CheckCircleSolid class="w-3 h-3 mr-1" /> Google Calendar verbunden
            </Badge>
          {:else}
            <Button size="xs" color="alternative" onclick={requestGoogleToken}>
              <CalendarMonthOutline class="mr-1 h-4 w-4" />
              Mit Google Calendar verbinden
            </Button>
            <span class="text-xs text-gray-400">(optional — für Google Calendar Sync)</span>
          {/if}
        </div>
      </div>
    </Card>

    <!-- Tabelle mit Termineingabe -->
    <Card class="p-0 overflow-visible max-w-none">
      <div class="overflow-x-auto">
        <Table class="w-full">
          <TableHead>
            <TableHeadCell class="w-[140px]">Datum</TableHeadCell>
            <TableHeadCell class="w-[100px]">Uhrzeit</TableHeadCell>
            <TableHeadCell class="w-[220px]">Typ</TableHeadCell>
            <TableHeadCell class="w-[200px]">Lektor / Prediger</TableHeadCell>
            <TableHeadCell class="w-[90px]">Abendmahl</TableHeadCell>
            <TableHeadCell>Kommentar</TableHeadCell>
            <TableHeadCell class="w-[120px]">Aktion</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each rows as row, idx}
              <TableBodyRow class={row.saved ? 'bg-green-50 dark:bg-green-950' : row.error ? 'bg-red-50 dark:bg-red-950' : ''}>
                <!-- Datum -->
                <TableBodyCell class="align-top pt-2">
                  <Input
                    type="date"
                    bind:value={row.datum}
                    size="sm"
                    disabled={row.saved}
                    class="w-full"
                  />
                </TableBodyCell>

                <!-- Uhrzeit -->
                <TableBodyCell class="align-top pt-2">
                  <Input
                    type="time"
                    bind:value={row.uhrzeit}
                    size="sm"
                    disabled={row.saved}
                    class="w-full"
                  />
                </TableBodyCell>

                <!-- Typ -->
                <TableBodyCell class="align-top pt-2">
                  <Select
                    bind:value={row.typ}
                    size="sm"
                    disabled={row.saved}
                    onchange={() => onTypChange(idx)}
                    class="w-full"
                    items={[
                      { value: 'GD', name: '☀️ Gottesdienst' },
                      { value: 'CP', name: '🎸 Comboprobe' },
                    ]}
                  />
                </TableBodyCell>

                <!-- Lektor -->
                <TableBodyCell class="align-top pt-2">
                  {#if row.typ === 'GD'}
                    <Select
                      bind:value={row.lektor}
                      size="sm"
                      disabled={row.saved}
                      class="w-full"
                      items={[
                        { value: '', name: '— Lektor wählen —' },
                        ...($predigerList ?? [])
                          .slice()
                          .sort((a, b) => (a.langname ?? a.kuerzel).localeCompare(b.langname ?? b.kuerzel))
                          .map((p) => ({ value: p.kuerzel, name: p.langname ?? p.kuerzel })),
                      ]}
                    />
                  {:else}
                    <span class="text-xs text-gray-400 italic">– Combo –</span>
                  {/if}
                </TableBodyCell>

                <!-- Abendmahl -->
                <TableBodyCell class="align-top pt-3 text-center">
                  {#if row.typ === 'GD'}
                    <Toggle
                      bind:checked={row.abendmahl}
                      disabled={row.saved}
                      size="small"
                    />
                  {:else}
                    <span class="text-xs text-gray-300">–</span>
                  {/if}
                </TableBodyCell>

                <!-- Kommentar -->
                <TableBodyCell class="align-top pt-2">
                  <Textarea
                    bind:value={row.kommentar}
                    rows={1}
                    disabled={row.saved}
                    placeholder="Bemerkung…"
                    class="w-full text-sm resize-none"
                  />
                </TableBodyCell>

                <!-- Aktionen -->
                <TableBodyCell class="align-top pt-2">
                  <div class="flex flex-col gap-1">
                    {#if row.saved}
                      <Badge color="green" class="flex items-center gap-1">
                        <CheckCircleSolid class="h-3 w-3 mr-1" /> Gespeichert
                      </Badge>
                    {:else}
                      <Button
                        size="xs"
                        color="blue"
                        disabled={savingIdx !== null}
                        onclick={() => saveRow(idx)}
                      >
                        {#if savingIdx === idx}
                          <Spinner size="4" class="mr-1" /> Speichern…
                        {:else}
                          <FolderPlusOutline class="mr-1 h-3 w-3" /> Speichern
                        {/if}
                      </Button>
                    {/if}

                    {#if !row.saved}
                      <Button size="xs" color="red" onclick={() => removeRow(idx)}>
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
          </TableBody>
        </Table>
      </div>

      <!-- Footer-Aktionen -->
      <div class="flex flex-wrap items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
        <Button size="sm" color="alternative" onclick={addRow}>
          <PlusOutline class="mr-1 h-4 w-4" /> Zeile hinzufügen
        </Button>
        <GradientButton color="cyanToBlue" size="sm" onclick={saveAll} disabled={savingIdx !== null}>
          <FolderPlusOutline class="mr-1 h-4 w-4" /> Alle speichern
        </GradientButton>

        {#if !googleSignedIn}
          <Alert color="yellow" class="py-1 px-2 text-xs">
            Google Calendar nicht verbunden — Termine werden nur in Firebase gespeichert.
          </Alert>
        {/if}
      </div>
    </Card>

    <!-- Hinweise -->
    <Card class="mt-4 p-4 sm:p-6 max-w-none">
      <h5 class="mb-3 font-bold text-gray-900 dark:text-white">Hinweise</h5>
      <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
        <li>Termine werden direkt in Firebase unter <code class="bg-gray-100 px-1 rounded">combo/termine</code> gespeichert.</li>
        <li>
          Wenn du mit Google Calendar verbunden bist, wird der Termin auch dort angelegt —
          im Format, das <em>Termin-Admin (Copy)</em> erkennt.
        </li>
        <li>Für <strong>Gottesdienste</strong> bitte immer einen Lektor auswählen.</li>
        <li>
          <strong>Abendmahl</strong> gilt nur für Gottesdienste. Im Google-Kalender wird
          <code class="bg-gray-100 px-1 rounded">~ Y</code> in die Beschreibung eingetragen.
        </li>
        <li>
          <strong>Zeile hinzufügen</strong> übernimmt automatisch das Datum der letzten Zeile + 7 Tage
          und den gleichen Typ.
        </li>
        <li>
          Die <strong>Google Calendar Verbindung</strong> ist optional. Klicke auf
          „Mit Google Calendar verbinden" und erlaube den Zugriff im Pop-up.
          Die Verbindung gilt nur für diese Browser-Session.
        </li>
      </ul>
    </Card>
  </div>
{/if}

<WaitPopup {popupSpinnerModal} message="Daten werden geladen…" />
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
