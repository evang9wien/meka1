<script>
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

  let selectedTermin;
  // let lastSelectedTermin;

  let termine;

  let verantwortlich;
  let userAuth;

  // Entspricht der DB Tabelle lied_reihenfolge
  let liederReihenfolgeDBTemplate;
  // Entspricht der DB Tabelle lied_auswahl für das selektierte Datum
  let liederDBAuswahl;
  // Entspricht den den akteuell selektierten Liedern inklusive der geladenen Liedauswahl
  let liedReihenfolgeSelected;

  let comboLieder;
  const comboLiederDef = ['2', '3', '5', '6', '7', '8'];
  let alleLieder;

  const handleLiederDBAuswahl = () => {
    if (liederDBAuswahl[0]) {
      const lied1 = liederDBAuswahl[0];
      selectedTermin = lied1.Termin_Liedliste;
      // lastSelectedTermin = selectedTermin;
      verantwortlich = lied1.Verantwortlich;
    }
    const termin = termine.filter((t) => t.Termin == selectedTermin)[0];
    console.log('Termin:', termin);

    (liedReihenfolgeSelected = liederReihenfolgeDBTemplate
      // GD mit oder ohne AM
      .filter((l) => l[termin.Abendmahl == '1' ? 'GD_mit_Abendmahl' : 'GD_ohne_Abendmahl'] == '1')

      // Zusammenführen der vorgegebenen Liedelemente mit den Geladenen
      .reduce(function (res, current) {
        // Anzahl der selben LiederElemente in der DBAuswahl
        const liederElemente = liederDBAuswahl.filter((l) => l.lied_im_GD_nummer == current.Reihenfolge);

        console.log('Lieder pro Element: ', liederElemente);

        // es gibt noch keine Auswahl
        if (liederElemente.length == 0) {
          return res.concat([{ ...current }]);
        }

        const result = liederElemente.map((l) => ({
          ...current,
          selectedLied: l,
          selectedLiedID: l.lied_liste_nummer,
        }));

        return res.concat(result);
      }, [])),
      //

      console.log('Lieder2Save: ', liedReihenfolgeSelected);
    console.log('Lieder geladen: ', liederDBAuswahl);
    //   .map((l) => ({ lied_im_GD_nummer: l.Reihenfolge, ComboLied: comboLiederDef.includes(l.Reihenfolge), ...l }));

    //   console.log('Lieder heute: ', liedReihenfolgeSelected);
    // liederDBAuswahl = liedReihenfolgeSelected.map((l) => {
    //   const lied = liederDBAuswahl.find((la) => la.lied_im_GD_nummer == l.lied_im_GD_nummer);
    //   return lied ? lied : l;
    // });
    // console.log('LiederDBAuswahl: ', liederDBAuswahl);
  };

  onMount(() => {
    console.log('onMount');
    userAuth = isUserAuth();
    axios.get('https://www.evang9.wien/root/wp-json/combo/v2/comboLiederListe', getAuthHeader()).then((response) => {
      alleLieder = JSON.parse(response.data);
      alleLieder = alleLieder.map((t) => ({ ...t, name: t.Titel, value: t.ID }));
      comboLieder = alleLieder.filter((l) => l.Aktiv == '1');
      console.log(comboLieder);
      axios
        .get('https://evang9.wien/root/wp-json/combo/v2/comboliederReihenfolge', getAuthHeader())
        .then((response) => {
          // liederReihenfolgeDBTemplate mit und ohne AM
          liederReihenfolgeDBTemplate = JSON.parse(response.data);
          console.log('LiederReihenfolgeDBTemplate: ', liederReihenfolgeDBTemplate);
          axios
            .get('https://evang9.wien/root/wp-json/combo/v2/comboliederauswahl', getAuthHeader())
            .then((response) => {
              liederDBAuswahl = JSON.parse(response.data);
              handleLiederDBAuswahl();
            });
        });
    });
    axios.get('https://evang9.wien/root/wp-json/combo/v1/combotermine?from_date=-30&to_date=200').then((response) => {
      termine = JSON.parse(response.data);
      termine = termine.map((t) => ({ ...t, name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''), value: t.Termin }));
      console.log(termine);
    });
  });

  const handleSelectDate = (sel) => {
    console.log(sel);

    window.setTimeout(() => {
      console.log('Sel: ', selectedTermin);
      // console.log('lastSel: ', lastSelectedTermin);

      // if (lastSelectedTermin == selectedTermin) return;
      // lastSelectedTermin = selectedTermin;
      // console.log(JSON.stringify(selectedTermin));
      liederDBAuswahl = undefined;
      const token = localStorage.getItem('jwt');
      const authConfig = {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      };
      axios
        .get('https://evang9.wien/root/wp-json/combo/v2/comboliederauswahl?date=' + selectedTermin, authConfig)
        .then((response) => {
          liederDBAuswahl = JSON.parse(response.data);
          handleLiederDBAuswahl(liederDBAuswahl);
        });
    }, 300);
  };

  const handleSave = (ev, ev1, ev2) => {
    window.setTimeout(() => {
      liedReihenfolgeSelected = liedReihenfolgeSelected.map((l) => {
        if (l.selectedLiedID && !l.selectedLied) {
          l.selectedLied = alleLieder.find((la) => la.ID == l.selectedLiedID);
        }
        return l;
      });
      // .forEach((l) => delete l.selected);

      console.log('Save: ', liedReihenfolgeSelected, ev, ev1, ev2);
    });
  };

  const addLied = (lied) => {
    console.log('Add: ', lied);
  };

  const removeLied = (lied) => {
    liedReihenfolgeSelected = liedReihenfolgeSelected.filter((l) => l != lied);
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
              <div>LiederAuswahl für den Gottesdienst bearbeiten</div>
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

          <!-- <div class="flex flex-row">
            <GradientButton class="mb-4 mr-4" color="cyanToBlue" on:click={handleSave}>Bestätigen</GradientButton>
            <InfoCircleOutline size="xl"></InfoCircleOutline>
            <Tooltip placement="left"
              >Für die LiederDBAuswahl die Lieder und <br /> den Termin auswählen und bestätigen.</Tooltip
            >
          </div> -->
        {/if}
      </div>
      <div>
        {#if liedReihenfolgeSelected}
          <Table striped="true">
            <TableHead>
              <TableHeadCell>Lied</TableHeadCell>
              <TableHeadCell></TableHeadCell>
              <TableHeadCell>Titel</TableHeadCell>
              <TableHeadCell>Hörprobe</TableHeadCell>
              <TableHeadCell>Noten</TableHeadCell>
            </TableHead>
            <TableBody>
              {#each liedReihenfolgeSelected as lied}
                <TableBodyRow>
                  <TableBodyCell>{lied.Beschreibung}</TableBodyCell>

                  <TableBodyCell class="w-4">
                    <div class="flex flex-row">
                      <PlusOutline size="md" class="mr-2" on:click={addLied(lied)}></PlusOutline>
                      <TrashBinOutline size="md" class="mr-2" on:click={removeLied(lied)}></TrashBinOutline>
                    </div>
                  </TableBodyCell>
                  <TableBodyCell class="w-4">
                    <div class="w-80">
                      <Select
                        items={lied.ComboLied ? comboLieder : alleLieder}
                        bind:value={lied.selectedLiedID}
                        on:input={handleSave}
                        placeholder="Bitte Lied auswählen ..."
                      />
                    </div>
                  </TableBodyCell>
                  <TableBodyCell>
                    {#if lied.selectedLied && lied.selectedLied.MP3 && lied.selectedLied.MP3 != '0'}
                      <div class="flex flex-row">
                        <PlaySolid
                          size="md"
                          class="mr-2"
                          on:click={() => {
                            const file =
                              'https://evang9.wien/root/wp-json/combo/v2/combolied/' +
                              lied.selectedLied.Dateiname +
                              '?lied=' +
                              lied.selectedLied.Dateiname +
                              '&type=mp3';
                            openMp3(file);
                          }}
                        ></PlaySolid>
                        <PauseSolid size="md" class="mr-2" on:click={stopMp3}></PauseSolid>
                      </div>
                    {/if}
                  </TableBodyCell>
                  <TableBodyCell class="w-4">
                    {#if lied.selectedLied}
                      <div class="flex flex-row">
                        <FileMusicOutline
                          size="md"
                          class="mr-2"
                          on:click={() => {
                            const file =
                              'https://evang9.wien/root/wp-json/combo/v2/combolied/' +
                              lied.selectedLied.Dateiname +
                              '?lied=' +
                              lied.selectedLied.Dateiname +
                              '&type=pdf';
                            openPdf(file);
                          }}
                        />
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
