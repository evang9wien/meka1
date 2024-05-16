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

  import { getAuthHeader, isUserAuth } from './auth.js';
  import WaitPopup from './popup/WaitPopup.svelte';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';

  import { getUrl } from './url/url.js';
  import { comboReihenfolge } from './combo/combo.js';

  import { firebaseConfig } from './firebase/firebase.js';

  import { initializeApp } from 'firebase/app';
  import { getStorage, ref as stref, getDownloadURL, connectStorageEmulator } from 'firebase/storage';
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
  import { getFirestore, doc, getDoc } from 'firebase/firestore';
  import {
    getDatabase,
    ref as dbref,
    onValue,
    query,
    orderByKey,
    limitToLast,
    limitToFirst,
    startAt,
    endAt,
  } from 'firebase/database';

  import dayjs from 'dayjs';

  let selectedTermin;
  let lastSelectedTermin;
  let liederauswahl;
  let termine;

  let verantwortlich;
  let userAuth;

  let popupUserAuthModal = false;
  let popupSpinnerModal = false;
  let popupFireBaseLogin = false;
  let liedTextModal = false;
  let liedText;
  let liedTextTitel;

  let storage;
  let auth;
  let dbFireStore;

  let showComboProben = false;

  let alleTermine;

  const loadLieder = async (termin) => {
    console.log('Selected Termin: ', termin);
    if (termin.LiedAuswahl) {
      termin.LiedAuswahl = termin.LiedAuswahl.sort(
        (a, b) => parseInt(a.lied_im_GD_nummer) - parseInt(b.lied_im_GD_nummer)
      );

      termin.LiedAuswahl = termin.LiedAuswahl.map((l) => ({
        ...l,
        Beschreibung: comboReihenfolge.filter((f) => f.Reihenfolge == l.lied_im_GD_nummer)[0].Beschreibung,
      }));
    }
    verantwortlich = termin.Verantwortlich;
    selectedTermin = termin.Termin;
    lastSelectedTermin = selectedTermin;
    // updateStarCount(postElement, data);
    // console.log('Termin: ', termin);
    const liederAus = [];

    // for (const l of termin.LiedAuswahl) {
    if (!termin.LiedAuswahl) {
      console.log('Keine Liedauswahl vorhanden!');
      popupSpinnerModal = false;
      return;
    }
    termin.LiedAuswahl.forEach(async (l) => {
      const liedRef = doc(dbFireStore, 'lieder', l.lied_liste_nummer);
      const docSnap = await getDoc(liedRef);
      if (docSnap.exists()) {
        // console.log('Document data:', docSnap.data());
        const o = { ...l, ...docSnap.data() };
        liederAus.push(o);
        liederauswahl = liederAus;
        // console.log('Lieder: ', liederauswahl);
      } else {
        // docSnap.data() will be undefined in this case
        console.log('No such document!');
      }
    });

    // console.log('Liederauswahl: ', liederauswahl);
    popupSpinnerModal = false;
  };

  onMount(async () => {
    console.log('FireBase');
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        popupFireBaseLogin = true;
        return;
      }

      storage = getStorage(app);

      console.log('onMount');
      popupSpinnerModal = true;
      userAuth = true;
      // userAuth = await isUserAuth();
      // if (!userAuth) {
      //   popupUserAuthModal = true;
      //   return;
      // }

      /// load firebase liederauswahl
      console.log('Read Termine');
      dbFireStore = getFirestore(app);

      const dbRealtime = getDatabase(app);

      const fromDate = dayjs().subtract(4, 'weeks').format('YYYY-MM-DD');
      const toDate = dayjs().add(4, 'weeks').format('YYYY-MM-DD');
      // console.log('Now: ', now.format('YYYY-MM-DD'));

      const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate), endAt(toDate));
      // console.log('Temine: ', dbRef);

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
    });
  });

  const handleTermine = () => {
    window.setTimeout(() => {
      termine = alleTermine.filter((t) => t.Veranstaltung == (showComboProben ? 'CP' : 'GD'));
      console.log('Termine: ', termine);

      const now = dayjs().subtract(2, 'days').format('YYYY-MM-DD');
      console.log('Now: ', now);

      const termin = termine.filter((t) => new Date(t.Termin) > new Date(now))[0];
      console.log('Termin: ', termin);

      loadLieder(termin);
    });
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

{#if userAuth && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
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
              on:change={handleSelect}
              placeholder="Bitte Termin auswählen ..."
            />
          </Label>
        {/if}
      </div>
      <div class="space-x-4 mb-6">
        <Toggle color="teal" bind:checked={showComboProben} on:click={handleTermine}>Comboproben anzeigen</Toggle>
      </div>
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
                        on:click={() => {
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
                        <audio class="audio-border" src={url} controls="controls" preload="none" />
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
<!--<LoginWarn {popupUserAuthModal} />-->
<LoginFirebase {popupFireBaseLogin} {auth} />
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
