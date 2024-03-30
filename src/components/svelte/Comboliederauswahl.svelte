<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Label, Select } from 'flowbite-svelte';
  import { Button } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';

  import { MicrophoneOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Modal, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';

  import { getImageAvatar, getLongName } from './predigt/PredigtConstants.js';

  import { getAuthHeader, isUserAuth } from './auth.js';
  import LoginWarn from './auth/LoginWarn.svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';

  import { getUrl } from './url/url.js';

  let selectedTermin;
  let lastSelectedTermin;
  let liederauswahl;
  let termine;

  let verantwortlich;
  let userAuth;

  let popupUserAuthModal = false;
  let popupSpinnerModal = false;

  onMount(async () => {
    console.log('onMount');
    popupSpinnerModal = true;
    userAuth = await isUserAuth();
    if (!userAuth) {
      popupUserAuthModal = true;
      return;
    }

    axios.get(getUrl() + '/root/wp-json/combo/v2/comboliederauswahl', getAuthHeader()).then((response) => {
      liederauswahl = JSON.parse(response.data);
      if (liederauswahl[0]) {
        const lied1 = liederauswahl[0];
        selectedTermin = lied1.Termin_Liedliste;
        lastSelectedTermin = selectedTermin;
        verantwortlich = lied1.Verantwortlich;
      }
      popupSpinnerModal = false;
      // console.log(liederauswahl);
    });
    axios.get(getUrl() + '/root/wp-json/combo/v1/combotermine?from_date=-50&to_date=10').then((response) => {
      termine = JSON.parse(response.data);
      // termine = termine.map((t) => ({ ...t, name: t.Termin, value: t.Termin }));
      termine = termine.map((t) => ({ ...t, name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''), value: t.Termin }));
      console.log(termine);
    });
  });

  const handleSelect = (sel) => {
    console.log(sel);
    popupSpinnerModal = true;
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
        .get(getUrl() + '/root/wp-json/combo/v2/comboliederauswahl?date=' + selectedTermin, authConfig)
        .then((response) => {
          liederauswahl = JSON.parse(response.data);

          if (liederauswahl[0]) {
            const lied1 = liederauswahl[0];
            verantwortlich = lied1.Verantwortlich;
          }
          popupSpinnerModal = false;
        });
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
                <TableBodyRow>
                  <TableBodyCell>{lied.Beschreibung}</TableBodyCell>
                  <TableBodyCell class="w-4">
                    <div class="flex flex-row">
                      <FileMusicOutline
                        size="md"
                        class="mr-2"
                        on:click={() => {
                          const file =
                            getUrl() +
                            '/root/wp-json/combo/v2/combolied/' +
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
                              getUrl() +
                              '/root/wp-json/combo/v2/combolied/' +
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
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Liederauswahl wird geladen." />
<LoginWarn {popupUserAuthModal} />
