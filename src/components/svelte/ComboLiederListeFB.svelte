<script>
  import { onMount } from 'svelte';
  import axios from 'axios';

  import { Label, Select, Input, InputAddon, Helper, GradientButton } from 'flowbite-svelte';
  import { Button, ButtonGroup } from 'flowbite-svelte';
  import { Card, A } from 'flowbite-svelte';
  import {
    MicrophoneOutline,
    EditOutline,
    FileMusicOutline,
    PlaySolid,
    PauseSolid,
    ListMusicOutline,
  } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';
  import { openMp3, stopMp3 } from './mp3.js';
  import { getAuthHeader, isUserAuth } from './auth.js';
  import { openPdf } from './pdf.js';
  import { getUrl } from './url/url.js';

  import LoginFirebase from './auth/LoginFirebase.svelte';
  import WaitPopup from './popup/WaitPopup.svelte';

  import { Modal } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

  import { comboKategorien } from './combo/combo.js';
  import { firebaseConfig } from './firebase/firebase.js';

  import { initializeApp } from 'firebase/app';
  import { getStorage, ref as stref, uploadBytes, getDownloadURL, connectStorageEmulator } from 'firebase/storage';
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
  import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
  import {
    getDatabase,
    set,
    ref as dbref,
    onValue,
    query,
    orderByKey,
    limitToLast,
    limitToFirst,
    startAt,
    endAt,
  } from 'firebase/database';

  let liederListe;
  let liederListeAll;
  let liederListeKat;

  let alleLieder;
  let liedGesungen;

  let popupSpinnerModal = false;
  // let popupUserAuthModal = false;

  // let open = false;
  // let liedtext;
  // let liedtitelDlg;
  // let response = 'Nothing yet.';
  let userAuth;

  let storage;
  let auth;
  let dbFireStore;
  let dbRealtime;
  let popupFireBaseLogin = false;

  let liedTextModal = false;
  let liedText;
  let liedTextTitel;

  onMount(async () => {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log('No Login');
        popupFireBaseLogin = true;
        return;
      }

      console.log('User Auth');
      userAuth = true;
      storage = getStorage(app);
      dbFireStore = getFirestore(app);
      popupSpinnerModal = true;

      const liederGes = await getDoc(doc(dbFireStore, 'allelieder', 'gesungen'));
      let comboLieder = [];
      for (const [key, value] of Object.entries(liederGes.data())) {
        comboLieder.push({ name: value, value: key, ID: key });
      }

      comboLieder = comboLieder.map((cl) => ({ ...cl, Aktiv: 1 }));
      const liederNichtGes = await getDoc(doc(dbFireStore, 'allelieder', 'nichtgesungen'));
      const nichtcomboLieder = [];
      for (const [key, value] of Object.entries(liederNichtGes.data())) {
        nichtcomboLieder.push({ name: value, value: key, ID: key });
      }

      alleLieder = comboLieder.concat(nichtcomboLieder);
      alleLieder = alleLieder.sort((a, b) => a.name.localeCompare(b.name));

      liederListeAll = alleLieder;
      liederListe = alleLieder;
      handleFilterKat();

      console.log(liederListeAll);

      // axios.get(getUrl() + '/root/wp-json/combo/v2/comboLiederListe', getAuthHeader()).then((response) => {
      //   liederListe = JSON.parse(response.data);
      //   liederListe = liederListe.map((lied) => {
      //     const days = Math.ceil((new Date() - new Date(lied.zuletzt_gesungen)) / (1000 * 3600 * 24 * 7));

      //     const w = { zuletzt: days };
      //     return { ...lied, ...w };
      //   });
      //   liederListeAll = liederListe;
      //   console.log(liederListeAll);

      //   handleFilterKat();
      //   popupSpinnerModal = false;
      // });
      popupSpinnerModal = false;
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
        (lied) => lied.name.toLowerCase().includes(filterNoten.toLowerCase()) //  ||
        // lied.Liedtext.toLowerCase().includes(filterNoten.toLowerCase())
      );
      // handleFilterKat(liederListe);
    }, 500);
  }

  let filterKat = 'Combolieder';
  let kategorien = [
    { value: 'Alle Lieder', name: 'Alle Lieder' },
    { value: 'Combolieder', name: 'Gesungene Lieder' },
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
  async function liedLaden(lied) {
    console.log('Lied init: ', lied);
    const liedRef = doc(dbFireStore, 'lieder', lied.ID);
    const docSnap = await getDoc(liedRef);
    if (docSnap.exists()) {
      // console.log('Document data:', docSnap.data());
      const loadedLied = { ...docSnap.data() };
      const index1 = liederListe.findIndex((l) => l.ID == lied.ID);
      liederListe[index1] = { ...lied, ...loadedLied };

      const index2 = liederListeKat.findIndex((l) => l.ID == lied.ID);
      liederListeKat[index2] = { ...lied, ...loadedLied };

      // liedGesungen = loadedLied.Aktiv == '1';
      console.log('Lied: ', loadedLied);
      // liederAus.push(o);
      // liederauswahl = liederAus;
      // console.log('Lieder: ', liederauswahl);
    } else {
      // docSnap.data() will be undefined in this case
      console.log('Lied nicht gefunden!');
    }
  }
</script>

{#if userAuth && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
      <h2 class="text-gray-900 dark:text-white font-bold mb-4">Lieder Liste</h2>

      <div>
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
            <!-- <TableHeadCell columnId="zuletzt">zuletzt</TableHeadCell> -->
            <TableHeadCell></TableHeadCell>
          </TableHead>
          <TableBody>
            {#each liederListe as lied, index}
              <TableBodyRow>
                <TableBodyCell>
                  <div class="flex flex-row">
                    {#if lied.Dateiname}
                      {#await getDownloadURL(stref(storage, 'lieder/noten/' + lied.Dateiname + '.pdf'))}
                        <p>loading</p>
                      {:then url}
                        <A href={url} target="_blank">
                          <FileMusicOutline size="md" class="mr-2" />
                          <div class="mr-2">
                            {lied.Titel}
                          </div>
                        </A>
                        <A
                          on:click={() => {
                            liedTextModal = true;
                            liedText = lied.Liedtext;
                            liedTextTitel = lied.Titel;
                          }}
                        >
                          <ListMusicOutline size="md" class="mr-2" />
                        </A>
                      {/await}
                    {:else}
                      <GradientButton shadow color="black" pill={true} class="!p-2" on:click={liedLaden(lied, index)}>
                        <MicrophoneOutline class="w-4 h-4" />
                        {lied.name}
                      </GradientButton>
                    {/if}
                  </div>
                </TableBodyCell>
                <TableBodyCell>
                  {#if lied.Dateiname && lied.MP3 != '0'}
                    <div class="flex flex-row">
                      {#await getDownloadURL(stref(storage, 'lieder/mp3/' + lied.Dateiname + '.mp3'))}
                        <p>loading</p>
                      {:then url}
                        <audio controls src={url}></audio>
                      {/await}
                    </div>
                  {/if}
                </TableBodyCell>
                <!-- <TableBodyCell>
                  {lied.zuletzt < 2000 ? lied.zuletzt + ' Wochen' : ''}
                </TableBodyCell> -->
                <TableBodyCell>
                  <GradientButton
                    shadow
                    color="black"
                    pill={true}
                    class="!p-2"
                    href="/combo/comboliedereditFBpage?lied_id={lied.ID}"
                  >
                    <EditOutline class="w-4 h-4" />
                  </GradientButton>
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Liederliste wird geladen." />
<LoginFirebase {popupFireBaseLogin} {auth} />
<Modal title={liedTextTitel} bind:open={liedTextModal} autoclose outsideclose>{liedText}</Modal>
