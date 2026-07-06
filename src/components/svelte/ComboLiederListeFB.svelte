<script lang="ts">
  import { onMount } from 'svelte';
  import dayjs from 'dayjs';

  import { Select, Input, InputAddon, Button, ButtonGroup, Card, Modal, Spinner, Badge } from 'flowbite-svelte';
  import {
    ExclamationCircleOutline,
    FileMusicOutline,
    EditOutline,
    ChevronRightOutline,
    MusicOutline,
    CalendarMonthOutline,
    FireSolid,
  } from 'flowbite-svelte-icons';

  import LoginFirebase from './auth/LoginFirebase.svelte';
  import WaitPopup from './popup/WaitPopup.svelte';

  import { initAuth, currentUser, authReady } from './stores/authStore.ts';
  import { initAppCheck, getDb } from './firebase/firebase.ts';

  import { getStorage, ref as stref, getDownloadURL } from 'firebase/storage';
  import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
  import type { Firestore } from 'firebase/firestore';
  import { getFunctions, httpsCallable } from 'firebase/functions';
  import {
    getDatabase,
    ref as dbref,
    get,
    query,
    orderByKey,
    startAt,
    endBefore,
  } from 'firebase/database';

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  interface LiedEintrag {
    name: string;
    value: string;
    ID: string;
    Aktiv?: number;
    EG?: string | number;
    Kategorie?: string;
    [key: string]: unknown;
  }

  let liederListe: LiedEintrag[] = [];
  let liederListeAll: LiedEintrag[] = [];
  let liederListeKat: LiedEintrag[] = [];

  let popupSpinnerModal = false;
  let storage: ReturnType<typeof getStorage>;
  let dbFireStore: Firestore;
  let functions: ReturnType<typeof getFunctions>;
  let comboListRole = false;
  let dataLoaded = false;

  let alleLiederTexte: import('firebase/firestore').QuerySnapshot;
  let searchLiederFn: import('firebase/functions').HttpsCallable;
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Spielstatistik aus den letzten 12 Monaten. */
  let spielstatistikMap: Map<string, { count: number; lastPlayed: string }> = new Map();
  const STATISTIK_MONATE = 12;

  onMount(() => {
    initAuth();
  });

  $: if ($currentUser && !dataLoaded) {
    dataLoaded = true;
    loadData($currentUser);
  }

  // ---------------------------------------------------------------------------
  // Daten laden
  // ---------------------------------------------------------------------------
  const loadData = async (user: { uid: string }) => {
    const app = initAppCheck();
    functions = getFunctions(app, 'europe-west1');
    searchLiederFn = httpsCallable(functions, 'searchLieder');
    storage = getStorage(app);
    dbFireStore = getDb();
    popupSpinnerModal = true;

    // Rollencheck
    const userDoc = await getDoc(doc(dbFireStore, 'accounts', user.uid));
    if (!userDoc.exists() || !userDoc.data().roles || !userDoc.data().roles.includes('combolist')) {
      popupSpinnerModal = false;
      return;
    }
    comboListRole = true;

    const [liederGesDoc, liederNichtGesDoc, alleLiederTexteSnap] = await Promise.all([
      getDoc(doc(dbFireStore, 'allelieder', 'gesungen')),
      getDoc(doc(dbFireStore, 'allelieder', 'nichtgesungen')),
      getDocs(collection(dbFireStore, 'lieder')),
    ]);
    alleLiederTexte = alleLiederTexteSnap;

    let comboLieder = [];
    for (const [key, value] of Object.entries(liederGesDoc.data())) {
      comboLieder.push({ name: value, value: key, ID: key });
    }
    comboLieder = comboLieder.map((cl) => ({ ...cl, Aktiv: 1 }));

    const nichtcomboLieder = [];
    for (const [key, value] of Object.entries(liederNichtGesDoc.data())) {
      nichtcomboLieder.push({ name: value, value: key, ID: key });
    }

    liederListeAll = comboLieder.concat(nichtcomboLieder).sort((a, b) => a.name.localeCompare(b.name));
    liederListeKat = liederListeAll.filter((l) => l.Aktiv == 1); // Standardkategorie 'Combolieder'
    liederListe    = liederListeKat;
    appliedFilterKat = filterKat;

    popupSpinnerModal = false;

    // Spielstatistik im Hintergrund nachladen (kein Spinner)
    loadSpielstatistik(getDatabase(initAppCheck()));
  };

  /**
   * Lädt die Spielhäufigkeit + letztes Spieldatum der letzten STATISTIK_MONATE
   * aus combo/termine. Läuft nach dem initialen Render (kein Spinner nötig).
   */
  async function loadSpielstatistik(db: ReturnType<typeof getDatabase>) {
    const fromDate = dayjs().subtract(STATISTIK_MONATE, 'month').format('YYYY-MM-DD');
    const toDate   = dayjs().add(1, 'day').format('YYYY-MM-DD');

    const dbRef = query(
      dbref(db, 'combo/termine'),
      orderByKey(),
      startAt(fromDate),
      endBefore(toDate)
    );

    try {
      const snapshot = await get(dbRef);
      if (!snapshot?.val()) return;

      /** @type {Map<string, { count: number, lastPlayed: string }>} */
      const map = new Map();

      for (const termin of Object.values(snapshot.val())) {
        if (!termin.LiedAuswahl || !Array.isArray(termin.LiedAuswahl)) continue;
        for (const eintrag of termin.LiedAuswahl) {
          const id = String(eintrag.lied_liste_nummer);
          if (!id || id === 'undefined') continue;

          const prev = map.get(id);
          const date = termin.Termin ?? '';
          if (!prev) {
            map.set(id, { count: 1, lastPlayed: date });
          } else {
            map.set(id, {
              count: prev.count + 1,
              lastPlayed: date > prev.lastPlayed ? date : prev.lastPlayed,
            });
          }
        }
      }

      spielstatistikMap = map; // triggers reactive update
    } catch (e) {
      console.error('Fehler beim Laden der Spielstatistik:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Filter
  // ---------------------------------------------------------------------------
  let filterNoten = '';
  let filterLiedtext = '';
  let filterKat = 'Combolieder';

  /** true = Filterwerte haben sich geändert, aber noch nicht gesucht */
  let filterDirty = false;

  const kategorien = [
    { value: 'Alle Lieder',  name: 'Alle Lieder'      },
    { value: 'Combolieder',  name: 'Gesungene Lieder'  },
  ];

  // Snapshot der zuletzt angewendeten Filterwerte – für Dirty-Vergleich
  let appliedFilterNoten = '';
  let appliedFilterLiedtext = '';
  let appliedFilterKat = 'Combolieder';

  function markDirty() {
    filterDirty =
      filterNoten !== appliedFilterNoten ||
      filterLiedtext !== appliedFilterLiedtext ||
      filterKat !== appliedFilterKat;
  }

  /** Wendet Kategorie-Filter auf liederListeAll an und liefert das Ergebnis. */
  function applyKatFilter(): LiedEintrag[] {
    if (filterKat === 'Alle Lieder') return liederListeAll;
    if (filterKat === 'Combolieder') return liederListeAll.filter((l) => l.Aktiv == 1);
    if (filterKat === 'EG-Lieder')   return liederListeAll.filter((l) => l.EG != 0);
    return liederListeAll.filter((l) =>
      l.Kategorie?.toLowerCase().includes(filterKat.toLowerCase())
    );
  }

  function filterInLiedtext(suchtext: string): string[] {
    const ergebnisse: string[] = [];
    alleLiederTexte.forEach((d) => {
      const data = d.data();
      if (data.Liedtext && data.Liedtext.toLowerCase().includes(suchtext.toLowerCase())) {
        ergebnisse.push(d.id);
      }
    });
    return ergebnisse;
  }

  /**
   * Wird durch den Suchen-Button ausgelöst.
   * Wendet alle drei Filter kombiniert an.
   */
  async function handleSuchen() {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }

    // 1. Kategorie
    let basis = applyKatFilter();
    liederListeKat = basis;

    // 2. Titelsuche
    if (filterNoten.trim().length > 0) {
      basis = basis.filter((l) =>
        l.name.toLowerCase().includes(filterNoten.trim().toLowerCase())
      );
    }

    // 3. Liedtext-Suche (async, ggf. Cloud Function)
    if (filterLiedtext.trim().length >= 2) {
      popupSpinnerModal = true;
      try {
        const result = await searchLiederFn({ searchTerm: filterLiedtext.trim() });
        const ergebnisse: string[] = result.data.results.map((r: { ID: string }) => r.ID);
        basis = basis.filter((l) => ergebnisse.includes(l.ID));
      } catch {
        const ergebnisse = filterInLiedtext(filterLiedtext.trim());
        basis = basis.filter((l) => ergebnisse.includes(l.ID));
      } finally {
        popupSpinnerModal = false;
      }
    }

    liederListe = basis;

    // Dirty-State zurücksetzen
    appliedFilterNoten    = filterNoten;
    appliedFilterLiedtext = filterLiedtext;
    appliedFilterKat      = filterKat;
    filterDirty = false;
  }

  // ---------------------------------------------------------------------------
  // Detail-Popup – lazy (nur beim Öffnen wird Firestore/Storage angefragt)
  // ---------------------------------------------------------------------------
  let detailOpen = false;
  let detailLied: LiedEintrag | null = null;
  /** Firestore-Daten: null=loading, false=nicht vorhanden, object=geladen */
  let detailDaten: Record<string, unknown> | null | false = null;
  let detailLoading = false;
  let mp3UrlPromise: Promise<string> | null = null;
  let notenUrlPromise: Promise<string> | null = null;

  /** Reaktive Spielstatistik für das aktuell geöffnete Lied */
  $: detailStat = detailLied ? spielstatistikMap.get(detailLied.ID) ?? null : null;

  async function openDetail(lied: LiedEintrag) {
    detailLied = lied;
    detailDaten = null;
    detailLoading = true;
    mp3UrlPromise = null;
    notenUrlPromise = null;
    detailOpen = true;

    try {
      const snap = await getDoc(doc(dbFireStore, 'lieder', lied.ID));
      if (snap.exists()) {
        detailDaten = snap.data();
        if (detailDaten.Dateiname) {
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
        <MusicOutline class="text-blue-600" size="lg" />
        <h2 class="text-gray-900 dark:text-white text-xl font-bold">Lieder Liste</h2>
      </div>

      <!-- Filter-Leiste -->
      <div class="flex flex-wrap gap-3 mb-2">
        <ButtonGroup class="flex-1 min-w-40">
          <InputAddon>
            <FileMusicOutline class="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </InputAddon>
          <Input
            bind:value={filterNoten}
            oninput={markDirty}
            placeholder="Suche im Titel"
          />
        </ButtonGroup>

        <ButtonGroup class="flex-1 min-w-40">
          <InputAddon>
            <FileMusicOutline class="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </InputAddon>
          <Input
            bind:value={filterLiedtext}
            oninput={markDirty}
            placeholder="Suche im Liedtext"
          />
        </ButtonGroup>

        <Select class="flex-1 min-w-40" items={kategorien} bind:value={filterKat} onchange={markDirty} />

        <Button color={filterDirty ? 'yellow' : 'blue'} onclick={handleSuchen} class="whitespace-nowrap">
          Suchen{filterDirty ? ' ●' : ''}
        </Button>
      </div>

      {#if filterDirty}
        <p class="mb-4 text-xs text-yellow-600 dark:text-yellow-400">
          Filter geändert – bitte auf „Suchen" klicken, um die Ergebnisse zu aktualisieren.
        </p>
      {:else}
        <div class="mb-4"></div>
      {/if}

      <!-- Anzahl -->
      <div class="mb-3 text-sm text-gray-500 dark:text-gray-400">
        <strong>{liederListe.length}</strong> Lieder
      </div>

      {#if liederListe.length === 0}
        <p class="text-gray-500 dark:text-gray-400">Keine Lieder gefunden.</p>
      {:else}
        <!-- Lieder-Liste -->
        <div class="space-y-2">
          {#each liederListe as lied}
            {@const stat = spielstatistikMap.get(lied.ID)}
            <div class="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:brightness-95 transition-all">

              <!-- Icon – klickbar für Detail-Popup -->
              <button
                class="w-8 flex-shrink-0 flex justify-center p-0 bg-transparent border-none cursor-pointer hover:text-blue-600 transition-colors"
                title="Details anzeigen"
                onclick={() => openDetail(lied)}
              >
                <MusicOutline class="text-blue-400" size="sm" />
              </button>

              <!-- Name – klickbar für Detail-Popup -->
              <div
                class="flex-1 min-w-0 cursor-pointer"
                role="button"
                tabindex="0"
                onclick={() => openDetail(lied)}
                onkeydown={(e) => e.key === 'Enter' && openDetail(lied)}
              >
                <div class="font-semibold text-gray-900 dark:text-white truncate">{lied.name}</div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {#if lied.Aktiv}
                    <span class="text-xs text-blue-500 dark:text-blue-400">Gesungenes Lied</span>
                  {/if}
                  {#if stat}
                    <span class="text-xs text-orange-500 dark:text-orange-400 flex items-center gap-0.5">
                      <FireSolid size="xs" />
                      {stat.count}× in {STATISTIK_MONATE} Mon.
                    </span>
                    <span class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                      <CalendarMonthOutline size="xs" />
                      Zuletzt: {stat.lastPlayed}
                    </span>
                  {/if}
                </div>
              </div>

              <!-- Aktionen -->
              <div class="flex items-center gap-1 flex-shrink-0">
                <!-- Detail-Popup öffnen -->
                <button
                  class="p-1 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
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
  title={detailLied?.name ?? ''}
  bind:open={detailOpen}
  outsideclose
  size="lg"
>
  {#if detailLoading}
    <div class="flex justify-center items-center py-10">
      <Spinner size="10" color="blue" />
    </div>

  {:else if detailDaten === false}
    <p class="text-gray-500 dark:text-gray-400 py-4">
      Für dieses Lied sind keine weiteren Details vorhanden.
    </p>

  {:else if detailDaten}
    <div class="space-y-5">

      <!-- Badges: gesungen + Spielstatistik -->
      <div class="flex flex-wrap gap-2 items-center">
        {#if detailLied?.Aktiv}
          <Badge color="blue">Gesungenes Lied</Badge>
        {:else}
          <Badge color="light">Nicht gesungen</Badge>
        {/if}
        {#if detailStat}
          <Badge color="orange">{detailStat.count}× in {STATISTIK_MONATE} Monaten gespielt</Badge>
        {/if}
      </div>

      <!-- Spielstatistik -->
      {#if detailStat}
        <div class="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700">
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Gespielt (letzte {STATISTIK_MONATE} Monate)
          </p>
          <div class="flex flex-wrap gap-4 text-sm">
            <span class="flex items-center gap-1 text-orange-700 dark:text-orange-300 font-semibold">
              <FireSolid size="sm" class="text-orange-500" />
              {detailStat.count}× gespielt
            </span>
            <span class="flex items-center gap-1 text-gray-600 dark:text-gray-300">
              <CalendarMonthOutline size="sm" />
              Zuletzt: <strong>{detailStat.lastPlayed}</strong>
            </span>
          </div>
        </div>
      {:else}
        <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-400">
          In den letzten {STATISTIK_MONATE} Monaten nicht gespielt.
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

      <!-- MP3-Player – lazy, kein Traffic bis Popup öffnet -->
      {#if mp3UrlPromise}
        <div>
          <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Hörprobe</p>
          {#await mp3UrlPromise}
            <div class="flex items-center gap-2 text-sm text-gray-400">
              <Spinner size="4" /> Audio wird geladen …
            </div>
          {:then url}
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

      <!-- Bearbeiten -->
      <div>
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Bearbeiten</p>
        <a
          href="/combo/comboliedereditFBpage?lied_id={detailLied?.ID}"
          class="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-400"
        >
          <EditOutline size="sm" />
          Lied bearbeiten
        </a>
      </div>

    </div>
  {/if}

  {#snippet footer()}
    <Button color="alternative" onclick={closeDetail}>Schließen</Button>
  {/snippet}
</Modal>

<WaitPopup {popupSpinnerModal} message="Liederliste wird geladen." />
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
