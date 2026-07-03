<script>
  import { onMount } from 'svelte';
  import dayjs from 'dayjs';
  import 'dayjs/locale/de';

  import { Card, Select, Label, Badge, Tooltip, Modal, Button, Spinner } from 'flowbite-svelte';
  import {
    AwardSolid,
    ExclamationCircleOutline,
    FireSolid,
    MusicOutline,
    StarSolid,
    FileMusicOutline,
    ChevronRightOutline,
  } from 'flowbite-svelte-icons';

  import WaitPopup from './popup/WaitPopup.svelte';
  import { initAuth, currentUser, authReady } from './stores/authStore.js';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import { initAppCheck } from './firebase/firebase.js';
  import { getFirestore, doc, getDoc, collection } from 'firebase/firestore';
  import { getStorage, ref as stref, getDownloadURL } from 'firebase/storage';
  import {
    getDatabase,
    ref as dbref,
    onValue,
    query,
    orderByKey,
    startAt,
    endBefore,
  } from 'firebase/database';

  // ---------------------------------------------------------------------------
  // Zeitraum-Optionen
  // ---------------------------------------------------------------------------
  const ZEITRAUM_OPTIONS = [
    { value: 1,  name: 'Letzter Monat'    },
    { value: 2,  name: 'Letzte 2 Monate'  },
    { value: 3,  name: 'Letzte 3 Monate'  },
    { value: 6,  name: 'Letzte 6 Monate'  },
    { value: 12, name: 'Letzte 12 Monate' },
    { value: 24, name: 'Letzte 24 Monate' },
    { value: 48, name: 'Letzte 48 Monate' },
  ];

  let selectedZeitraum = 2;

  // ---------------------------------------------------------------------------
  // State – Hauptliste
  // ---------------------------------------------------------------------------
  let popupSpinnerModal = true;
  let dataLoaded = false;
  let hitliste = [];

  /** @type {Map<string, string>} ID → Liedtitel */
  let liederMap = new Map();

  let unsubscribe = null;
  let dbRealtime = null;
  let dbFireStore = null;
  let storage = null;
  let comboListRole = false;

  onMount(() => {
    initAuth();
  });

  $: if ($currentUser && !dataLoaded) {
    dataLoaded = true;
    loadAll(selectedZeitraum);
  }

  function handleZeitraumChange() {
    setTimeout(() => loadHitliste(selectedZeitraum), 100);
  }

  /** Lädt alle Liedtitel aus Firestore und danach die Hitliste */
  const loadAll = async (months) => {
    popupSpinnerModal = true;
    const app = initAppCheck();
    dbFireStore = getFirestore(app);
    storage = getStorage(app);

    // Rollencheck
    const userDoc = await getDoc(doc(dbFireStore, 'accounts', $currentUser.uid));
    if (!userDoc.exists() || !userDoc.data().roles || !userDoc.data().roles.includes('combolist')) {
      popupSpinnerModal = false;
      return;
    }
    comboListRole = true;

    // Gesungene Lieder laden
    const liederGes = await getDoc(doc(dbFireStore, 'allelieder', 'gesungen'));
    liederMap = new Map();
    if (liederGes.exists()) {
      for (const [key, value] of Object.entries(liederGes.data())) {
        liederMap.set(String(key), value);
      }
    }
    // Nicht-gesungene Lieder laden (Fallback-Titel)
    const liederNichtGes = await getDoc(doc(dbFireStore, 'allelieder', 'nichtgesungen'));
    if (liederNichtGes.exists()) {
      for (const [key, value] of Object.entries(liederNichtGes.data())) {
        if (!liederMap.has(String(key))) {
          liederMap.set(String(key), value);
        }
      }
    }

    dbRealtime = getDatabase(app);
    loadHitliste(months);
  };

  const loadHitliste = (months) => {
    popupSpinnerModal = true;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    if (!dbRealtime) return;

    const fromDate = dayjs().subtract(months, 'month').format('YYYY-MM-DD');
    const toDate   = dayjs().add(1, 'day').format('YYYY-MM-DD');

    const dbRef = query(
      dbref(dbRealtime, 'combo/termine'),
      orderByKey(),
      startAt(fromDate),
      endBefore(toDate)
    );

    unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot?.val()) {
        const termine = Object.values(snapshot.val());
        hitliste = buildHitliste(termine, months);
      } else {
        hitliste = [];
      }
      popupSpinnerModal = false;
    }, (error) => {
      console.error('Fehler beim Laden der Hitliste:', error);
      popupSpinnerModal = false;
    });
  };

  /**
   * Aggregiert alle gespielten Lieder aus den Terminen zu einer Hitliste.
   * Ab 3 Monaten werden Lieder, die nur einmal gespielt wurden, ausgeblendet.
   */
  function buildHitliste(termine, months) {
    /** @type {Map<string, { count: number, daten: Set<string> }>} */
    const map = new Map();

    for (const termin of termine) {
      if (!termin.LiedAuswahl || !Array.isArray(termin.LiedAuswahl)) continue;

      for (const eintrag of termin.LiedAuswahl) {
        const id = String(eintrag.lied_liste_nummer);
        if (!id || id === 'undefined') continue;

        if (!map.has(id)) {
          map.set(id, { count: 0, daten: new Set() });
        }
        const entry = map.get(id);
        entry.daten.add(termin.Termin);
        entry.count = entry.daten.size;
      }
    }

    let result = Array.from(map.entries()).map(([id, { count, daten }]) => ({
      id,
      titel: liederMap.get(id) || `Lied #${id}`,
      count,
      daten: Array.from(daten).sort().reverse(),
    }));

    // Ab 3 Monaten: Einmal-Spielungen ausblenden
    if (months >= 3) {
      result = result.filter((l) => l.count > 1);
    }

    return result.sort((a, b) => b.count - a.count);
  }

  // ---------------------------------------------------------------------------
  // Platzberechnung (Standard-Competition-Ranking: 1,1,3 … bei Gleichstand)
  // ---------------------------------------------------------------------------
  $: places = (() => {
    const result = [];
    let place = 1;
    for (let i = 0; i < hitliste.length; i++) {
      if (i > 0 && hitliste[i].count < hitliste[i - 1].count) {
        place = i + 1;
      }
      result.push(place);
    }
    return result;
  })();

  function rankStyle(place) {
    if (place === 1) return 'gold';
    if (place === 2) return 'silver';
    if (place === 3) return 'bronze';
    return null;
  }

  const rankColors = {
    gold:   'text-yellow-400',
    silver: 'text-gray-400',
    bronze: 'text-orange-600',
  };

  // ---------------------------------------------------------------------------
  // Detail-Popup – lazy loading (erst beim Öffnen)
  // ---------------------------------------------------------------------------
  let detailOpen = false;

  /**
   * Das aktuell im Popup angezeigte Lied.
   * @type {{ id: string, titel: string, count: number, daten: string[] } | null}
   */
  let detailLied = null;

  /**
   * Firestore-Daten des Liedes (Dateiname, MP3, Liedtext).
   * null = noch nicht geladen / wird gerade geladen
   * false = kein Eintrag in Firestore vorhanden
   */
  let detailDaten = null;
  let detailLoading = false;

  /** Promise für die MP3-URL – wird erst gesetzt wenn detailDaten.Dateiname vorhanden */
  let mp3UrlPromise = null;
  /** Promise für die Noten-URL */
  let notenUrlPromise = null;

  async function openDetail(lied) {
    detailLied = lied;
    detailDaten = null;
    detailLoading = true;
    mp3UrlPromise = null;
    notenUrlPromise = null;
    detailOpen = true;

    try {
      const snap = await getDoc(doc(dbFireStore, 'lieder', lied.id));
      if (snap.exists()) {
        detailDaten = snap.data();

        if (detailDaten.Dateiname) {
          // MP3 und Noten-URLs parallel auflösen
          if (detailDaten.MP3 !== '0' && detailDaten.MP3) {
            mp3UrlPromise = getDownloadURL(stref(storage, 'lieder/mp3/' + detailDaten.Dateiname + '.mp3'));
          }
          notenUrlPromise = getDownloadURL(stref(storage, 'lieder/noten/' + detailDaten.Dateiname + '.pdf'));
        }
      } else {
        detailDaten = false;
      }
    } catch (e) {
      console.error('Fehler beim Laden der Lieddetails:', e);
      detailDaten = false;
    } finally {
      detailLoading = false;
    }
  }

  function closeDetail() {
    detailOpen = false;
    // Kurz warten bis das Modal zu ist, dann State zurücksetzen
    setTimeout(() => {
      detailLied = null;
      detailDaten = null;
      mp3UrlPromise = null;
      notenUrlPromise = null;
    }, 300);
  }
</script>

<!-- ═══════ ZUGRIFFSSCHUTZ ═══════ -->
{#if $currentUser && !popupSpinnerModal && !comboListRole}
  <div class="flex justify-center p-8">
    <Card class="border-2 border-red-600 bg-red-50">
      <div class="p-8">
        <ExclamationCircleOutline class="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 class="text-xl font-bold mb-4 text-red-700">Zugriff verweigert</h1>
        <p>Du hast leider keine Berechtigung, um diese Seite zu sehen. Bitte wende dich an den Administrator.</p>
      </div>
    </Card>
  </div>
{/if}

<!-- ═══════ HAUPTINHALT ═══════ -->
{#if $currentUser && !popupSpinnerModal && comboListRole}
  <div class="flex justify-center mb-6 px-2">
    <Card class="w-full lg:max-w-screen-lg md:max-w-screen-md p-4">

      <!-- Titel -->
      <div class="flex items-center gap-2 mb-4">
        <FireSolid class="text-orange-500" size="lg" />
        <h2 class="text-gray-900 dark:text-white text-xl font-bold">Combo Lieder-Hitliste</h2>
      </div>

      <!-- Zeitraum-Auswahl -->
      <div class="mb-6 max-w-xs">
        <Label class="mb-1">Zeitraum auswählen</Label>
        <Select
          items={ZEITRAUM_OPTIONS}
          bind:value={selectedZeitraum}
          onchange={handleZeitraumChange}
        />
      </div>

      {#if hitliste.length === 0}
        <p class="text-gray-500 dark:text-gray-400">Keine Daten im gewählten Zeitraum.</p>
      {:else}

        <!-- Info-Banner -->
        <div class="flex flex-wrap gap-3 mb-4">
          <div class="flex items-center gap-2 flex-1 min-w-fit p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700">
            <FireSolid class="text-orange-500 flex-shrink-0" size="sm" />
            <span class="text-sm text-orange-800 dark:text-orange-200">
              Hitliste · <strong>{hitliste.length}</strong> Lieder · max. <strong>{hitliste[0]?.count}×</strong> gespielt
            </span>
          </div>
          <div class="flex items-center gap-2 flex-1 min-w-fit p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
            <MusicOutline class="text-blue-500 flex-shrink-0" size="sm" />
            <span class="text-sm text-blue-800 dark:text-blue-200">
              {#if selectedZeitraum >= 3}
                Lieder mit nur 1× Spielung werden ab 3 Monaten ausgeblendet.
              {:else}
                Alle gespielten Lieder werden angezeigt.
              {/if}
            </span>
          </div>
        </div>

        <!-- Rangliste -->
        <div class="space-y-2">
          {#each hitliste as lied, i}
            {@const place = places[i]}
            {@const rank = rankStyle(place)}
            <div
              class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:brightness-95 transition-all
                {rank === 'gold'   ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300' :
                 rank === 'silver' ? 'bg-gray-50   dark:bg-gray-800/40   border-gray-300'   :
                 rank === 'bronze' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300' :
                                     'bg-white     dark:bg-gray-800      border-gray-200 dark:border-gray-700'}"
            >
              <!-- Platz -->
              <div class="w-10 flex-shrink-0 flex justify-center items-center">
                {#if rank === 'gold'}
                  <AwardSolid class="text-yellow-400" size="xl" />
                  <Tooltip>Platz 1 🥇</Tooltip>
                {:else if rank === 'silver'}
                  <AwardSolid class="text-gray-400" size="xl" />
                  <Tooltip>Platz 2 🥈</Tooltip>
                {:else if rank === 'bronze'}
                  <AwardSolid class="text-orange-600" size="lg" />
                  <Tooltip>Platz 3 🥉</Tooltip>
                {:else}
                  <span class="text-sm font-semibold text-gray-500 dark:text-gray-400 w-full text-center">
                    {place}.
                  </span>
                {/if}
              </div>

              <!-- Titel + letztes Datum -->
              <div class="flex-1 min-w-0" role="button" tabindex="0"
                onclick={() => openDetail(lied)}
                onkeydown={(e) => e.key === 'Enter' && openDetail(lied)}
              >
                <div class="font-semibold text-gray-900 dark:text-white truncate">
                  {lied.titel}
                </div>
                {#if lied.daten.length > 0}
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Zuletzt: {lied.daten[0]}
                  </div>
                {/if}
              </div>

              <!-- Fortschrittsbalken -->
              <div class="hidden sm:flex flex-1 items-center gap-2">
                <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    class="h-2 rounded-full bg-orange-400"
                    style="width: {Math.round((lied.count / hitliste[0].count) * 100)}%"
                  ></div>
                </div>
              </div>

              <!-- Zählbadge + Stern für Top-3 + Detail-Button -->
              <div class="flex items-center gap-1 flex-shrink-0">
                {#if i < 3}
                  <StarSolid class="{rankColors[rank] ?? 'text-gray-400'}" size="sm" />
                {/if}
                <Badge color="orange" class="text-sm font-bold px-3 py-1">
                  {lied.count}×
                </Badge>
                <button
                  class="ml-1 p-1 rounded-full text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
                  title="Details anzeigen"
                  onclick={() => openDetail(lied)}
                >
                  <ChevronRightOutline size="sm" />
                </button>
              </div>
            </div>
          {/each}
        </div>

      {/if}

    </Card>
  </div>
{/if}

<!-- ═══════ DETAIL-POPUP ═══════ -->
<Modal
  title={detailLied?.titel ?? ''}
  bind:open={detailOpen}
  outsideclose
  size="lg"
>
  {#if detailLoading}
    <!-- Lade-Indikator -->
    <div class="flex justify-center items-center py-10">
      <Spinner size="10" color="orange" />
    </div>

  {:else if detailDaten === false}
    <!-- Kein Eintrag in Firestore -->
    <p class="text-gray-500 dark:text-gray-400 py-4">
      Für dieses Lied sind keine weiteren Details vorhanden.
    </p>

  {:else if detailDaten}
    <div class="space-y-5">

      <!-- Metadaten-Zeile -->
      <div class="flex flex-wrap gap-2 items-center">
        <Badge color="orange">{detailLied?.count}× gespielt</Badge>
        {#if detailLied?.daten?.length > 0}
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Zuletzt: <strong>{detailLied.daten[0]}</strong>
          </span>
        {/if}
      </div>

      <!-- Alle Spieltermine -->
      {#if detailLied?.daten?.length > 1}
        <div>
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Alle Termine im gewählten Zeitraum
          </p>
          <div class="flex flex-wrap gap-1">
            {#each detailLied.daten as datum}
              <Badge color="light" class="text-xs">{datum}</Badge>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Noten -->
      {#if notenUrlPromise}
        <div>
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Noten</p>
          {#await notenUrlPromise}
            <div class="flex items-center gap-2 text-sm text-gray-400">
              <Spinner size="4" /> Noten werden geladen …
            </div>
          {:then url}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              <FileMusicOutline size="sm" />
              Noten öffnen (PDF)
            </a>
          {:catch}
            <p class="text-xs text-gray-400">Noten nicht verfügbar.</p>
          {/await}
        </div>
      {/if}

      <!-- MP3-Player – nur wenn vorhanden, lazy initialisiert -->
      {#if mp3UrlPromise}
        <div>
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Hörprobe</p>
          {#await mp3UrlPromise}
            <div class="flex items-center gap-2 text-sm text-gray-400">
              <Spinner size="4" /> Audio wird geladen …
            </div>
          {:then url}
            <!-- audio-Element wird erst hier erstellt → kein Traffic bis Popup öffnet -->
            <audio controls src={url} class="w-full"></audio>
          {:catch}
            <p class="text-xs text-gray-400">Hörprobe nicht verfügbar.</p>
          {/await}
        </div>
      {/if}

      <!-- Liedtext -->
      {#if detailDaten.Liedtext}
        <div>
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Liedtext</p>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700">
            {detailDaten.Liedtext}
          </div>
        </div>
      {/if}

    </div>
  {/if}

  {#snippet footer()}
    <Button color="alternative" onclick={closeDetail}>Schließen</Button>
  {/snippet}
</Modal>

<WaitPopup {popupSpinnerModal} message="Hitliste wird geladen." />
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
