<script lang="ts">
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Label, Select, Toggle, Button, Modal, Spinner, Card, A } from 'flowbite-svelte';

  import { FileMusicOutline, ListMusicOutline } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';

  import PredigtAvatar from './predigt/PredigtAvatar.svelte';
  import { initPredigerStore, getLongNameFromStore } from './stores/predigerStore.ts';

  import WaitPopup from './popup/WaitPopup.svelte';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import { openMp3, stopMp3 } from './mp3.ts';
  import { openPdf } from './pdf.ts';

  import { getUrl } from './url/url.ts';
  import { comboReihenfolge } from './combo/combo.ts';
  import { initAuth, currentUser, userRoles, authReady } from './stores/authStore.ts';
  import { initAppCheck, getDb } from './firebase/firebase.ts';

  import { getStorage, ref as stref, getDownloadURL } from 'firebase/storage';
  import { getFunctions, httpsCallable } from "firebase/functions";
  import { doc, getDoc } from 'firebase/firestore';
  import type { Firestore } from 'firebase/firestore';
  import {
    getDatabase,
    ref as dbref,
    onValue,
    query,
    orderByKey,
    startAt,
    endAt,
  } from 'firebase/database';

  import dayjs from 'dayjs';

  interface TerminItem {
    Termin: string;
    Abendmahl?: string;
    Verantwortlich?: string;
    LiedAuswahl?: Array<Record<string, unknown>>;
    name: string;
    value: string;
    [key: string]: unknown;
  }

  interface LiederauswahlItem {
    Beschreibung?: string;
    Liedtext?: string;
    Titel?: string;
    Dateiname?: string;
    MP3?: string;
    lied_liste_nummer?: string;
    [key: string]: unknown;
  }

  let selectedTermin: string | undefined;
  let lastSelectedTermin: string | undefined;
  let liederauswahl: LiederauswahlItem[] | undefined;
  let termine: TerminItem[] | undefined;

  /** lied_liste_nummer → zuletzt gespieltes Datum (YYYY-MM-DD) */
  let lastPlayedMap: Map<string, string> = new Map();

  const weeksAgo = (dateStr: string | undefined): string => {
    if (!dateStr) return 'vor mehr als 1 Jahr oder noch nie';
    const weeks = dayjs().diff(dayjs(dateStr), 'week');
    if (weeks > 52) return 'vor mehr als 1 Jahr oder noch nie';
    return weeks === 0 ? 'diese Woche' : weeks === 1 ? 'vor 1 Woche' : `vor ${weeks} Wochen`;
  };

  let verantwortlich: string | undefined;
  let popupSpinnerModal = false;
  let liedTextModal = false;
  let liedText: string | undefined;
  let liedTextTitel: string | undefined;

  let storage: ReturnType<typeof getStorage>;
  let dbFireStore: Firestore;

  let showComboProben = false;

  let alleTermine: TerminItem[];
  let dataLoaded = false;

  const loadLieder = async (termin: TerminItem) => {
    console.log('Selected Termin: ', termin);

    verantwortlich = termin.Verantwortlich;
    selectedTermin = termin.Termin;
    lastSelectedTermin = selectedTermin;

    if (!termin.LiedAuswahl) {
      console.log('Keine Liedauswahl vorhanden!');
      popupSpinnerModal = false;
      return;
    }

    // Sortiere die Lieder und füge Beschreibungen in einem Schritt hinzu
    const sortedLieder = termin.LiedAuswahl
      .sort((a: any, b: any) => parseInt(a.lied_im_GD_nummer) - parseInt(b.lied_im_GD_nummer))
      .map((l: any) => ({
        ...l,
        Beschreibung: comboReihenfolge.find(f => f.Reihenfolge == l.lied_im_GD_nummer)?.Beschreibung
      }));

    // Lade alle Lieder parallel statt sequentiell
    try {
      const liederPromises = sortedLieder.map((l: any) => 
        getDoc(doc(dbFireStore, 'lieder', l.lied_liste_nummer))
          .then(docSnap => docSnap.exists() ? { ...l, ...docSnap.data() } : null)
      );

      const liederResults = await Promise.all(liederPromises);
      liederauswahl = liederResults.filter(lied => lied !== null);
    } catch (error) {
      console.error('Fehler beim Laden der Lieder:', error);
    }

    popupSpinnerModal = false;
  };

  const testUrl = async (app: ReturnType<typeof initAppCheck>) => {
    const functions = getFunctions(app);
    // connectFunctionsEmulator(functions, "localhost", 5001);
    const getAudioUrl = httpsCallable(functions, 'getAudioUrl');
    try {
      const result = await getAudioUrl({ fileName: 'Wenn_du_f_r_mich_bist' });
      console.log('Result: ', result);
    } catch (error) {
      console.error('Error calling function:', error);
    }
  };

  onMount(() => {
    console.log('FireBase');
    initAuth();
  });

  // Reaktiv: sobald User eingeloggt → Daten laden (einmalig)
  $: if ($currentUser && !dataLoaded) {
    dataLoaded = true;
    loadData($currentUser);
  }

  const loadData = (_user: unknown) => {
    const app = initAppCheck();
    storage = getStorage(app);
    console.log('onMount');
    popupSpinnerModal = true;
    dbFireStore = getDb();
    initPredigerStore(dbFireStore);

    const dbRealtime = getDatabase(app);
    const fromDate = dayjs().subtract(4, 'weeks').format('YYYY-MM-DD');
    const toDate = dayjs().add(4, 'weeks').format('YYYY-MM-DD');

    const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate), endAt(toDate));

    // Lade Historie (letzte 52 Wochen) für "zuletzt gespielt"-Berechnung
    const historyFromDate = dayjs().subtract(52, 'weeks').format('YYYY-MM-DD');
    const historyToDate = dayjs().format('YYYY-MM-DD');
    const historyRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(historyFromDate), endAt(historyToDate));
    onValue(historyRef, (snap) => {
      if (!snap?.val()) return;
      const newMap = new Map<string, string>();
      for (const termin of Object.values(snap.val()) as TerminItem[]) {
        if (termin.Verantwortlich === 'COM') continue;
        if (!termin.LiedAuswahl || !Array.isArray(termin.LiedAuswahl)) continue;
        for (const eintrag of termin.LiedAuswahl) {
          const id = String(eintrag.lied_liste_nummer);
          const prev = newMap.get(id);
          if (!prev || termin.Termin > prev) newMap.set(id, termin.Termin);
        }
      }
      lastPlayedMap = newMap;
    }, { onlyOnce: true });

    onValue(dbRef, async (snapshot) => {
      if (snapshot) {
        alleTermine = Object.values(snapshot.val() ?? {}).map((t: any) => ({
          ...t,
          name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''),
          value: t.Termin,
        }));
        console.log('Alle Termine: ', alleTermine);
        handleTermine();
      }
    });
  };

  const handleTermine = () => {
    window.setTimeout(() => {      
      if(!showComboProben) {
        termine = alleTermine.filter((t) => t.Verantwortlich != 'COM');
      } else {
        termine = alleTermine.filter((t) => t.Verantwortlich == 'COM');
      }
      console.log('Termine: ', termine);

      const now = dayjs().subtract(2, 'days').format('YYYY-MM-DD');
      console.log('Now: ', now);

      const termin = termine.filter((t) => new Date(t.Termin) > new Date(now))[0];
      console.log('Termin: ', termin);
      liederauswahl = undefined;
      loadLieder(termin);
    }, 300);
  };

  const handleSelect = (_sel: unknown) => {
    console.log(_sel);
    popupSpinnerModal = true;
    window.setTimeout(() => {
      // console.log('Sel: ', selectedTermin);
      // console.log('lastSel: ', lastSelectedTermin);

      if (lastSelectedTermin == selectedTermin) return;
      lastSelectedTermin = selectedTermin;
      // console.log('SlTermin: ', JSON.stringify(selectedTermin));
      liederauswahl = undefined;
      const termin = termine?.filter((t) => t.Termin == selectedTermin)[0];
      if (termin) loadLieder(termin);
    }, 300);
  };
</script>

<!-- ═══════ ZUGRIFFSSCHUTZ ═══════ -->
{#if $currentUser && !$userRoles.includes('combo') && !$userRoles.includes('comboadmin') && !$userRoles.includes('admin') && !popupSpinnerModal}
  <div class="flex justify-center p-8">
    <div class="border-2 border-[#c0392b] bg-[#fce8e8] dark:bg-[#3d1a1a] rounded-lg p-8 text-center">
      <p class="text-xl font-bold mb-4 text-[#c0392b]">Zugriff verweigert</p>
      <p>Diese Seite ist nur für Combo-Mitglieder zugänglich.</p>
    </div>
  </div>
{/if}

<!-- ═══════ HAUPTINHALT ═══════ -->
{#if $currentUser && ($userRoles.includes('combo') || $userRoles.includes('comboadmin') || $userRoles.includes('admin')) && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm p-4">
      <div class="space-x-4 mb-4">
        {#if termine}
          <Label>
            <div class="flex space-x-4 mb-6">
              {#if verantwortlich}
                {#key verantwortlich}
                  <PredigtAvatar prediger={verantwortlich} />
                {/key}
              {/if}
              <div class="space-y-1 font-medium dark:text-white">
                <div>Lieder für den Gottesdienst</div>
                {#if verantwortlich}
                  <div class="text-sm text-[#3a61a0] dark:text-[#93b3e0]">{getLongNameFromStore(verantwortlich)}</div>
                {/if}
              </div>
            </div>
            <Select
              items={termine}
              bind:value={selectedTermin}
              onchange={handleSelect}
              placeholder="Bitte Termin auswählen ..."
            />
          </Label>
        {/if}
      </div>
      
      <Toggle class="pb-4" color="teal" bind:checked={showComboProben} onclick={handleTermine}>Comboproben anzeigen</Toggle>
      
      <div>
        {#if liederauswahl}
          <Table striped={true}>
            <TableHead>
              <TableHeadCell>Lied</TableHeadCell>
              <TableHeadCell>Noten</TableHeadCell>
              <TableHeadCell>Hörprobe</TableHeadCell>
            </TableHead>
            <TableBody>
              {#each liederauswahl as lied}
                <TableBodyRow>
                  <TableBodyCell>
                   <div class="flex items-center gap-2">
                     <span>{lied.Beschreibung}</span>
                     {#if lied.Liedtext}
                       <button
                         class="p-1 rounded-full text-[#93b3e0] hover:text-primary-500 hover:bg-[#dce9f7] dark:hover:bg-[#2c4a7c]/30 transition-colors"
                         title="Liedtext anzeigen"
                         onclick={() => { liedTextModal = true; liedText = lied.Liedtext; liedTextTitel = lied.Titel; }}
                       >
                         <ListMusicOutline size="sm" />
                       </button>
                     {/if}
                   </div>
                 </TableBodyCell>
                 <TableBodyCell class="w-4">
                   <div class="flex flex-col gap-1">
                     <div class="flex flex-row">
                       {#await getDownloadURL(stref(storage, 'lieder/noten/' + lied.Dateiname + '.pdf'))}
                         <p>loading</p>
                       {:then url}
                         <A href={url} target="_blank">
                           <FileMusicOutline size="md" class="mr-2" />
                           <div class="mr-2">
                             {lied.Titel}
                           </div>
                         </A>
                       {/await}
                     </div>
                     <span class="text-xs text-[#93b3e0] dark:text-[#6080a8]">
                       zuletzt gespielt: {weeksAgo(lastPlayedMap.get(String(lied.lied_liste_nummer)))}
                     </span>
                   </div>
                 </TableBodyCell>
                  <TableBodyCell>
                    {#if lied.MP3 != '0'}
                      {#await getDownloadURL(stref(storage, 'lieder/mp3/' + lied.Dateiname + '.mp3'))}
                        <p>loading</p>
                      {:then url}
                        <audio class="audio-border" src={url} controls preload="none" ></audio>
                      {/await}
                    {/if}
                  </TableBodyCell>
                </TableBodyRow>
              {/each}
            </TableBody>
          </Table>
        {:else}
          <div>Noch keine Liedauswahl vorhanden.</div>
        {/if}
      </div>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Liederauswahl wird geladen." />
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />

<!-- ═══════ LIEDTEXT-POPUP ═══════ -->
<Modal title={liedTextTitel ?? ''} bind:open={liedTextModal} outsideclose size="lg">
  {#if liedText}
    <div class="bg-[#f0f5fb] dark:bg-[#1e3257] rounded-lg p-4 text-sm text-[#1e2a3a] dark:text-[#dce9f7] whitespace-pre-wrap max-h-96 overflow-y-auto border border-[#bcd0ed] dark:border-[#2c4a7c]">
      {liedText}
    </div>
  {:else}
    <p class="text-[#93b3e0] text-sm py-2">Kein Liedtext vorhanden.</p>
  {/if}
  {#snippet footer()}
    <Button color="alternative" onclick={() => (liedTextModal = false)}>Schließen</Button>
  {/snippet}
</Modal>

<style>
  :global(html audio::-webkit-media-controls-panel) {
    background-color: #ffffff;
  }

  :global(html.dark audio::-webkit-media-controls-panel) {
    background-color: rgb(94, 98, 104);
    border-radius: 2px;
  }
</style>
