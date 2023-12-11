<script>
  // Anlegen und bearbeitn eines Liedes
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Section } from 'flowbite-svelte-blocks';
  import { Label, Select, Textarea, Input, GradientButton, MultiSelect } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { Fileupload, Helper } from 'flowbite-svelte';
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

  import { getImage, getLongName } from './predigt/PredigtConstants.js';

  import { getAuthHeader, isUserAuth } from './auth.js';
  import LoginWarn from './auth/LoginWarn.svelte';
  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';

  import { Modal } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

  let popupModal = false;
  let popupSpinnerModal = false;
  let popupUserAuthModal = false;
  let selectedLied;
  let loadedLied = {};
  let userAuth = false;
  let alleLieder;

  let notenPdf;
  let liedMp3;

  let kategorien = [];

  onMount(() => {
    console.log('onMount');
    userAuth = isUserAuth();
    if (!userAuth) {
      popupUserAuthModal = true;
      return;
    }
    popupSpinnerModal = true;
    axios.get('https://www.evang9.wien/root/wp-json/combo/v2/comboLiederListe', getAuthHeader()).then((response) => {
      alleLieder = JSON.parse(response.data);
      alleLieder = alleLieder.map((t) => ({ ...t, name: t.Titel, value: t.ID }));
      popupSpinnerModal = false;
    });
  });

  const handleSelectLied = () => {
    window.setTimeout(() => {
      console.log('Sel: ', selectedLied);
      axios
        .get('https://www.evang9.wien/root/wp-json/combo/v2/comboliedread?lied_id=' + selectedLied, getAuthHeader())
        .then((response) => {
          // console.log('Lied Res: ', response);
          loadedLied = JSON.parse(response.data)[0];
          console.log('Lied: ', loadedLied);
        });
    });
  };
  const handleSubmit = () => {
    // alert('Form submited.');
    console.log('Submit');
  };
  let selected;
  let countries = [
    { value: 'tv', name: 'TV/Monitors' },
    { value: 'pc', name: 'PC' },
    { value: 'phone', name: 'Phones' },
  ];
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

      <Section name="crudcreateform">
        <h2 class="mb-4 text-xl font-bold text-gray-900 dark:text-white">Lied anlegen oder bearbeiten</h2>
        <form on:submit|preventDefault={handleSubmit}>
          <div class="grid gap-4 sm:grid-cols-2 sm:gap-6">
            <div class="sm:col-span-2">
              <Label for="name" class="mb-2">Titel*</Label>
              <Input type="text" id="name" bind:value={loadedLied.Titel} placeholder="Name des Liedes" required />
            </div>
            <div class="w-full">
              <Label for="egnummer" class="mb-2">EG-Nummer</Label>
              <Input type="text" id="egnummer" bind:value={loadedLied.EG} placeholder="Nummer im Gesangbuch" />
            </div>
            <div class="w-full">
              <Label far="kategorie" class="mb-2">Kategorie</Label>
              <MultiSelect
                id="kategorie"
                class="mt-2"
                items={countries}
                bind:value={selected}
                placeholder="Kategorie"
              />
            </div>
            <div class="sm:col-span-2">
              <Label class="pb-2">Noten*</Label>
              <Fileupload bind:notenPdf class="mb-2" required />
              <Helper class="mb-2">Bitte die Noten als pdf Datei auswählen!</Helper>
            </div>
            <div class="sm:col-span-2">
              <Label class="pb-2">Hörprobe</Label>
              <Fileupload bind:liedMp3 class="mb-2" />
              <Helper class="mb-2">Bitte die Hörprobe als mp3 Datei auswählen!</Helper>
            </div>
            <div class="sm:col-span-2">
              <Label for="liedtext" class="mb-2">Liedtext</Label>
              <Textarea
                id="liedtext"
                bind:value={loadedLied.Liedtext}
                placeholder="Liedtext"
                rows="6"
                name="liedtext"
              />
            </div>
            <GradientButton color="cyanToBlue" type="submit" class="w-32">Speichern</GradientButton>
          </div>
        </form>
      </Section>
    </Card>
  </div>
{/if}

<!-- <Modal bind:open={popupModal} size="xs" autoclose>
  <div class="text-center">
    <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" />
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
      Soll der geänderte Liederablauf für den Gottestdienst am {selectedTermin} gespeichert werden?
    </h3>
    <Button color="red" class="me-2" on:click={handleSaveDB}>Ja, ich bin mir sicher</Button>
    <Button color="alternative">Nein, abbrechen</Button>
  </div>
</Modal> -->

<Modal bind:open={popupSpinnerModal} size="sm" autoclose>
  <div class="text-center">
    <!-- <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" /> -->
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">Bitte warten ...</h3>
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
      <Spinner color="purple" size={8} />&nbsp;Liederauswahl wird neu geladen.
    </h3>
  </div>
</Modal>

<LoginWarn {popupUserAuthModal} />
