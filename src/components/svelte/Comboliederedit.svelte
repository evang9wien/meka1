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

  import { getAuthHeader, isUserAuth } from './auth.js';
  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';

  let selectedTermin;
  let lastSelectedTermin;
  let liederauswahl;
  let termine;

  let verantwortlich;
  let userAuth;

  let liederreihenfolge;

  const handleLiederAuswahl = (liederauswahl) => {
    if (liederauswahl[0]) {
      const lied1 = liederauswahl[0];
      selectedTermin = lied1.Termin_Liedliste;
      lastSelectedTermin = selectedTermin;
      verantwortlich = lied1.Verantwortlich;
    }
    console.log(liederauswahl);
  };

  onMount(() => {
    console.log('onMount');
    userAuth = isUserAuth();
    axios.get('https://evang9.wien/root/wp-json/combo/v2/comboliederauswahl', getAuthHeader()).then((response) => {
      liederauswahl = JSON.parse(response.data);
      handleLiederAuswahl(liederauswahl);
    });
    axios.get('https://evang9.wien/root/wp-json/combo/v1/combotermine?from_date=-30&to_date=200').then((response) => {
      termine = JSON.parse(response.data);
      termine = termine.map((t) => ({ ...t, name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''), value: t.Termin }));
      console.log(termine);
    });

    axios.get('https://evang9.wien/root/wp-json/combo/v2/comboliederreihenfolge', getAuthHeader()).then((response) => {
      // liederreihenfolge mit und ohne AM
      liederreihenfolge = JSON.parse(response.data);
      console.log(liederreihenfolge);
    });
  });

  const handleSelectDate = (sel) => {
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
          handleLiederAuswahl(liederauswahl);
        });
    }, 300);
  };
</script>

<div class="flex justify-center mb-6">
  <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
    {#if userAuth}
      <div>
        {#if termine}
          <Label>
            <div class="flex space-x-4 mb-6">
              <Avatar src="https://evang9.wien/comboapps/img/{getImage(verantwortlich)}" />
              <div class="space-y-1 font-medium dark:text-white">
                <div>Liederauswahl für den Gottesdienst bearbeiten</div>
                <div class="text-sm text-gray-500 dark:text-gray-400">{getLongName(verantwortlich)}</div>
              </div>
            </div>
            <Select
              items={termine}
              bind:value={selectedTermin}
              on:input={handleSelectDate}
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
          <div>
            <Spinner color="gray" />
          </div>
        {/if}
      </div>
    {:else}
      Bitte zuerst einloggen.
    {/if}
  </Card>
</div>
