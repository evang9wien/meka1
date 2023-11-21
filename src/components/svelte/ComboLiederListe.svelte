<script>
  import { onMount } from 'svelte';
  import axios from 'axios';

  import { Label, Select, Input, InputAddon, Helper, GradientButton } from 'flowbite-svelte';
  import { Button, ButtonGroup } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { MicrophoneOutline, EditOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';
  import { openMp3, stopMp3 } from './mp3.js';
  import { getAuthHeader, isUserAuth } from './auth.js';
  import { openPdf } from './pdf.js';

  let liederListe;
  let liederListeAll;
  let liederListeKat;

  let open = false;
  let liedtext;
  let liedtitelDlg;
  let response = 'Nothing yet.';
  let userAuth;
  onMount(() => {
    userAuth = isUserAuth();
    axios.get('https://www.evang9.wien/root/wp-json/combo/v2/comboLiederListe', getAuthHeader()).then((response) => {
      liederListe = JSON.parse(response.data);
      liederListe = liederListe.map((lied) => {
        const days = Math.ceil((new Date() - new Date(lied.zuletzt_gesungen)) / (1000 * 3600 * 24 * 7));

        const w = { zuletzt: days };
        return { ...lied, ...w };
      });
      liederListeAll = liederListe;
      handleFilterKat();
    });
  });
  let sort = 'Titel';
  let sortDirection = 'ascending';
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

  function handleFilterNoten() {
    setTimeout(() => {
      liederListe = liederListeKat.filter(
        (lied) =>
          lied.Titel.toLowerCase().includes(filterNoten.toLowerCase()) ||
          lied.Liedtext.toLowerCase().includes(filterNoten.toLowerCase())
      );
      // handleFilterKat(liederListe);
    }, 500);
  }

  let filterKat = 'Combolieder';
  let kategorien = [
    { value: 'Combolieder', name: 'Combolieder' },
    { value: 'Alle Lieder', name: 'Alle Lieder' },
    { value: 'freiTöne', name: 'freiTöne' },
    { value: 'EG-Lieder', name: 'EG-Lieder' },
    { value: 'Kinder', name: 'Kinder' },
    { value: 'Weihnachten', name: 'Weihnachten' },
    { value: 'Comboprobe', name: 'Comboprobe' },
  ];

  function handleFilterKat() {
    setTimeout(() => {
      // console.log("Filter: ", filterKat);
      if (filterKat == 'Alle Lieder') {
        liederListe = liederListeAll;
      } else if (filterKat == 'Combolieder') {
        liederListe = liederListeAll.filter((lied) => lied.Aktiv == 1);
      } else if (filterKat == 'EG-Lieder') {
        liederListe = liederListeAll.filter((lied) => lied.EG != 0);
      } else {
        liederListe = liederListeAll.filter((lied) => lied.Kategorie.toLowerCase().includes(filterKat.toLowerCase()));
      }
      liederListeKat = liederListe;
      filterNoten = '';
    }, 200);
  }
</script>

<div class="flex justify-center mb-6">
  <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
    {#if userAuth}
      <div>
        {#if liederListe}
          <!-- <Dialog bind:open aria-labelledby="default-focus-title" aria-describedby="default-focus-content">
          <Title id="default-focus-title">{liedtitelDlg}</Title>
          <Content id="default-focus-content">
            {liedtext}
          </Content>
          <Actions>          
            <Button style="color:black" defaultAction use={[InitialFocus]}>
              <Label>Schließen</Label>
            </Button>
          </Actions>
        </Dialog> -->
          <div class="">
            <!-- <div class="flex space-x-4 mb-6">
              <Label for="website-admin" class="block mb-2">Suchbegriff</Label>
            </div> -->
            <div class="flex space-x-4 mb-6">
              <ButtonGroup class="w-full">
                <InputAddon>
                  <FileMusicOutline class="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </InputAddon>
                <Input
                  class=""
                  bind:value={filterNoten}
                  on:input={handleFilterNoten}
                  on:change={handleFilterNoten}
                  placeholder="Suche im Titel oder im Liedtext"
                />
              </ButtonGroup>

              <Select items={kategorien} bind:value={filterKat} on:change={handleFilterKat} placeholder="Kategorie"
              ></Select>
            </div>
            <!-- <Helper class="text-sm mt-2">Auswahl der Lied Kategorie.</Helper> -->
          </div>
          <Table striped={true} sortable>
            <TableHead>
              <TableHeadCell columnId="Titel">Noten</TableHeadCell>
              <TableHeadCell sortable={false}>Hörprobe</TableHeadCell>
              <TableHeadCell columnId="zuletzt">zuletzt</TableHeadCell>
              <TableHeadCell></TableHeadCell>
            </TableHead>
            <TableBody>
              {#each liederListe as lied}
                <TableBodyRow>
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
                  <TableBodyCell>
                    {lied.zuletzt < 2000 ? lied.zuletzt + ' Wochen' : ''}
                  </TableBodyCell>
                  <TableBodyCell>
                    <GradientButton
                      shadow
                      color="black"
                      pill={true}
                      class="!p-2"
                      href="https://evang9.wien/root/liedtext-update?filter_ID={lied.ID}"
                    >
                      <EditOutline class="w-4 h-4" />
                    </GradientButton>
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
