<script>
  import { onMount } from 'svelte';
  import dayjs from 'dayjs';
  import 'dayjs/locale/de';

  import { Card, Select, Label, Badge, Tooltip } from 'flowbite-svelte';
  import {
    AwardSolid,
    FireSolid,
    MicrophoneOutline,
    MusicOutline,
    DrumstickBiteOutline,
    StarSolid,
  } from 'flowbite-svelte-icons';

  import WaitPopup from './popup/WaitPopup.svelte';
  import { initAuth, currentUser, authReady } from './stores/authStore.js';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import { initAppCheck } from './firebase/firebase.js';
  import { getFirestore, getDocs, collection } from 'firebase/firestore';
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
  // Instrument-Definitionen (kein Beamer)
  // ---------------------------------------------------------------------------
  const INSTRUMENTS = [
    { key: 'Tasten',  label: 'Tasten',  color: 'blue'   },
    { key: 'Melodie', label: 'Melodie', color: 'purple' },
    { key: 'Gitarre', label: 'Gitarre', color: 'green'  },
    { key: 'Drums',   label: 'Drums',   color: 'red'    },
    { key: 'Bass',    label: 'Bass',    color: 'yellow' },
  ];

  // ---------------------------------------------------------------------------
  // Zeitraum-Optionen
  // ---------------------------------------------------------------------------
  const ZEITRAUM_OPTIONS = [
    { value: 3,  name: 'Letzte 3 Monate'  },
    { value: 6,  name: 'Letzte 6 Monate'  },
    { value: 12, name: 'Letzte 12 Monate' },
    { value: 24, name: 'Letzte 24 Monate' },
    { value: 48, name: 'Letzte 48 Monate' },
  ];

  let selectedZeitraum = 6;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let popupSpinnerModal = true;
  let dataLoaded = false;
  let ranking = [];

  /** @type {Map<string, string>} ShortName → "Vorname Nachname" */
  let nameMap = new Map();

  // Subscription handle
  let unsubscribe = null;

  onMount(() => {
    initAuth();
  });

  $: if ($currentUser && !dataLoaded) {
    dataLoaded = true;
    loadAll(selectedZeitraum);
  }

  function handleZeitraumChange() {
    setTimeout(() => loadStatistik(selectedZeitraum), 100);
  }

  /** Lädt Mitglieder aus Firestore und danach die Statistik */
  const loadAll = async (months) => {
    popupSpinnerModal = true;
    const app = initAppCheck();

    // Mitglieder laden → ShortName-Map aufbauen
    const dbFireStore = getFirestore(app);
    const accountsSnap = await getDocs(collection(dbFireStore, 'accounts'));
    nameMap = new Map();
    accountsSnap.docs.forEach((d) => {
      const a = d.data();
      if (a.ShortName) {
        const fullName = [a.VName, a.FName].filter(Boolean).join(' ');
        nameMap.set(a.ShortName.trim(), fullName || a.ShortName);
      }
    });

    loadStatistik(months);
  };

  const loadStatistik = (months) => {
    popupSpinnerModal = true;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    const app = initAppCheck();
    const dbRealtime = getDatabase(app);

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
        ranking = buildRanking(Object.values(snapshot.val()));
      } else {
        ranking = [];
      }
      popupSpinnerModal = false;
    }, (error) => {
      console.error('Fehler beim Laden der Statistik:', error);
      popupSpinnerModal = false;
    });
  };

  /**
   * Parst einen Feldwert und gibt die zu zählenden ShortNames zurück.
   *
   * Regeln:
   *  - Enthält das Feld einen *Stern*-Eintrag (z.B. "*AP*"), wird NUR dieser gezählt.
   *  - Sonst werden alle durch Leerzeichen getrennten Tokens einzeln gezählt.
   *  - Leere Tokens, "-" werden ignoriert.
   */
  function parseField(raw) {
    if (!raw || !raw.trim() || raw.trim() === '-') return [];

    const starred = [...raw.matchAll(/\*(\S+)\*/g)].map((m) => m[1]);
    if (starred.length > 0) return starred;

    return raw.trim().split(/\s+/).filter((t) => t && t !== '-');
  }

  /**
   * Gibt den Anzeigenamen für einen ShortName zurück.
   * Fallback: ShortName selbst.
   */
  function displayName(shortName) {
    return nameMap.get(shortName) || shortName;
  }

  /**
   * Aggregiert alle Musiker-Einsätze aus den Terminen.
   *
   * Regeln:
   *  - Jeder Musiker kommt nur EINMAL in der Liste vor.
   *  - An einem Termin zählt ein Musiker nur EINMAL, egal in wie vielen
   *    Instrumentspalten er eingetragen ist.
   *  - Instrumente werden über alle Termine gesammelt und dedupliziert angezeigt.
   *  - Sortierung nach Anzahl gespielter Termine (absteigend).
   *
   * @param {object[]} termine
   * @returns {{ shortName:string, displayName:string, instruments:string[], count:number }[]}
   */
  function buildRanking(termine) {
    /**
     * Pro Person: Menge der Termine (dates) + Menge der Instrumente
     * @type {Map<string, { dates: Set<string>, instruments: Set<string> }>}
     */
    const map = new Map();

    for (const termin of termine) {
      // Comboproben nicht mitzählen
      if (termin.Verantwortlich === 'COM') continue;

      const date = termin.Termin; // z.B. "2024-11-03 10:00"

      for (const inst of INSTRUMENTS) {
        const shortNames = parseField(termin[inst.key]);
        for (const sn of shortNames) {
          if (!map.has(sn)) {
            map.set(sn, { dates: new Set(), instruments: new Set() });
          }
          const entry = map.get(sn);
          entry.dates.add(date);          // Termin zählen (nur einmal pro Datum)
          entry.instruments.add(inst.label); // Instrument merken
        }
      }
    }

    return Array.from(map.entries())
      .map(([sn, { dates, instruments }]) => ({
        shortName: sn,
        displayName: displayName(sn),
        instruments: Array.from(instruments),
        count: dates.size,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // ---------------------------------------------------------------------------
  // Platz-Icon
  // ---------------------------------------------------------------------------
  function rankIcon(index) {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return null;
  }

  const rankColors = {
    gold:   'text-yellow-400',
    silver: 'text-gray-400',
    bronze: 'text-orange-600',
  };
</script>

{#if $currentUser && !popupSpinnerModal}
  <div class="flex justify-center mb-6 px-2">
    <Card class="w-full lg:max-w-screen-lg md:max-w-screen-md p-4">

      <!-- Titel -->
      <div class="flex items-center gap-2 mb-4">
        <MusicOutline class="text-purple-600" size="lg" />
        <h2 class="text-gray-900 dark:text-white text-xl font-bold">Combo Statistik</h2>
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

      {#if ranking.length === 0}
        <p class="text-gray-500 dark:text-gray-400">Keine Daten im gewählten Zeitraum.</p>
      {:else}
       <!-- Hinweis-Banner -->
       <div class="flex items-center gap-2 mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700">
         <FireSolid class="text-orange-500 flex-shrink-0" size="sm" />
         <span class="text-sm text-purple-800 dark:text-purple-200">
           Musiker-Rangliste für die letzten <strong>{selectedZeitraum} Monate</strong> —
           {ranking.length} Musiker · {ranking[0]?.count} max. Einsätze
         </span>
       </div>

       <!-- Rangliste -->
       <div class="space-y-2">
         {#each ranking as entry, i}
           {@const rank = rankIcon(i)}
           <div
             class="flex items-center gap-3 p-3 rounded-lg border
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
                   {i + 1}.
                 </span>
               {/if}
             </div>

             <!-- Name + Instrumente -->
             <div class="flex-1 min-w-0">
               <div class="font-semibold text-gray-900 dark:text-white truncate">
                 {entry.displayName}
                 {#if entry.displayName !== entry.shortName}
                   <span class="ml-1 text-xs text-gray-400 dark:text-gray-500">({entry.shortName})</span>
                 {/if}
               </div>
               <div class="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                 {#each entry.instruments as inst}
                   <span class="flex items-center gap-0.5">
                     {#if inst === 'Drums'}
                       <DrumstickBiteOutline size="xs" />
                     {:else if inst === 'Melodie'}
                       <MicrophoneOutline size="xs" />
                     {:else}
                       <MusicOutline size="xs" />
                     {/if}
                     {inst}
                   </span>
                 {/each}
               </div>
             </div>

             <!-- Balken-Fortschritt -->
             <div class="hidden sm:flex flex-1 items-center gap-2">
               <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                 <div
                   class="h-2 rounded-full bg-purple-500"
                   style="width: {Math.round((entry.count / ranking[0].count) * 100)}%"
                 ></div>
               </div>
             </div>

             <!-- Zählbadge + Stern für Top-3 -->
             <div class="flex items-center gap-1 flex-shrink-0">
               {#if i < 3}
                 <StarSolid class="{rankColors[rank] ?? 'text-gray-400'}" size="sm" />
               {/if}
               <Badge color="purple" class="text-sm font-bold px-3 py-1">
                 {entry.count}×
               </Badge>
             </div>
           </div>
         {/each}
       </div>
      {/if}

    </Card>
  </div>
{/if}

<WaitPopup {popupSpinnerModal} message="Statistik wird geladen." />
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
