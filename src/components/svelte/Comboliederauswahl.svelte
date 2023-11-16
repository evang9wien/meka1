<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Label, Select } from 'flowbite-svelte';
  import { Button } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';

  import { MicrophoneOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';
  import { getImage, getLongName } from './predigt/PredigtConstants.js';

  // import Icon from "@smui/select/icon";
  // import DataTable, { Head, Body, Row, Cell } from "@smui/data-table";
  // import Select, { Option } from "@smui/select";

  // import CircularProgress from "@smui/circular-progress";
  // import IconButton from "@smui/icon-button";
  import { getAuthHeader, isUserAuth } from './auth.js';

  let selectedTermin;
  let lastSelectedTermin;
  let liederauswahl;
  let termine;

  let verantwortlich;
  let userAuth;
  onMount(() => {
    console.log('onMount');
    userAuth = isUserAuth();
    axios.get('https://evang9.wien/root/wp-json/combo/v2/comboliederauswahl', getAuthHeader()).then((response) => {
      liederauswahl = JSON.parse(response.data);
      if (liederauswahl[0]) {
        const lied1 = liederauswahl[0];
        selectedTermin = lied1.Termin_Liedliste;
        lastSelectedTermin = selectedTermin;
        verantwortlich = lied1.Verantwortlich;
      }
      // console.log(liederauswahl);
    });
    axios.get('https://evang9.wien/root/wp-json/combo/v1/combotermine?from_date=-50&to_date=10').then((response) => {
      termine = JSON.parse(response.data);
      termine = termine.map((t) => ({ ...t, name: t.Termin, value: t.Termin }));
      console.log(termine);
    });
  });

  const openPdf = (file) => {
    const token = localStorage.getItem('jwt');
    if (token) {
      let headers = new Headers();
      headers.append('Authorization', 'Bearer ' + token);
      headers.append('Content-Type', 'application/json');
      fetch(file, { headers })
        .then(async (response) => ({
          filename: 'downloaded.pdf',
          blob: await response.blob(),
        }))
        .then((resObj) => {
          const pdfBlob = new Blob([resObj.blob], { type: 'application/pdf' });
          let objectUrl = window.URL.createObjectURL(pdfBlob);
          let link = document.createElement('a');
          link.href = objectUrl;
          link.target = '_blank';
          link.click();
          window.URL.revokeObjectURL(objectUrl);
        });
    }
  };

  let source;

  const stopMp3 = () => {
    if (source) {
      source.stop();
    }
  };

  const openMp3 = (file) => {
    if (source) {
      source.stop();
    }
    const context = new AudioContext();
    source = context.createBufferSource();
    source.connect(context.destination);

    // const playButton = document.querySelector('#play');
    const token = localStorage.getItem('jwt');
    let headers = new Headers();
    headers.append('Authorization', 'Bearer ' + token);
    headers.append('Content-Type', 'application/json');

    window
      .fetch(file, { headers })
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        source.buffer = audioBuffer;
        source.start();
      });
  };

  const handleSelect = (sel) => {
    console.log(sel);

    window.setTimeout(() => {
      console.log('Sel: ', selectedTermin);
      console.log('lastSel: ', lastSelectedTermin);

      if (lastSelectedTermin == selectedTermin) return;
      lastSelectedTermin = selectedTermin;
      console.log(JSON.stringify(selectedTermin));
      liederauswahl = undefined;
      const token = localStorage.getItem('jwt');
      const authConfig = {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      };
      axios
        .get('https://evang9.wien/root/wp-json/combo/v2/comboliederauswahl?date=' + selectedTermin, authConfig)
        .then((response) => {
          liederauswahl = JSON.parse(response.data);

          if (liederauswahl[0]) {
            const lied1 = liederauswahl[0];
            verantwortlich = lied1.Verantwortlich;
          }
        });
    }, 300);
  };
</script>

<div class="flex justify-center mb-6">
  <Card class="lg:max-w-screen-lg md:max-w-screen-md">
    {#if userAuth}
      <div>
        {#if termine}
          <Label>
            <div class="flex space-x-4 mb-6">
              <Avatar src="https://evang9.wien/comboapps/img/{getImage(verantwortlich)}" />
              <div class="space-y-1 font-medium dark:text-white">
                <div>Lieder für den Gottesdienst</div>
                <div class="text-sm text-gray-500 dark:text-gray-400">{getLongName(verantwortlich)}</div>
              </div>
            </div>
            <Select items={termine} bind:value={selectedTermin} on:input={handleSelect} placeholder="Bitte Termin auswählen ..."/>
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
                <TableBodyRow>
                  <TableBodyCell>{lied.Beschreibung}</TableBodyCell>
                  <TableBodyCell class="w-4">
                    <div class="flex flex-row">
                      <FileMusicOutline
                        size="md"
                        class="mr-2"
                        on:click={() => {
                          const file =
                            'https://evang9.wien/root/wp-json/combo/v2/combolied/' +
                            lied.Dateiname +
                            '?lied=' +
                            lied.Dateiname +
                            '&type=pdf';
                          openPdf(file);
                        }}
                      />
                      <div class="mr-2">
                        {lied.Titel}
                      </div>
                    </div>
                  </TableBodyCell>
                  <TableBodyCell>
                    {#if lied.MP3 != '0'}
                      <div class="flex flex-row">
                        <PlaySolid
                          size="md"
                          class="mr-2"
                          on:click={() => {
                            const file =
                              'https://evang9.wien/root/wp-json/combo/v2/combolied/' +
                              lied.Dateiname +
                              '?lied=' +
                              lied.Dateiname +
                              '&type=mp3';
                            openMp3(file);
                          }}
                        ></PlaySolid>
                        <PauseSolid size="md" class="mr-2" on:click={stopMp3}></PauseSolid>
                      </div>
                    {/if}
                  </TableBodyCell>
                </TableBodyRow>
              {/each}
            </TableBody>
          </Table>
        {:else}
          <div style="display: flex; justify-content: center">
            <Spinner />
          </div>
        {/if}
      </div>
    {:else}
      Bitte zuerst einloggen.
    {/if}
  </Card>
</div>
