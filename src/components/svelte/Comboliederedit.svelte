<script>
  // Anlegen und bearbeitn eines Liedes
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Section } from 'flowbite-svelte-blocks';
  import { Label, Select, Textarea, Input, GradientButton, Checkbox, MultiSelect } from 'flowbite-svelte';
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
  import LoginWarn from './auth/LoginWarn.svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';

  import { Modal } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import { getUrl } from './url/url.js';

  let popupModal = false;
  let popupSpinnerModal = true;
  let popupUserAuthModal = false;
  let popupSpinnerUploadModal = false;
  let selectedLied;
  let loadedLied = {};
  let userAuth = false;
  let alleLieder;
  let liedGesungen;

  let notenPdf;
  let liedMp3;

  let kategorien = [];
  let kategorie;

  onMount(async () => {
    console.log('onMount');
    userAuth = await isUserAuth();
    if (!userAuth) {
      popupUserAuthModal = true;
      return;
    }
    popupSpinnerModal = true;
    axios.get(getUrl() + '/root/wp-json/combo/v2/comboliedkat', getAuthHeader()).then((response) => {
      kategorien = JSON.parse(response.data);
      kategorien = kategorien.map((l) => ({ ...l, value: l.Typ, name: l.Typ }));
      console.log(kategorien);
    });

    axios.get(getUrl() + '/root/wp-json/combo/v2/comboLiederListe', getAuthHeader()).then((response) => {
      alleLieder = JSON.parse(response.data);
      alleLieder = alleLieder.map((t) => ({ ...t, name: t.Titel, value: t.ID }));
      popupSpinnerModal = false;
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('lied_id')) {
        selectedLied = urlParams.get('lied_id');
        console.log('Liedid: ', selectedLied);
        handleSelectLied();
      }
    });
  });

  const handleSelectLied = async () => {
    window.setTimeout(async () => {
      console.log('Sel: ', selectedLied);
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('lied_id', selectedLied);
      window.history.replaceState({}, '', `${location.pathname}?${urlParams}`);
      popupSpinnerModal = true;
      try {
        const response = await axios.get(
          getUrl() + '/root/wp-json/combo/v2/comboliedread?lied_id=' + selectedLied,
          getAuthHeader()
        );

        // console.log('Lied Res: ', response);
        loadedLied = JSON.parse(response.data)[0];
        liedGesungen = loadedLied.Aktiv == '1';
        console.log('Lied: ', loadedLied);
      } catch (error) {
        console.error('Fehler beim Upload:', error);
        // Hier kannst du Fehlerbehandlung implementieren
      }
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
      popupSpinnerUploadModal = true;
      const formData = new FormData();
      formData.append('titel', loadedLied.Titel);

      if (!loadedLied.Dateiname) {
        loadedLied.Dateiname = loadedLied.Titel.replace(/[^A-Z0-9]/gi, '_');
        reload = true;
      }
      formData.append('filename', loadedLied.Dateiname);
      formData.append('liedtext', loadedLied.Liedtext);
      formData.append('kategorie', loadedLied.Kategorie);
      formData.append('eg', loadedLied.EG);
      formData.append('aktiv', liedGesungen ? '1' : '0');
      formData.append('lied_id', loadedLied.ID ? loadedLied.ID : 0);

      formData.append('pdf_file', notenPdf);
      console.log('PDF: ', loadedLied.PDF);
      if (loadedLied.PDF == 0 || loadedLied.PDF == undefined) loadedLied.PDF = notenPdf ? 1 : 0;
      formData.append('pdf', loadedLied.PDF);
      formData.append('mp3_file', liedMp3);
      if (loadedLied.MP3 == 0 || loadedLied.MP3 == undefined) loadedLied.MP3 = liedMp3 ? 1 : 0;
      formData.append('mp3', loadedLied.MP3);

      const response = await axios.post(getUrl() + '/root/wp-json/combo/v2/comboliedwrite', formData, getAuthHeader());
      console.log('Upload erfolgreich:', response.data);
    } catch (error) {
      console.error('Fehler beim Upload:', error);
      // Hier kannst du Fehlerbehandlung implementieren
    }
    popupSpinnerUploadModal = false;
    if (reload) {
      window.location.reload();
    }
  };
</script>

{#if userAuth && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
      <div class="w-80">
        <Select
          items={alleLieder}
          bind:value={selectedLied}
          on:input={handleSelectLied}
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
            <Fileupload id="noten" name="noten" on:change={(e) => (notenPdf = e.target.files[0])} class="mb-2" />
            <Helper class="mb-2">Bitte die Noten als pdf Datei auswählen!</Helper>
          </div>
          <div class="sm:col-span-2">
            <Label class="pb-2">Hörprobe</Label>
            <Fileupload id="mp3" name="mp3" on:change={(e) => (liedMp3 = e.target.files[0])} class="mb-2" />
            <Helper class="mb-2">Bitte die Hörprobe als mp3 Datei auswählen!</Helper>
          </div>
          <div class="sm:col-span-2">
            <Label for="liedtext" class="mb-2">Liedtext</Label>
            <Textarea id="liedtext" bind:value={loadedLied.Liedtext} placeholder="Liedtext" rows="6" name="liedtext" />
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

<LoginWarn {popupUserAuthModal} />
<WaitPopup {popupSpinnerModal} message="Liederdaten werden neu geladen." />
