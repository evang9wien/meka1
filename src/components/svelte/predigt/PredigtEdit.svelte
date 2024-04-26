<script>
  // https://www.evang9.wien/root/predigten-editieren/
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Label, Select } from 'flowbite-svelte';

  import { GradientButton } from 'flowbite-svelte';
  import { Fileupload, Helper } from 'flowbite-svelte';
  import { Alert } from 'flowbite-svelte';
  import { InfoCircleSolid } from 'flowbite-svelte-icons';
  import { Card } from 'flowbite-svelte';

  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';
  import { Modal } from 'flowbite-svelte';

  import { getAuthHeader, isUserAuth } from '../auth.js';

  import { getImage, getLongName, getImageAvatar } from './PredigtConstants.js';
  import moment from 'moment/min/moment-with-locales';
  import { getStorage, ref as stref, uploadBytes, getDownloadURL, connectStorageEmulator } from 'firebase/storage';
  import { firebaseConfig } from './../firebase/firebase.js';
  import { initializeApp } from 'firebase/app';

  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
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
  import { T } from 'dist/astro/index.9d030681.js';

  let files;
  let termine;
  let selectedTermin;
  let predigten;
  let open = false;
  let predigtEdit = false;

  let storage;

  let predigtMp3;
  let popupSpinnerUploadModal = false;
  onMount(() => {
    console.log('FireBase');
    const app = initializeApp(firebaseConfig);

    storage = getStorage(app);

    const dbRealtime = getDatabase(app);
    const fromDate = moment().subtract(50, 'days').format('YYYY-MM-DD');
    const toDate = moment().format('YYYY-MM-DD');

    // console.log('Now: ', now.format('YYYY-MM-DD'));

    const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate), endAt(toDate));
    onValue(dbRef, async (snapshot) => {
      if (snapshot) {
        termine = Object.values(snapshot.val()).map((t) => ({
          ...t,
          name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''),
          value: t.Termin,
        }));
        termine = termine.map((t) => {
          const url = 'predigten/' + t.Termin.replaceAll(':', '_') + '_Predigt.mp3';
          return { ...t, url: url };
        });

        termine = termine.sort((a, b) => (a.Termin > b.Termin ? -1 : 1));

        console.log('Termine: ', termine);
        // popupSpinnerModal = false;
      }
    });

    const auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('user: ', user);
        if (user.email.includes('eidmanna') || user.email.includes('f.osimk')) predigtEdit = true;
      }
    });

    // axios.get('https://www.evang9.wien/root/wp-json/combo/v1/combotermine?from_date=-50&to_date=0').then((response) => {
    //   termine = JSON.parse(response.data);
    //   termine = termine.map((t) => ({ ...t, name: t.Termin, value: t.Termin }));
    // });

    // axios.get('https://www.evang9.wien/root/wp-json/combo/v2/ispredigtedit', getAuthHeader()).then((response) => {
    //   predigtEdit = true;
    // });

    // loadPredigten();
  });

  // function loadPredigten() {
  //   axios.get('https://www.evang9.wien/root/wp-json/combo/v1/getpredigten').then((response) => {
  //     predigten = Object.values(JSON.parse(response.data)).sort((a, b) => (a < b ? 1 : -1));

  //     console.log(predigten);
  //   });
  // }

  function submitForm() {
    console.log('submit form');
    open = false;
    if (selectedTermin == '' || predigtMp3 == undefined) {
      // alert('Bitte den Termin auswählen.');
      open = true;
      return;
    }

    const termin = termine.filter((t) => t.Termin == selectedTermin)[0];

    console.log('Sel Termin: ', termin);

    const predigtRef = stref(storage, termin.url);
    popupSpinnerUploadModal = true;
    uploadBytes(predigtRef, predigtMp3).then((snapshot) => {
      popupSpinnerUploadModal = false;
      console.log('Uploaded file: ', termin.url);
      // trigger UI reload
      termine = termine;
    });

    // predigten = undefined;
    // const dataArray = new FormData();
    // dataArray.append('termin', selectedTermin);
    // dataArray.append('uploadFile', files[0]);

    // const token = localStorage.getItem('jwt');

    // fetch('https://www.evang9.wien/root/wp-json/combo/v2/savepredigt', {
    //   method: 'POST',
    //   body: dataArray,
    //   headers: {
    //     Authorization: 'Bearer ' + token,
    //   },
    // })
    //   .then((response) => {
    //     console.log(response);
    //     selectedTermin = '';
    //     files = undefined;
    //     loadPredigten();
    //   })
    //   .catch((error) => {
    //     console.log(error);
    //   });
  }

  function getName(termin) {
    const langName = getLongName(termin.Verantwortlich);

    return langName ? langName : termin.Verantwortlich;
  }

  // function getImgAvatar(termin) {
  //   const name = termine.filter((f) => f.Termin == termin && f.Veranstaltung == 'GD');

  //   if (!name[0]) return '';

  //   return getImageAvatar(name[0].Verantwortlich);
  // }

  function getDate(date) {
    moment.locale('de');
    return moment(new Date(date)).format('dddd, Do MMMM  YYYY, H:mm ');
  }
</script>

<div class="flex justify-center mb-6">
  <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
    <!-- <Dialog
  bind:open
  aria-labelledby="simple-title"
  aria-describedby="simple-content"
>
  <Title id="simple-title">Hinweis</Title>
  <DialogContent id="simple-content">Bitte den Termin und die Predigt (in mp3 Format) auswählen.</DialogContent>
  <DialogActions>
    <Button>
      <Label>Ok</Label>
    </Button>
  </DialogActions>
</Dialog> -->

    <div>
      {#if termine}
        {#if predigtEdit}
          <form id="predigtform" on:submit|preventDefault={submitForm}>
            <Card>
              Administrator-Modus:
              {#if open}
                <Alert border class="mb-2">
                  <InfoCircleSolid slot="icon" class="w-4 h-4" color="red" />
                  <span class="font-medium">Achtung!</span>
                  Bitte den Termin und die Predigt (in mp3 Format) auswählen.
                </Alert>
              {/if}
              <Label class="pb-2">Upload der Predigt</Label>
              <Select class="mb-2" placeholder="Termin" bind:value={selectedTermin} items={termine}></Select>
              <Fileupload
                id="predigt"
                name="predigt"
                on:change={(e) => (predigtMp3 = e.target.files[0])}
                class="mb-2"
              />
              <Helper class="mb-2">Bitte die Predigt als mp3 Datei auswählen!.</Helper>

              <GradientButton color="cyanToBlue" type="submit">Speichern</GradientButton>
            </Card>
          </form>
          <br />
        {/if}
        <Table aria-label="Liederliste">
          <TableBody>
            {#each termine as termin}
              <!-- {#if getName(predigt.split('_')[0]) != ''} -->
              {#await getDownloadURL(stref(storage, termin.url))}
                <p>loading</p>
              {:then url}
                <TableBodyRow>
                  <TableBodyCell>
                    <div class="w-12">
                      <Avatar
                        size="md"
                        src="https://www.evang9.wien/comboapps/img/{getImageAvatar(termin.Verantwortlich)}"
                      />
                    </div>
                  </TableBodyCell>
                  <TableBodyCell>
                    <div class="flex space-x-4 text-base font-normal text-gray-400 dark:text-gray-300">
                      {getDate(termin.Termin)}
                    </div>
                    <div class="flex space-x-4 text-base font-semibold text-gray-500 dark:text-gray-400">
                      {getName(termin)}
                    </div>

                    <audio controls src={url}></audio>

                    <!-- <audio
                    id="player"
                    class="audio-border"
                    src="https://www.evang9.wien/predigten/{predigt}"
                    controls="controls"
                  /> -->
                  </TableBodyCell>
                </TableBodyRow>
              {/await}
              <!-- {/if} -->
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
<Modal bind:open={popupSpinnerUploadModal} size="sm" autoclose>
  <div class="text-center">
    <!-- <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" /> -->
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">Bitte warten ...</h3>
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
      <Spinner color="purple" size={8} />&nbsp;Predigt wird hochgeladen.
    </h3>
  </div>
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
