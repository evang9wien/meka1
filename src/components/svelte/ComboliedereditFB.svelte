<script>
  // Anlegen und bearbeitn eines Liedes
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Section } from 'flowbite-svelte-blocks';
  import { Label, Select, Textarea, Input, Button, GradientButton, Checkbox, MultiSelect } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { Fileupload, Helper, Alert } from 'flowbite-svelte';
  import {
    InfoCircleOutline,
    MicrophoneOutline,
    FileMusicOutline,
    PlaySolid,
    PauseSolid,
    PlusOutline,
    TrashBinOutline,
  } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';

  import { getLongName } from './predigt/PredigtConstants.js';

  import { getAuthHeader, isUserAuth } from './auth.js';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';

  import { Modal } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import { getUrl } from './url/url.js';

  import { comboKategorien } from './combo/combo.js';
  import { initAppCheck } from "./firebase/firebase.js";
  import { getStorage, ref as stref, uploadBytes, getDownloadURL, connectStorageEmulator } from 'firebase/storage';
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
  import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
  import {
    getDatabase,
    set,
    ref as dbref,
    onValue,
    query,
    orderByKey,
    limitToLast,
    limitToFirst,
    startAt,
    endAt,
  } from 'firebase/database';

  let popupModal = false;
  let popupErrorModal = false;
  let responseData;
  let popupSpinnerModal = false;
  let popupUserAuthModal = false;
  let popupSpinnerUploadModal = false;
  let popupLiedGespeichert = false;
  let selectedLied;
  let loadedLied = {};
  let userAuth = false;
  let alleLieder;
  let liedGesungen=false;

  let notenPdf;
  let liedMp3;

  let kategorien = [];
  let kategorie;

  let storage;
  let auth;
  let dbFireStore;
  let dbRealtime;
  let popupFireBaseLogin = false;

  onMount(async () => {
    console.log('onMount');
    const app = initAppCheck();
    auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log('No Login');
        popupFireBaseLogin = true;
        return;
      }

      console.log('User Auth');
      userAuth = true;
      storage = getStorage(app);
      dbFireStore = getFirestore(app);

      // userAuth = await isUserAuth();
      // if (!userAuth) {
      //   popupUserAuthModal = true;
      //   return;
      // }
      popupSpinnerModal = true;
      // axios.get(getUrl() + '/root/wp-json/combo/v2/comboliedkat', getAuthHeader()).then((response) => {
      //   kategorien = JSON.parse(response.data);
      // kategorien = kategorien.map((l) => ({ ...l, value: l.Typ, name: l.Typ }));
      kategorien = comboKategorien.map((l) => ({ ...l, value: l.Typ, name: l.Typ }));
      console.log(kategorien);
      // });

      // axios.get(getUrl() + '/root/wp-json/combo/v2/comboLiederListe', getAuthHeader()).then((response) => {
      //   alleLieder = JSON.parse(response.data);
      //   alleLieder = alleLieder.map((t) => ({ ...t, name: t.Titel, value: t.ID }));
      // const docRef = ;
      const liederGes = await getDoc(doc(dbFireStore, 'allelieder', 'gesungen'));
      const comboLieder = [];
      for (const [key, value] of Object.entries(liederGes.data())) {
        comboLieder.push({ name: value, value: key, ID: key });
      }
      const liederNichtGes = await getDoc(doc(dbFireStore, 'allelieder', 'nichtgesungen'));
      const nichtcomboLieder = [];
      for (const [key, value] of Object.entries(liederNichtGes.data())) {
        nichtcomboLieder.push({ name: value, value: key, ID: key });
      }

      alleLieder = comboLieder.concat(nichtcomboLieder);
      alleLieder = alleLieder.sort((a, b) => a.name.localeCompare(b.name));

      console.log('Alle Lieder: ', alleLieder);

      popupSpinnerModal = false;
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('lied_id')) {
        selectedLied = urlParams.get('lied_id');
        console.log('Liedid: ', selectedLied);
        handleSelectLied();
      }
      // });
    });
  });

  const handleSelectLied = async () => {
    window.setTimeout(async () => {
      console.log('Sel: ', selectedLied);
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('lied_id', selectedLied);
      window.history.replaceState({}, '', `${location.pathname}?${urlParams}`);
      popupSpinnerModal = true;
      const liedRef = doc(dbFireStore, 'lieder', selectedLied);
      const docSnap = await getDoc(liedRef);
      if (docSnap.exists()) {
        // console.log('Document data:', docSnap.data());
        loadedLied = { ...docSnap.data() };
        liedGesungen = loadedLied.Aktiv == '1';
        console.log('Lied: ', loadedLied);
        // liederAus.push(o);
        // liederauswahl = liederAus;
        // console.log('Lieder: ', liederauswahl);
      } else {
        // docSnap.data() will be undefined in this case
        console.log('Lied nicht gefunden!');
      }
      // });
      // try {
      //   const response = await axios.get(
      //     getUrl() + '/root/wp-json/combo/v2/comboliedread?lied_id=' + selectedLied,
      //     getAuthHeader()
      //   );

      //   console.log('Lied Res: ', response);
      //   loadedLied = JSON.parse(response.data)[0];
      //   liedGesungen = loadedLied.Aktiv == '1';
      //   console.log('Lied: ', loadedLied);
      // } catch (error) {
      //   console.error('Fehler beim Upload:', error);
      // }
      popupSpinnerModal = false;
    });
  };
  const handleSubmit = async () => {
    // alert('Form submited.');
    let reload = false;
    try {
      console.log('Submit: ', notenPdf, liedMp3);

      if (notenPdf && notenPdf.name && !notenPdf.name.endsWith('.pdf')) {
        alert('Noten müssen pdf sein');
        return;
      }
      if (liedMp3 && liedMp3.name && !liedMp3.name.endsWith('.mp3')) {
        alert('Lied muss mp3 sein');
        return;
      }
      // popupSpinnerUploadModal = true;
      if (!loadedLied.ID) {
        // neues Lied
        const index = (await getDoc(doc(dbFireStore, 'lieder', 'currentindex'))).data().index;
        console.log('Index: ', index);
        loadedLied.ID = '' + index;

        await setDoc(doc(dbFireStore, 'lieder', 'currentindex'), { index: index + 1 });

        loadedLied.Dateiname = loadedLied.Titel.replace(/[^A-Z0-9]/gi, '_');
      }

      console.log('Loaded Lied:', loadedLied);

      loadedLied.Aktiv = liedGesungen ? '1' : '0';
      if (loadedLied.PDF == 0 || loadedLied.PDF == undefined) loadedLied.PDF = notenPdf ? 1 : 0;
      if (loadedLied.MP3 == 0 || loadedLied.MP3 == undefined) loadedLied.MP3 = liedMp3 ? 1 : 0;

      await setDoc(doc(dbFireStore, 'lieder', loadedLied.ID), loadedLied);

      const gesungenRef = doc(dbFireStore, 'allelieder', 'gesungen');
      const nichtgesungenRef = doc(dbFireStore, 'allelieder', 'nichtgesungen');
      const obj = {};
      obj[loadedLied.ID] = loadedLied.Titel;

      const objDel = {};
      objDel[loadedLied.ID] = deleteField();

      console.log('Obj: ', obj);
      if (liedGesungen) {
        await updateDoc(gesungenRef, obj);
        await updateDoc(nichtgesungenRef, objDel);
      } else {
        await updateDoc(nichtgesungenRef, obj);
        await updateDoc(gesungenRef, objDel);
      }

      if (notenPdf && notenPdf.name) {
        const notenRef = stref(storage, 'lieder/noten/' + loadedLied.Dateiname + '.pdf');
        uploadBytes(notenRef, notenPdf).then((snapshot) => {
          console.log('Uploaded Noten: ', loadedLied.Dateiname);
        });
      }
      if (liedMp3 && liedMp3.name) {
        const mp3Ref = stref(storage, 'lieder/mp3/' + loadedLied.Dateiname + '.mp3');
        uploadBytes(mp3Ref, liedMp3).then((snapshot) => {
          console.log('Uploaded MP3: ', loadedLied.Dateiname);
        });
      }
      popupLiedGespeichert=true;

      return;
    } catch (error) {
      console.error('Fehler beim Upload:', error);
      responseData = error;
      reload = false;
      popupErrorModal = true;
    }
    popupSpinnerUploadModal = false;
    if (reload) {
      window.location.reload();
    }
  };
</script>

{#if userAuth && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm p-4">
      <div class="w-80">
        <Select
          items={alleLieder}
          bind:value={selectedLied}
          onchange={handleSelectLied}
          placeholder="Bitte Lied auswählen ..."
        />
      </div>

      <!-- <Section name="crudcreateform"> -->
      <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Lied anlegen oder bearbeiten</h2>
      <form id="liedform" on:submit|preventDefault={handleSubmit}>
        <div class="grid gap-4 sm:grid-cols-2 sm:gap-6">
          <div class="sm:col-span-2">
            <Label for="name" class="mb-2">Titel*</Label>
            <Input type="text" id="name" bind:value={loadedLied.Titel} placeholder="Name des Liedes" required />
          </div>
          <div class="w-full">
            <Checkbox bind:checked={liedGesungen}>Lied im Gottesdienst gesungen</Checkbox>
          </div>
          <div class="w-full">
            <Label for="egnummer" class="mb-2">EG-Nummer</Label>
            <Input type="text" id="egnummer" bind:value={loadedLied.EG} placeholder="Nummer im Gesangbuch" />
          </div>
          <div class="w-full">
            <Label far="kategorie" class="mb-2">Kategorie</Label>
            <Select
              id="kategorie"
              class="mt-2"
              items={kategorien}
              bind:value={loadedLied.Kategorie}
              placeholder="Kategorie"
            />
          </div>
          <div class="sm:col-span-2">
            <Label class="pb-2">Noten*</Label>
            <Fileupload id="noten" name="noten" onchange={(e) => (notenPdf = e.target.files[0])} class="mb-2" />
            <Helper class="mb-2">Bitte die Noten als pdf Datei auswählen!</Helper>
          </div>
          <div class="sm:col-span-2">
            <Label class="pb-2">Hörprobe</Label>
            <Fileupload id="mp3" name="mp3" onchange={(e) => (liedMp3 = e.target.files[0])} class="mb-2" />
            <Helper class="mb-2">Bitte die Hörprobe als mp3 Datei auswählen!</Helper>
          </div>
          <div class="sm:col-span-2">
            <Label for="liedtext" class="mb-2">Liedtext</Label>
            <Textarea id="liedtext" bind:value={loadedLied.Liedtext} placeholder="Liedtext" rows="6" name="liedtext" />
          </div>
          <div class="sm:col-span-2">
            <Label for="liedid" class="mb-2">Lied ID</Label>
            <div id="liedid">{loadedLied.ID}</div>
          </div>
          <div class="sm:col-span-2">
            <Label for="liedfile" class="mb-2">Lied Dateiname</Label>
            <div id="liedfile">{loadedLied.Dateiname}</div>
          </div>
          <GradientButton color="cyanToBlue" type="submit" class="w-32">Speichern</GradientButton>
        </div>
      </form>
      <!-- </Section> -->
    </Card>
  </div>
{/if}

<Modal bind:open={popupSpinnerUploadModal} size="sm" autoclose>
  <div class="text-center">
    <!-- <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" /> -->
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">Bitte warten ...</h3>
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
      <Spinner color="purple" size={8} />&nbsp;Lied wird gespeichert.
    </h3>
  </div>
</Modal>

<Modal bind:open={popupErrorModal} size="xs" autoclose>
  <div class="text-center">
    <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" />
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">Fehler beim Speichern: {responseData}</h3>
    <Button color="alternative">Abbrechen</Button>
  </div>
</Modal>

<Modal bind:open={popupLiedGespeichert} size="xs" autoclose>
  <div class="text-center">
    <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" />
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">Lied wurde gespeichert</h3>
    <Button color="alternative">Schließen</Button>
  </div>
</Modal>

<LoginFirebase {popupFireBaseLogin} {auth} />
<WaitPopup {popupSpinnerModal} message="Liederdaten werden neu geladen." />
