<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Label, Select } from 'flowbite-svelte';
  import { Button } from 'flowbite-svelte';
  import { GradientButton } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { InfoCircleOutline, MicrophoneOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';

  import { getImage, getLongName } from './predigt/PredigtConstants.js';

  import { getAuthHeader, isUserAuth } from './auth.js';
  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';

  let selectedTermin;
  // let lastSelectedTermin;
  let liederauswahl;
  let termine;

  let verantwortlich;
  let userAuth;

  let liederreihenfolge;

  let comboLieder;
  const comboLiederDef = ['2', '3', '5', '6', '7', '8'];
  let alleLieder;

  const handleLiederAuswahl = () => {
    if (liederauswahl[0]) {
      const lied1 = liederauswahl[0];
      selectedTermin = lied1.Termin_Liedliste;
      // lastSelectedTermin = selectedTermin;
      verantwortlich = lied1.Verantwortlich;
    }
    const termin = termine.filter((t) => t.Termin == selectedTermin)[0];
    console.log('Termin:', termin);

    const liedReihenfolgeToday = liederreihenfolge
      .filter((l) => l[termin.Abendmahl == '1' ? 'GD_mit_Abendmahl' : 'GD_ohne_Abendmahl'] == '1')
      .map((l) => ({ lied_im_GD_nummer: l.Reihenfolge, ComboLied: comboLiederDef.includes(l.Reihenfolge), ...l }));
    console.log('Lieder heute: ', liedReihenfolgeToday);
    liederauswahl = liedReihenfolgeToday.map((l) => {
      const lied = liederauswahl.find((la) => la.lied_im_GD_nummer == l.lied_im_GD_nummer);
      return lied ? lied : l;
    });
    console.log('Liederauswahl: ', liederauswahl);
  };

  const loadLieder = () => {
    axios.get('https://www.evang9.wien/root/wp-json/combo/v2/comboLiederListe', getAuthHeader()).then((response) => {
      alleLieder = JSON.parse(response.data);
      alleLieder = alleLieder.map((t) => ({ ...t, name: t.Titel, value: t }));
      comboLieder = alleLieder.filter((l) => l.Aktiv == '1');
      console.log(comboLieder);
      // liederListe = liederListe.map((lied) => {
      //   const days = Math.ceil((new Date() - new Date(lied.zuletzt_gesungen)) / (1000 * 3600 * 24 * 7));

      //   const w = { zuletzt: days };
      //   return { ...lied, ...w };
      // });
      // liederListeAll = liederListe;
      // handleFilterKat();
    });
  };

  onMount(() => {
    console.log('onMount');
    userAuth = isUserAuth();
    axios.get('https://evang9.wien/root/wp-json/combo/v2/comboliederreihenfolge', getAuthHeader()).then((response) => {
      // liederreihenfolge mit und ohne AM
      liederreihenfolge = JSON.parse(response.data);
      console.log('Liederreihenfolge: ', liederreihenfolge);
      axios.get('https://evang9.wien/root/wp-json/combo/v2/comboliederauswahl', getAuthHeader()).then((response) => {
        liederauswahl = JSON.parse(response.data);
        handleLiederAuswahl();
      });
    });

    axios.get('https://evang9.wien/root/wp-json/combo/v1/combotermine?from_date=-30&to_date=200').then((response) => {
      termine = JSON.parse(response.data);
      termine = termine.map((t) => ({ ...t, name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''), value: t.Termin }));
      console.log(termine);
    });

    loadLieder();
  });

  const handleSelectDate = (sel) => {
    console.log(sel);

    window.setTimeout(() => {
      console.log('Sel: ', selectedTermin);
      // console.log('lastSel: ', lastSelectedTermin);

      // if (lastSelectedTermin == selectedTermin) return;
      // lastSelectedTermin = selectedTermin;
      // console.log(JSON.stringify(selectedTermin));
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

  const handleSave = () => {
    window.setTimeout(() => {
      liederauswahl = liederauswahl.map((l) => (l.selected ? { ...l, ...l.selected } : l));
      // .forEach((l) => delete l.selected);

      console.log('Save: ', liederauswahl);
    });
  };
</script>

<div class="flex justify-center mb-6">
  <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
    {#if userAuth}
      <div>
        {#if termine}
          <div class="flex space-x-4 mb-6">
            {#if verantwortlich}
              <Avatar src="https://evang9.wien/comboapps/img/{getImage(verantwortlich)}" />
            {/if}
            <div class="space-y-1 font-medium dark:text-white">
              <div>Liederauswahl für den Gottesdienst bearbeiten</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">{getLongName(verantwortlich)}</div>
            </div>
          </div>
          <Select
            class="mb-4 mr-4"
            items={termine}
            bind:value={selectedTermin}
            on:input={handleSelectDate}
            placeholder="Bitte Termin auswählen ..."
          />

          <div class="flex flex-row">
            <GradientButton class="mb-4 mr-4" color="cyanToBlue" on:click={handleSave}>Bestätigen</GradientButton>
            <InfoCircleOutline size="xl"></InfoCircleOutline>
            <Tooltip placement="left"
              >Für die Liederauswahl die Lieder und <br /> den Termin auswählen und bestätigen.</Tooltip
            >
          </div>
        {/if}
      </div>
      <div>
        {#if liederauswahl}
          <Table striped="true">
            <TableHead>
              <TableHeadCell>Lied</TableHeadCell>
              <TableHeadCell>Noten</TableHeadCell>
              <TableHeadCell>Titel</TableHeadCell>
              <TableHeadCell>Hörprobe</TableHeadCell>
            </TableHead>
            <TableBody>
              {#each liederauswahl as lied}
                <TableBodyRow>
                  <TableBodyCell>{lied.Beschreibung}</TableBodyCell>
                  <TableBodyCell class="w-4">
                    {#if lied.Dateiname}
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
                      </div>
                    {/if}
                  </TableBodyCell>
                  <TableBodyCell class="w-4">
                    {#if lied.lied_liste_nummer}
                      <div class="mr-2">
                        {lied.Titel}
                      </div>
                    {:else}
                      <div class="w-80">
                        <Select
                          items={lied.ComboLied ? comboLieder : alleLieder}
                          bind:value={lied.selected}
                          on:input={handleSave}
                          placeholder="Bitte Lied auswählen ..."
                        />
                      </div>
                    {/if}
                  </TableBodyCell>
                  <TableBodyCell>
                    {#if lied.MP3 && lied.MP3 != '0'}
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
