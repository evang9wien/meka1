<script lang="ts">
  import { onMount } from 'svelte';
  import dayjs from 'dayjs';
  import 'dayjs/locale/de';

  import { Card, Select, Label, Badge, Tooltip, Toggle } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import {
    AwardSolid,
    FireSolid,
    MicrophoneOutline,
    MusicOutline,
    DrumstickBiteOutline,
    StarSolid,
  } from 'flowbite-svelte-icons';

  import WaitPopup from './popup/WaitPopup.svelte';
  import { initAuth, currentUser, userRoles, authReady } from './stores/authStore.ts';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import { initAppCheck, getDb } from './firebase/firebase.ts';
  import { getDocs, collection } from 'firebase/firestore';
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

  interface RankingEntry {
    shortName: string;
    displayName: string;
    instruments: string[];
    count: number;
  }

  let selectedZeitraum = 6;

  /** Comboproben (17:30-Termine) einschließen – nur für terminadmin sichtbar */
  let includeProben = false;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let popupSpinnerModal = true;
  let dataLoaded = false;
  let ranking: RankingEntry[] = [];
  let totalGottesdienste = 0;
  let totalProben = 0;

  /** ShortName → "Vorname Nachname" */
  let nameMap: Map<string, string> = new Map();

  // Subscription handle
  let unsubscribe: (() => void) | null = null;

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
  const loadAll = async (months: number) => {
    popupSpinnerModal = true;
    const app = initAppCheck();

    // Mitglieder laden → ShortName-Map aufbauen
    const dbFireStore = getDb();
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

  const loadStatistik = (months: number) => {
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
        const alle = Object.values(snapshot.val()) as Record<string, unknown>[];
        // Gesamtzahlen immer aus allen Terminen – unabhängig vom Toggle
        // Comboprobe-Erkennung: Verantwortlich === 'COM' (gleiche Logik wie ComboplanFB)
        totalGottesdienste = alle.filter((t) => t.Verantwortlich !== 'COM').length;
        totalProben        = alle.filter((t) => t.Verantwortlich === 'COM').length;
        ranking = buildRanking(alle, includeProben);
      } else {
        ranking = [];
        totalGottesdienste = 0;
        totalProben = 0;
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
  function parseField(raw: string | undefined | null): string[] {
    if (!raw || !raw.trim() || raw.trim() === '-') return [];

    const starred = [...raw.matchAll(/\*(\S+)\*/g)].map((m) => m[1]);
    if (starred.length > 0) return starred;

    return raw.trim().split(/\s+/).filter((t) => t && t !== '-');
  }

  /**
   * Gibt den Anzeigenamen für einen ShortName zurück.
   * Fallback: ShortName selbst.
   */
  function displayName(shortName: string): string {
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
  function buildRanking(termine: Record<string, unknown>[], withProben: boolean): RankingEntry[] {
    const map = new Map<string, { dates: Set<string>; instruments: Set<string> }>();

    for (const termin of termine) {
      // Comboprobe-Erkennung: Verantwortlich === 'COM' (gleiche Logik wie ComboplanFB)
      const isComboprobe = (termin as Record<string, unknown>).Verantwortlich === 'COM';
      if (isComboprobe && !withProben) continue;

      const date = (termin as Record<string, unknown>).Termin as string;

      for (const inst of INSTRUMENTS) {
        const shortNames = parseField((termin as Record<string, unknown>)[inst.key] as string | undefined);
        for (const sn of shortNames) {
          if (!map.has(sn)) {
            map.set(sn, { dates: new Set(), instruments: new Set() });
          }
          const entry = map.get(sn);
          if (entry) {
            entry.dates.add(date);          // Termin zählen (nur einmal pro Datum)
            entry.instruments.add(inst.label); // Instrument merken
          }
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
  // Platzberechnung (Standard-Competition-Ranking: 1,1,3 … bei Gleichstand)
  // ---------------------------------------------------------------------------

  /**
   * Berechnet für jedes Ranking-Element den Platz nach dem
   * Standard-Competition-Verfahren:
   *   Gleicher Score → gleicher Platz, nächster Platz überspringt.
   *   Beispiel: 10,8,8,7 → Plätze 1,2,2,4
   */
  $: places = (() => {
    const result = [];
    let place = 1;
    for (let i = 0; i < ranking.length; i++) {
      if (i > 0 && ranking[i].count < ranking[i - 1].count) {
        place = i + 1; // Platz = Position + 1 (1-basiert)
      }
      result.push(place);
    }
    return result;
  })();

  function rankStyle(place: number): 'gold' | 'silver' | 'bronze' | null {
    if (place === 1) return 'gold';
    if (place === 2) return 'silver';
    if (place === 3) return 'bronze';
    return null;
  }

  const rankColors: Record<string, string> = {
    gold:   'text-yellow-400',
    silver: 'text-[#6a96d3]',
    bronze: 'text-[#c06000]',
  };
</script>

<!-- ═══════ ZUGRIFFSSCHUTZ ═══════ -->
{#if $currentUser && !popupSpinnerModal && !$userRoles.includes('comboadmin') && !$userRoles.includes('admin')}
  <div class="flex justify-center p-8">
    <Card class="border-2 border-[#c0392b] bg-[#fce8e8] dark:bg-[#3d1a1a]">
      <div class="p-8">
        <ExclamationCircleOutline class="w-16 h-16 text-[#c0392b] mx-auto mb-4" />
        <h1 class="text-xl font-bold mb-4 text-[#c0392b]">Zugriff verweigert</h1>
        <p>Diese Seite ist nur für Combo-Admins zugänglich.</p>
      </div>
    </Card>
  </div>
{/if}

<!-- ═══════ HAUPTINHALT ═══════ -->
{#if $currentUser && !popupSpinnerModal && ($userRoles.includes('comboadmin') || $userRoles.includes('admin'))}
  <div class="flex justify-center mb-6 px-2">
    <Card class="w-full lg:max-w-screen-lg md:max-w-screen-md p-4">

      <!-- Titel -->
      <div class="flex items-center gap-2 mb-4">
        <MusicOutline class="text-primary-600" size="lg" />
        <h2 class="text-[#1e3257] dark:text-[#dce9f7] text-xl font-bold">Combo Statistik</h2>
      </div>

      <!-- Zeitraum-Auswahl -->
      <div class="mb-4 max-w-xs">
        <Label class="mb-1">Zeitraum auswählen</Label>
        <Select
          items={ZEITRAUM_OPTIONS}
          bind:value={selectedZeitraum}
          onchange={handleZeitraumChange}
        />
      </div>

      <!-- Comboproben-Toggle -->
      <div class="mb-6">
        <Toggle
          color="teal"
          bind:checked={includeProben}
          onchange={() => loadStatistik(selectedZeitraum)}
        >
          Comboproben einschließen
        </Toggle>
      </div>

      {#if ranking.length === 0}
        <p class="text-[#3a61a0] dark:text-[#93b3e0]">Keine Daten im gewählten Zeitraum.</p>
      {:else}
       <!-- Hinweis-Banner -->
       <div class="flex flex-wrap gap-3 mb-4">
         <div class="flex items-center gap-2 flex-1 min-w-fit p-3 rounded-lg bg-[#f0f5fb] dark:bg-[#1e3257]/80 border border-[#93b3e0] dark:border-[#2c4a7c]">
           <FireSolid class="text-[#c06000] flex-shrink-0" size="sm" />
           <span class="text-sm text-[#1e3257] dark:text-[#dce9f7]">
             Rangliste · <strong>{ranking.length}</strong> Musiker · max. <strong>{ranking[0]?.count}×</strong> gespielt
           </span>
         </div>
         <div class="flex items-center gap-2 flex-1 min-w-fit p-3 rounded-lg bg-[#dce9f7] dark:bg-[#1e3257] border border-[#bcd0ed] dark:border-[#2c4a7c]">
           <MusicOutline class="text-primary-500 flex-shrink-0" size="sm" />
           <span class="text-sm text-[#1e3257] dark:text-[#bcd0ed]">
             <strong>{totalGottesdienste}</strong> Gottesdienste
           </span>
         </div>
         <div class="flex items-center gap-2 flex-1 min-w-fit p-3 rounded-lg bg-[#f0f5fb] dark:bg-[#111d33] border border-[#93b3e0] dark:border-[#3a61a0]">
           <DrumstickBiteOutline class="text-[#3a61a0] flex-shrink-0" size="sm" />
           <span class="text-sm text-[#2c4a7c] dark:text-[#93b3e0]">
             <strong>{totalProben}</strong> Comboproben
           </span>
         </div>
       </div>

       <!-- Rangliste -->
       <div class="space-y-2">
         {#each ranking as entry, i}
            {@const place = places[i]}
            {@const rank = rankStyle(place)}
            <div
              class="flex items-center gap-3 p-3 rounded-lg border
                {rank === 'gold'   ? 'bg-[#fdf9e8] dark:bg-[#2a2000]/40 border-[#e8cc60]' :
                 rank === 'silver' ? 'bg-[#f0f5fb] dark:bg-[#1e2d40]/40 border-[#93b3e0]' :
                 rank === 'bronze' ? 'bg-[#fff0e0] dark:bg-[#2c1800]/40 border-[#f0a040]' :
                                     'bg-white     dark:bg-[#1e3257]    border-[#bcd0ed] dark:border-[#2c4a7c]'}"
            >
              <!-- Platz -->
              <div class="w-10 flex-shrink-0 flex justify-center items-center">
                {#if rank === 'gold'}
                  <AwardSolid class="text-yellow-400" size="xl" />
                  <Tooltip>Platz 1 🥇</Tooltip>
                {:else if rank === 'silver'}
                  <AwardSolid class="text-[#6a96d3]" size="xl" />
                  <Tooltip>Platz 2 🥈</Tooltip>
                {:else if rank === 'bronze'}
                  <AwardSolid class="text-orange-600" size="lg" />
                  <Tooltip>Platz 3 🥉</Tooltip>
                {:else}
                  <span class="text-sm font-semibold text-[#3a61a0] dark:text-[#93b3e0] w-full text-center">
                    {place}.
                  </span>
                {/if}
              </div>

             <!-- Name + Instrumente -->
             <div class="flex-1 min-w-0">
               <div class="font-semibold text-[#1e3257] dark:text-[#dce9f7] truncate">
                 {entry.displayName}
                 {#if entry.displayName !== entry.shortName}
                   <span class="ml-1 text-xs text-[#6a96d3] dark:text-[#6a96d3]">({entry.shortName})</span>
                 {/if}
               </div>
               <div class="text-xs text-[#3a61a0] dark:text-[#93b3e0] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
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
               <div class="flex-1 bg-[#dce9f7] dark:bg-[#2c4a7c] rounded-full h-2">
                 <div
                   class="h-2 rounded-full bg-primary-500"
                   style="width: {Math.round((entry.count / ranking[0].count) * 100)}%"
                 ></div>
               </div>
             </div>

             <!-- Zählbadge + Stern für Top-3 -->
             <div class="flex items-center gap-1 flex-shrink-0">
               {#if i < 3}
                 <StarSolid class="{rankColors[rank ?? ''] ?? 'text-gray-400'}" size="sm" />
               {/if}
               <Badge color="primary" class="text-sm font-bold px-3 py-1">
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
