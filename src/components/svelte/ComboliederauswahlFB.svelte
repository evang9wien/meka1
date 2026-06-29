<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Label, Select, Toggle } from 'flowbite-svelte';
  import { Button, Modal } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { A } from 'flowbite-svelte';

  import { MicrophoneOutline, FileMusicOutline, PlaySolid, PauseSolid, ListMusicOutline } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Popover } from 'flowbite-svelte';

  import { getImageAvatar, getLongName } from './predigt/PredigtConstants.js';
  import PredigtAvatar from './predigt/PredigtAvatar.svelte';

  import WaitPopup from './popup/WaitPopup.svelte';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';

  import { getUrl } from './url/url.js';
  import { comboReihenfolge } from './combo/combo.js';
  import { initAuth, currentUser, userRoles, authReady } from './stores/authStore.js';
  import { initAppCheck } from './firebase/firebase.js';

  import { getStorage, ref as stref, getDownloadURL } from 'firebase/storage';
  import { getFunctions, httpsCallable } from "firebase/functions";
  import { getFirestore, doc, getDoc } from 'firebase/firestore';
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

  let selectedTermin;
  let lastSelectedTermin;
  let liederauswahl;
  let termine;

  let verantwortlich;
  let popupSpinnerModal = false;
  let liedTextModal = false;
  let liedText;
  let liedTextTitel;

  let storage;
  let dbFireStore;

  let showComboProben = false;

  let alleTermine;
  let dataLoaded = false;

  const loadLieder = async (termin) => {
    console.log('Selected Termin: ', termin);
    if (!termin.LiedAuswahl) {
      console.log('Keine Liedauswahl vorhanden!');
      popupSpinnerModal = false;
      return;
    }

    verantwortlich = termin.Verantwortlich;
    selectedTermin = termin.Termin;
    lastSelectedTermin = selectedTermin;

    // Sortiere die Lieder und füge Beschreibungen in einem Schritt hinzu
    const sortedLieder = termin.LiedAuswahl
      .sort((a, b) => parseInt(a.lied_im_GD_nummer) - parseInt(b.lied_im_GD_nummer))
      .map(l => ({
        ...l,
        Beschreibung: comboReihenfolge.find(f => f.Reihenfolge == l.lied_im_GD_nummer)?.Beschreibung
      }));

    // Lade alle Lieder parallel statt sequentiell
    try {
      const liederPromises = sortedLieder.map(l => 
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

  const testUrl = async (app) => {   
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

  const loadData = (user) => {
    const app = initAppCheck();
    storage = getStorage(app);
    console.log('onMount');
    popupSpinnerModal = true;
    dbFireStore = getFirestore(app);

    const dbRealtime = getDatabase(app);
    const fromDate = dayjs().subtract(4, 'weeks').format('YYYY-MM-DD');
    const toDate = dayjs().add(4, 'weeks').format('YYYY-MM-DD');

    const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate), endAt(toDate));

    onValue(dbRef, async (snapshot) => {
      if (snapshot) {
        alleTermine = Object.values(snapshot.val()).map((t) => ({
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

  const handleSelect = (sel) => {
    console.log(sel);
    popupSpinnerModal = true;
    window.setTimeout(() => {
      // console.log('Sel: ', selectedTermin);
      // console.log('lastSel: ', lastSelectedTermin);

      if (lastSelectedTermin == selectedTermin) return;
      lastSelectedTermin = selectedTermin;
      // console.log('SlTermin: ', JSON.stringify(selectedTermin));
      liederauswahl = undefined;
      const termin = termine.filter((t) => t.Termin == selectedTermin)[0];
      loadLieder(termin);
    }, 300);
  };
</script>

<!-- ═══════ ZUGRIFFSSCHUTZ ═══════ -->
{#if $currentUser && !$userRoles.includes('combo') && !$userRoles.includes('comboadmin') && !$userRoles.includes('admin') && !popupSpinnerModal}
  <div class="flex justify-center p-8">
    <div class="border-2 border-red-600 bg-red-50 rounded-lg p-8 text-center">
      <p class="text-xl font-bold mb-4 text-red-700">Zugriff verweigert</p>
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
                  <div class="text-sm text-gray-500 dark:text-gray-400">{getLongName(verantwortlich)}</div>
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
          <Table striped="true">
            <TableHead>
              <TableHeadCell>Lied</TableHeadCell>
              <TableHeadCell>Noten</TableHeadCell>
              <TableHeadCell>Hörprobe</TableHeadCell>
            </TableHead>
            <TableBody>
              {#each liederauswahl as lied}
                <TableBodyRow>
                  <TableBodyCell>
                    <div class="flex flex-row">
                      <A
                        onclick={() => {
                          liedTextModal = true;
                          liedText = lied.Liedtext;
                          liedTextTitel = lied.Titel;
                        }}
                      >
                        <div class="mr-2">{lied.Beschreibung}</div>
                        <ListMusicOutline size="md" class="mr-2" />
                      </A>
                    </div>
                  </TableBodyCell>
                  <TableBodyCell class="w-4">
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
                  </TableBodyCell>
                  <TableBodyCell>
                    {#if lied.MP3 != '0'}
                      {#await getDownloadURL(stref(storage, 'lieder/mp3/' + lied.Dateiname + '.mp3'))}
                        <p>loading</p>
                      {:then url}
                        <audio class="audio-border" src={url} controls="controls" preload="none" ></audio>
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
<Modal title={liedTextTitel} bind:open={liedTextModal} autoclose outsideclose>{liedText}</Modal>

<style>
  :global(html audio::-webkit-media-controls-panel) {
    background-color: #ffffff;
  }

  :global(html.dark audio::-webkit-media-controls-panel) {
    background-color: rgb(94, 98, 104);
    border-radius: 2px;
  }
</style>
