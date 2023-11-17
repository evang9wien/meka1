<script>
  // https://www.evang9.wien/root/predigten-editieren/
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Label, Select } from 'flowbite-svelte';
  import { Button } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';

  import { MicrophoneOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';

  // import Icon from "@smui/select/icon";
  // import DataTable, { Head, Body, Row, Cell } from "@smui/data-table";
  // import Select, { Option } from "@smui/select";
  // import Button , { Label } from "@smui/button";
  // import Dialog, { Title , Content as DialogContent, Actions as DialogActions} from "@smui/dialog";
  // import CircularProgress from "@smui/circular-progress";
  // import LinearProgress from '@smui/linear-progress';
  // import Card, { Content, Actions, PrimaryAction, ActionButtons, ActionIcons } from "@smui/card";
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
    if (selectedTermin == '' || files == undefined) {
      // alert("Bitte den Termin auswählen.");
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
        loadPredigten();
      })
      .catch((error) => {
        console.log(error);
      });
  }
  function predigtSpeichern() {
    const form = document.getElementById('predigt_form');
    form.submit();
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
              <!-- <Content>Administrator-Modus: Bitte die Predigt als mp3 Datei und den Temin auswählen!</Content>
            <Actions>
              <ActionButtons>
                <input type="file" bind:files class="file-upload" />

                <Select label="Termin" bind:value={selectedTermin}>
                  <Option value="" />
                  {#each termine as termin}
                    <Option value={termin.Termin}>
                      {termin.Termin}
                    </Option>
                  {/each}
                </Select>

                <Button on:click={predigtSpeichern} variant="raised">
                  <Label>Speichern</Label>
                </Button>
              </ActionButtons>
            </Actions> -->
            </Card>
          </form>
          <br />
        {/if}
        {#if predigten}
          <Table aria-label="Liederliste">
            <TableHead>
              <TableHeadCell />
              <TableHeadCell>Termin<br />Name</TableHeadCell>
              <TableHeadCell>Predigt</TableHeadCell>
            </TableHead>
            <TableBody>
              {#each predigten as predigt}
                {#if getName(predigt.split('_')[0]) != ''}
                  <TableBodyRow>
                    <TableBodyCell>
                      <Avatar size="md" src="https://evang9.wien/comboapps/img/{getImg(predigt.split('_')[0])}" />
                    </TableBodyCell>
                    <TableBodyCell>
                      {predigt.split('_')[0]} <br />
                      {getName(predigt.split('_')[0])}
                    </TableBodyCell>
                    <TableBodyCell>
                      <audio
                        id="player{predigt}"
                        src="https://evang9.wien/predigten/{predigt}"
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
            <Spinner />
          </Card>
        {/if}
      {:else}
        <div>
          <Spinner />
        </div>
      {/if}
    </div>
  </Card>
</div>

<style>
  audio::-webkit-media-controls-panel {
    background-color: #ffffff;
  }
  audio {
    padding-top: 5px;
  }
</style>
