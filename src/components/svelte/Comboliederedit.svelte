<script>
  // Anlegen und bearbeitn eines Liedes
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Label, Select } from 'flowbite-svelte';
  import { Button } from 'flowbite-svelte';
  import { GradientButton } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
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
  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';

  import { Modal } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

  let popupModal = false;
  let popupSpinnerModal = false;
  let selectedLied;
  let userAuth;
  let alleLieder;

  onMount(() => {
    console.log('onMount');
    popupSpinnerModal = true;
    userAuth = isUserAuth();
    axios.get('https://www.evang9.wien/root/wp-json/combo/v2/comboLiederListe', getAuthHeader()).then((response) => {
      alleLieder = JSON.parse(response.data);
      alleLieder = alleLieder.map((t) => ({ ...t, name: t.Titel, value: t.ID }));
      popupSpinnerModal = false;
    });
  });

  const handleSelectLied = () => {};
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

      <div></div></Card
    >
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
