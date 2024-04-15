<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Label, Select } from 'flowbite-svelte';
  import { Button } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { A } from 'flowbite-svelte';

  import { MicrophoneOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Popover } from 'flowbite-svelte';

  import { getImageAvatar, getLongName } from './predigt/PredigtConstants.js';

  import { getAuthHeader, isUserAuth } from './auth.js';
  import LoginWarn from './auth/LoginWarn.svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';

  import { getUrl } from './url/url.js';
  import { comboReihenfolge } from './combo/combo.js';

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

  import moment from 'moment';

  let selectedTermin;
  let lastSelectedTermin;
  let liederauswahl;
  let termine;

  let verantwortlich;
  let userAuth;

  let popupUserAuthModal = false;
  let popupSpinnerModal = false;
  let popupFireBaseLogin = false;

  let fireBase = true;

  const firebaseConfig = {
    apiKey: 'AIzaSyCCScuVEd_E1vQRPMkCuALcccPbly0JhPc',
    authDomain: 'evang9-combo-4cb8e.firebaseapp.com',
    databaseURL: 'https://evang9-combo-4cb8e-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'evang9-combo-4cb8e',
    storageBucket: 'evang9-combo-4cb8e.appspot.com',
    messagingSenderId: '110813316877',
    appId: '1:110813316877:web:2e6a8789144bb3e5189244',
    measurementId: 'G-RC23VERNJ8',
  };

  let storage;
  let auth;
  let dbFireStore;

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

    console.log('Liederauswahl: ', liederauswahl);
    popupSpinnerModal = false;
  };

  onMount(async () => {
    console.log('FireBase');
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/auth.user
        const uid = user.uid;
        console.log('User:  ', user);
        // ...
      } else {
        // User is signed out
        popupFireBaseLogin = true;
        // ...
      }
    });
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
    const now = moment().subtract(2, 'days').format('YYYY-MM-DD');
    // console.log('Now: ', now.format('YYYY-MM-DD'));

    const dbRefNow = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(now), limitToFirst(1));
    // console.log('Temine: ', dbRef);

    onValue(dbRefNow, async (snapshot) => {
      const termin = Object.values(snapshot.val())[0];
      loadLieder(termin);
      // liederauswahl = liederAus;
      // console.log('Lieder: ', liederauswahl);
      // console.log('liederL: ', liederauswahl.length);
      // liederauswahl.forEach((e) => console.log('E: ', e));
      // console.log('Lieder: ', liederAus);
    });

    const fromDate = moment().subtract(4, 'weeks').format('YYYY-MM-DD');
    const toDate = moment().add(4, 'weeks').format('YYYY-MM-DD');
    // console.log('Now: ', now.format('YYYY-MM-DD'));

    const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate), endAt(toDate));
    // console.log('Temine: ', dbRef);

    onValue(dbRef, async (snapshot) => {
      if (snapshot) {
        termine = Object.values(snapshot.val()).map((t) => ({
          ...t,
          name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''),
          value: t.Termin,
        }));
        console.log('Termine: ', termine);
      }
    });
    // axios.get(getUrl() + '/root/wp-json/combo/v2/comboliederauswahl', getAuthHeader()).then((response) => {
    //   liederauswahl = JSON.parse(response.data);
    //   if (liederauswahl[0]) {
    //     const lied1 = liederauswahl[0];
    //     selectedTermin = lied1.Termin_Liedliste;
    //     lastSelectedTermin = selectedTermin;
    //     // verantwortlich = lied1.Verantwortlich;
    //   }
    //   popupSpinnerModal = false;
    //   console.log('Lieder alt: ', liederauswahl);
    // });
    // axios.get(getUrl() + '/root/wp-json/combo/v1/combotermine?from_date=-30&to_date=30').then((response) => {
    //   termine = JSON.parse(response.data);
    //   // termine = termine.map((t) => ({ ...t, name: t.Termin, value: t.Termin }));
    //   termine = termine.map((t) => ({ ...t, name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''), value: t.Termin }));
    //   console.log(termine);
    // });
  });

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
      // const token = localStorage.getItem('jwt');
      // const authConfig = {
      //   headers: {
      //     Authorization: 'Bearer ' + token,
      //   },
      // };
      // axios
      //   .get(getUrl() + '/root/wp-json/combo/v2/comboliederauswahl?date=' + selectedTermin, authConfig)
      //   .then((response) => {
      //     liederauswahl = JSON.parse(response.data);

      //     if (liederauswahl[0]) {
      //       const lied1 = liederauswahl[0];
      //       verantwortlich = lied1.Verantwortlich;
      //     }
      //     popupSpinnerModal = false;
      //   });
    }, 300);
  };
</script>

{#if userAuth && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
      <div>
        {#if termine}
          <Label>
            <div class="flex space-x-4 mb-6">
              {#if verantwortlich}
                <Avatar src="{getUrl()}/comboapps/img/{getImageAvatar(verantwortlich)}" />
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
                <Popover
                  class="w-72 text-sm font-light text-gray-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400"
                  placement="bottom-start"
                  title="Liedtext: {lied.Titel}"
                  triggeredBy="#B{lied.ID}"
                >
                  <div class="p-3 space-y-2">{lied.Liedtext}</div>
                </Popover>
                <TableBodyRow>
                  <TableBodyCell>
                    <div id="B{lied.ID}">{lied.Beschreibung}</div>
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
                      <div class="flex flex-row">
                        {#await getDownloadURL(stref(storage, 'lieder/mp3/' + lied.Dateiname + '.mp3'))}
                          <p>loading</p>
                        {:then url}
                          <audio controls src={url}></audio>
                        {/await}
                      </div>
                    {/if}
                  </TableBodyCell>
                </TableBodyRow>
              {/each}
            </TableBody>
          </Table>
        {:else}
          <div>
            <Spinner color="gray" />
          </div>
        {/if}
      </div>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Liederauswahl wird geladen." />
<!--<LoginWarn {popupUserAuthModal} />-->
<LoginFirebase {popupFireBaseLogin} {auth} />
