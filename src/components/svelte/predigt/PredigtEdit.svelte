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

  import { getAuthHeader, isUserAuth } from '../auth.js';

  import { getImage, getLongName } from './PredigtConstants.js';

  let files;
  let termine;
  let selectedTermin;
  let predigten;
  let open = false;
  let predigtEdit = false;

  onMount(() => {
    axios.get('https://www.evang9.wien/root/wp-json/combo/v1/combotermine?from_date=-50&to_date=0').then((response) => {
      termine = JSON.parse(response.data);
      termine = termine.map((t) => ({ ...t, name: t.Termin, value: t.Termin }));
    });

    axios.get('https://www.evang9.wien/root/wp-json/combo/v2/ispredigtedit', getAuthHeader()).then((response) => {
      predigtEdit = true;
    });

    loadPredigten();
  });

  function loadPredigten() {
    axios.get('https://www.evang9.wien/root/wp-json/combo/v1/getpredigten').then((response) => {
      predigten = Object.values(JSON.parse(response.data)).sort((a, b) => (a < b ? 1 : -1));

      console.log(predigten);
    });
  }

  function submitForm() {
    console.log('submit form');
    open = false;
    if (selectedTermin == '' || files == undefined) {
      // alert('Bitte den Termin auswählen.');
      open = true;
      return;
    }
    predigten = undefined;
    const dataArray = new FormData();
    dataArray.append('termin', selectedTermin);
    dataArray.append('uploadFile', files[0]);

    const token = localStorage.getItem('jwt');

    fetch('https://www.evang9.wien/root/wp-json/combo/v2/savepredigt', {
      method: 'POST',
      body: dataArray,
      headers: {
        Authorization: 'Bearer ' + token,
      },
    })
      .then((response) => {
        console.log(response);
        selectedTermin = '';
        files = undefined;
        loadPredigten();
      })
      .catch((error) => {
        console.log(error);
      });
  }

  function getName(termin) {
    const name = termine.filter((f) => f.Termin == termin && f.Veranstaltung == 'GD');

    if (!name[0]) return '';

    const langName = getLongName(name[0].Verantwortlich);

    return langName ? langName : name[0].Verantwortlich;
  }

  function getImg(termin) {
    const name = termine.filter((f) => f.Termin == termin && f.Veranstaltung == 'GD');

    if (!name[0]) return '';

    return getImage(name[0].Verantwortlich);
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
              <Fileupload bind:files class="mb-2" />
              <Helper class="mb-2">Bitte die Predigt als mp3 Datei auswählen!.</Helper>

              <GradientButton color="cyanToBlue" type="submit">Speichern</GradientButton>
            </Card>
          </form>
          <br />
        {/if}
        {#if predigten}
          <Table aria-label="Liederliste">
            <TableBody>
              {#each predigten as predigt}
                {#if getName(predigt.split('_')[0]) != ''}
                  <TableBodyRow>
                    <TableBodyCell>
                      <div class="w-12">
                        <Avatar size="md" src="https://www.evang9.wien/comboapps/img/{getImg(predigt.split('_')[0])}" />
                      </div>
                    </TableBodyCell>
                    <TableBodyCell>
                      {predigt.split('_')[0]} <br />
                      {getName(predigt.split('_')[0])}

                      <audio
                        id="player{predigt}"
                        class="bg-white"
                        src="https://www.evang9.wien/predigten/{predigt}"
                        controls="controls"
                        preload="none"
                      />
                    </TableBodyCell>
                  </TableBodyRow>
                {/if}
              {/each}
            </TableBody>
          </Table>
        {:else}
          <Card>
            <Spinner color="gray" />
          </Card>
        {/if}
      {:else}
        <div>
          <Spinner color="gray" />
        </div>
      {/if}
    </div>
  </Card>
</div>

<style>
  audio::-webkit-media-controls-panel {
    background-color: #ffffff;
  }
  /*audio {
    padding-top: 5px;
  } */
</style>
