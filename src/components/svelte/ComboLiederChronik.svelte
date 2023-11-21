<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import moment from 'moment';

  import { getImage, getLongName } from './predigt/PredigtConstants.js';
  import { Label, Select, Input, InputAddon, Helper, GradientButton } from 'flowbite-svelte';
  import { Button, ButtonGroup } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { MicrophoneOutline, EditOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';

  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';
  import { getAuthHeader, isUserAuth } from './auth.js';

  let liederListe;
  let liederListeAll;
  let liederListeKat;

  let open = false;
  let liedtext;
  let liedtitelDlg;
  let response = 'Nothing yet.';

  let userAuth;

  const yearNow = new Date().getFullYear();

  onMount(() => {
    userAuth = isUserAuth();
    loadLieder({ value: yearNow });
  });

  const loadLieder = (year) => {
    let y = year.value ? year.value : year;
    axios
      .get('https://www.evang9.wien/root/wp-json/combo/v2/comboLiederChronik?date=' + y, getAuthHeader())
      .then((response) => {
        liederListe = JSON.parse(response.data);

        liederListeAll = liederListe;

        handleSort();
      });
  };
  let sort = 'Termin_Liedliste';
  let sortDirection = 'decending';
  function handleSort() {
    const sortFct = (a, b) => {
      const [aVal, bVal] = [a[sort], b[sort]][sortDirection === 'ascending' ? 'slice' : 'reverse']();
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal);
      }
      return Number(aVal) - Number(bVal);
    };
    liederListe.sort(sortFct);
    liederListe = liederListe;

    liederListeAll.sort(sortFct);
    liederListeAll = liederListeAll;
  }
  let filterNoten = '';
  let inputA = '';
  let floatingLabelA;

  let selectedYear = yearNow;
  let years = [...Array(10).keys()]
    .map((x) => yearNow - x)
    .map((y) => ({
      value: y,
      name: y,
    }));
  console.log(years);
  function handleYearSelect() {
    setTimeout(() => {
      console.log(selectedYear);
      loadLieder(selectedYear);
    }, 200);
  }
</script>

<div class="flex justify-center mb-6">
  <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
    <h2 class="text-gray-900 dark:text-white font-bold mb-4">Comboplan Chronik</h2>
    {#if userAuth}
      <div>
        {#if liederListe}
          <!-- <Dialog
            bind:open
            aria-labelledby="default-focus-title"
            aria-describedby="default-focus-content"
        >
            <Title id="default-focus-title">{liedtitelDlg}</Title>
            <Content id="default-focus-content">
                {liedtext}
            </Content>
            <Actions>                
                <Button style="color:black" defaultAction use={[InitialFocus]}>
                    <Label>Schließen</Label>
                </Button>
            </Actions>
        </Dialog>
    -->
          <div class="mb-4">
            <div class="">
              <Select
                items={years}
                bind:value={selectedYear}
                on:change={handleYearSelect}
                placeholder="Auswahl des Jahres."
              ></Select>
            </div>
          </div>
          <!-- <IconButton class="material-icons" on:click={handleYearSelect}>search</IconButton> -->

          <!-- <FormField align="end">
            <Checkbox bind:checked={combo} on:input={handleFilterCombo}/>  
            <span slot="label">Combolied</span>                          
        </FormField> -->

          <Table sortable bind:sort bind:sortDirection>
            <TableHead>
              <TableHeadCell>Termin</TableHeadCell>
              <TableHeadCell>
                <Label>Noten</Label>
              </TableHeadCell>
              <TableHeadCell>
                <Label>gespielt als</Label>
              </TableHeadCell>
              <TableHeadCell>
                <Label>Piano</Label>
              </TableHeadCell>
            </TableHead>
            <TableBody>
              {#each liederListe as lied}
                <TableBodyRow>
                  <TableBodyCell>
                    <div class="flex flex-col place-items-center">
                      <Avatar size="md" src="https://evang9.wien/comboapps/img/{getImage(lied.Verantwortlich)}" />
                      {lied.Termin_Liedliste}
                    </div>
                  </TableBodyCell>

                  <TableBodyCell>
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

                    <!--
                    <Button
                      style="color:black"
                      on:click={() => ((open = true), (liedtext = lied.Liedtext), (liedtitelDlg = lied.Titel))}
                    >
                    
                      <Label>{lied.Titel}</Label>
                    </Button>
                -->
                    <br />
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
                  <TableBodyCell>
                    {lied.Beschreibung}
                  </TableBodyCell>
                  <TableBodyCell>
                    {lied.Tasten}
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

<style>
  .columns {
    display: flex;
    flex-wrap: wrap;
  }
  .margins {
    margin-right: 12px;
    margin-bottom: 12px;
  }

  img.prediger_img {
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }

  :global(label) {
    color: #005091;
  }

  audio::-webkit-media-controls-panel {
    background-color: #ffffff;
  }

  :root {
    --mdc-theme-primary: #005091;
    --mdc-theme-secondary: #005091;
    --mdc-theme-background: #fff;
    --mdc-theme-surface: #fff;
    --mdc-theme-error: #b71c1c;
    --mdc-theme-on-primary: #fff;
    --mdc-theme-on-secondary: #fff;
    --mdc-theme-on-surface: #000;
    --mdc-theme-on-error: #fff;
    --mdc-theme-text-primary-on-background: rgba(0, 0, 0, 0.87);
    --mdc-theme-text-secondary-on-background: rgba(0, 0, 0, 0.54);
    --mdc-theme-text-hint-on-background: rgba(0, 0, 0, 0.38);
    --mdc-theme-text-disabled-on-background: rgba(0, 0, 0, 0.38);
    --mdc-theme-text-icon-on-background: rgba(0, 0, 0, 0.38);
    --mdc-theme-text-primary-on-light: rgba(0, 0, 0, 0.87);
    --mdc-theme-text-secondary-on-light: rgba(0, 0, 0, 0.54);
    --mdc-theme-text-hint-on-light: rgba(0, 0, 0, 0.38);
    --mdc-theme-text-disabled-on-light: rgba(0, 0, 0, 0.38);
    --mdc-theme-text-icon-on-light: rgba(0, 0, 0, 0.38);
    --mdc-theme-text-primary-on-dark: white;
    --mdc-theme-text-secondary-on-dark: rgba(255, 255, 255, 0.7);
    --mdc-theme-text-hint-on-dark: rgba(255, 255, 255, 0.5);
    --mdc-theme-text-disabled-on-dark: rgba(255, 255, 255, 0.5);
    --mdc-theme-text-icon-on-dark: rgba(255, 255, 255, 0.5);
  }
</style>
