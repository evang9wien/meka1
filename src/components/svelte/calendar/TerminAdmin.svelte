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
  } from 'flowbite-svelte-icons';

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
  let newRowsTyp: TerminTyp | null = null;

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
    lektor: string;           // Kürzel aus predigerList
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

  function firebaseEntryToRow(entry: any): TerminRow {
    const ts: string = entry.Termin ?? '';
    const [datePart, timePart] = ts.split(' ');
    const uhrzeit = timePart ? timePart.substring(0, 5) : '10:00';
    const typ: TerminTyp = entry.Veranstaltung === 'CP' ? 'CP' : 'GD';
    return {
      datum: datePart ?? '',
      uhrzeit,
      typ,
      lektor: entry.Verantwortlich === 'COM' ? '' : (entry.Verantwortlich ?? ''),
      abendmahl: entry.Abendmahl === '1',
      kommentar: entry.Zusatzinfo ?? '',
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
    return {
      ...instruments,
      Abendmahl: row.abendmahl ? '1' : '0',
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
        }
      },
    });
  }

  function requestGoogleToken() {
    if (googleTokenClient) googleTokenClient.requestAccessToken({ prompt: '' });
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
      return (await resp.json()).id as string;
    } catch (e) { console.error('GCal Fehler:', e); return null; }
  }

  // ---------------------------------------------------------------------------
  // Speichern (neu + edit)
  // ---------------------------------------------------------------------------
  function globalIdx(row: TerminRow): number {
    return rows.indexOf(row);
  }

  async function saveRow(gIdx: number) {
    const row = rows[gIdx];
    row.error = '';
    row.saved = false;

    if (!row.datum) { row.error = 'Datum fehlt.'; rows = [...rows]; return; }
    if (row.typ === 'GD' && !row.lektor) { row.error = 'Bitte Lektor auswählen.'; rows = [...rows]; return; }

    const newTimestamp = toTimestamp(row.datum, row.uhrzeit);

    // Duplikatcheck nur für neue Zeilen (oder bei Timestamp-Änderung beim Edit)
    if (row.isNew || newTimestamp !== row.originalTimestamp) {
      const conflict = rows.find(
        (r, i) => i !== gIdx && !r.isNew && toTimestamp(r.datum, r.uhrzeit) === newTimestamp
      ) || rows.find(
        (r, i) => i !== gIdx && r.isNew && r.saved && toTimestamp(r.datum, r.uhrzeit) === newTimestamp
      );
      if (conflict) {
        row.error = `Timestamp ${newTimestamp} existiert bereits.`;
        rows = [...rows];
        return;
      }
    }

    savingIdx = gIdx;
    try {
      const payload = buildFirebasePayload(row);

      // Bei Edit + Timestamp-Änderung: alten Key löschen
      if (!row.isNew && row.originalTimestamp && row.originalTimestamp !== newTimestamp) {
        await remove(dbref(dbRealtime, `combo/termine/${row.originalTimestamp}`));
      }

      await set(dbref(dbRealtime, `combo/termine/${newTimestamp}`), payload);

      // Google Calendar nur für neue Einträge (kein Update-API implementiert)
      if (row.isNew && googleSignedIn) {
        const gcalId = await createGoogleCalendarEvent(row);
        if (!gcalId) row.error = 'Firebase OK, Google Calendar Fehler.';
      }

      row.originalTimestamp = newTimestamp;
      row.saved = true;
      row.editing = false;
      row.isNew = false;
    } catch (e: any) {
      row.error = `Fehler: ${e?.message ?? e}`;
    } finally {
      savingIdx = null;
      rows = [...rows];
    }
  }

  async function saveAll() {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].editing && !rows[i].saved) {
        await saveRow(i);
      }
    }
  }

  function addRow() {
    // Typ: wenn Filter aktiv ist, neue Zeile passend zum Filter anlegen
    const preferredTyp: TerminTyp = filterTyp !== 'ALL' ? filterTyp : (newRowsTyp ?? 'GD');
    // Datum: letztes sichtbares Datum + 7 Tage als Vorschlag
    const lastVisible = [...filteredRows].reverse().find((r) => r.datum);
    const lastDatum = lastVisible?.datum ?? '';
    const nextDatum = lastDatum ? dayjs(lastDatum).add(7, 'day').format('YYYY-MM-DD') : '';
    rows = [...rows, createNewRow(nextDatum, preferredTyp)];
  }

  function removeRow(gIdx: number) {
    rows = rows.filter((_, i) => i !== gIdx);
  }

  async function deleteExistingRow(gIdx: number) {
    const row = rows[gIdx];
    if (!confirm(`Termin ${row.originalTimestamp} wirklich löschen?`)) return;
    try {
      await remove(dbref(dbRealtime, `combo/termine/${row.originalTimestamp}`));
      rows = rows.filter((_, i) => i !== gIdx);
    } catch (e: any) {
      rows[gIdx].error = `Fehler: ${e?.message ?? e}`;
      rows = [...rows];
    }
  }

  function startEdit(gIdx: number) {
    rows[gIdx].editing = true;
    rows[gIdx].saved = false;
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
            <Button size="xs" color="alternative" onclick={requestGoogleToken}>
              <CalendarMonthOutline class="mr-1 h-4 w-4" /> Mit Google Calendar verbinden
            </Button>
            <span class="text-xs text-gray-400">(optional)</span>
          {/if}
        </div>
      </div>

      <!-- Filter + Typ-Buttons -->
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Anzeigen:</span>
        <ButtonGroup>
          <Button size="xs" color={filterTyp === 'ALL' ? 'blue' : 'alternative'} onclick={() => (filterTyp = 'ALL')}>Alle</Button>
          <Button size="xs" color={filterTyp === 'GD' ? 'blue' : 'alternative'} onclick={() => (filterTyp = 'GD')}>☀️ Gottesdienste</Button>
          <Button size="xs" color={filterTyp === 'CP' ? 'blue' : 'alternative'} onclick={() => (filterTyp = 'CP')}>🎸 Comboproben</Button>
        </ButtonGroup>

        <span class="text-sm font-medium text-gray-700 dark:text-gray-300 ml-4">Neue Zeilen setzen auf:</span>
        <ButtonGroup>
          <Button size="xs" color={newRowsTyp === 'GD' ? 'blue' : 'alternative'} onclick={() => applyTypToAllNew('GD')}>☀️ Alle → GD</Button>
          <Button size="xs" color={newRowsTyp === 'CP' ? 'blue' : 'alternative'} onclick={() => applyTypToAllNew('CP')}>🎸 Alle → CP</Button>
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
                    <Select
                      bind:value={row.typ}
                      size="sm"
                      onchange={() => onTypChange(gIdx)}
                      class="w-full"
                      items={[
                        { value: 'GD', name: '☀️ Gottesdienst' },
                        { value: 'CP', name: '🎸 Comboprobe' },
                      ]}
                    />
                  {:else}
                    <span class="text-sm">{row.typ === 'GD' ? '☀️ Gottesdienst' : '🎸 Comboprobe'}</span>
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
                        ]}
                      />
                    {:else}
                      <span class="text-sm">{($predigerList ?? []).find(p => p.kuerzel === row.lektor)?.langname ?? row.lektor ?? '–'}</span>
                    {/if}
                  {:else}
                    <span class="text-xs text-gray-400 italic">– Combo –</span>
                  {/if}
                </TableBodyCell>

                <!-- Abendmahl -->
                <TableBodyCell class="align-middle text-center">
                  {#if row.typ === 'GD'}
                    {#if row.editing}
                      <Toggle bind:checked={row.abendmahl} size="small" />
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

        {#if !googleSignedIn}
          <Alert color="yellow" class="py-1 px-2 text-xs">
            Google Calendar nicht verbunden — Termine werden nur in Firebase gespeichert.
          </Alert>
        {/if}
      </div>
    </Card>

  </div>
{/if}

<WaitPopup {popupSpinnerModal} message="Daten werden geladen…" />
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
