<script>
  import { onMount } from 'svelte';

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
  import { openPdf } from './pdf.js';
  import { getUrl } from './url/url.js';

  import LoginFirebase from './auth/LoginFirebase.svelte';
  import WaitPopup from './popup/WaitPopup.svelte';

  import { Modal, P } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';

  import { comboKategorien } from './combo/combo.js';
  import { initAuth, currentUser, authReady } from './stores/authStore.js';
  import { initAppCheck } from './firebase/firebase.js';

  import { getStorage, ref as stref, getDownloadURL } from 'firebase/storage';
  import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
  import { getFunctions, httpsCallable } from 'firebase/functions';

  let liederListe;
  let liederListeAll;
  let liederListeKat;

  let alleLieder;

  let popupSpinnerModal = false;

  let storage;
  let dbFireStore;
  let functions;
  let comboListRole = false;
  let liedTextModal = false;
  let liedText;
  let liedTextTitel;

  let alleLiederTexte;
  let searchLiederFn;
  let searchTimeout;
  let lastSearchTerm = '';  // Track last search to prevent duplicates

  let dataLoaded = false;

  onMount(() => {
    initAuth();
  });

  // Reaktiv: sobald User eingeloggt → Daten laden (einmalig)
  $: if ($currentUser && !dataLoaded) {
    dataLoaded = true;
    loadData($currentUser);
  }

  const loadData = async (user) => {
    console.log('User Auth: ', user.uid);
    const app = initAppCheck();
    functions = getFunctions(app, 'europe-west1');
    searchLiederFn = httpsCallable(functions, 'searchLieder');
    storage = getStorage(app);
    dbFireStore = getFirestore(app);
    popupSpinnerModal = true;

    // Rollencheck
    const userDoc = await getDoc(doc(dbFireStore, 'accounts', user.uid));
    console.log('User Data: ', userDoc.data());
    if (!userDoc.exists() || !userDoc.data().roles || !userDoc.data().roles.includes('combolist')) {
      console.log('No combolist role!');
      popupSpinnerModal = false;
      return;
    }
    comboListRole = true;

    const [liederGesDoc, liederNichtGesDoc, alleLiederTexteSnap] = await Promise.all([
      getDoc(doc(dbFireStore, 'allelieder', 'gesungen')),
      getDoc(doc(dbFireStore, 'allelieder', 'nichtgesungen')),
      getDocs(collection(dbFireStore, 'lieder'))
    ]);
    alleLiederTexte = alleLiederTexteSnap;

    let comboLieder = [];
    for (const [key, value] of Object.entries(liederGesDoc.data())) {
      comboLieder.push({ name: value, value: key, ID: key });
    }

    comboLieder = comboLieder.map((cl) => ({ ...cl, Aktiv: 1 }));
    const nichtcomboLieder = [];
    for (const [key, value] of Object.entries(liederNichtGesDoc.data())) {
      nichtcomboLieder.push({ name: value, value: key, ID: key });
    }

    alleLieder = comboLieder.concat(nichtcomboLieder);
    alleLieder = alleLieder.sort((a, b) => a.name.localeCompare(b.name));

    liederListeAll = alleLieder;
    liederListe = alleLieder;
    handleFilterKat();

    popupSpinnerModal = false;
  };

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
  let filterLiedtext = '';

  function filterInLiedtext(suchtext) {
    const ergebnisse = [];
    console.log("Lieder Texte: ", alleLiederTexte);
    alleLiederTexte.forEach(doc => {
      const data = doc.data();
      if (data.Liedtext && data.Liedtext.toLowerCase().includes(suchtext.toLowerCase())) {
        ergebnisse.push(doc.id);
      }
    });

    console.log("Ergebnisse Suche: ", ergebnisse);
    return ergebnisse;
  };

  let blockFilterLiedtext = false;
  async function handleFilterLiedtext() {
    // Clear previous timeout - resets the 2-second countdown on every keystroke
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }

    // Reset if search term is too short
    if (!filterLiedtext || filterLiedtext.length < 2) {
      liederListe = liederListeKat;
      return;
    }

    // Debounce: Wait 2 seconds after user stops typing before triggering search
    searchTimeout = setTimeout(async () => {
      if (blockFilterLiedtext) return;

      // Skip if same search term as last time (prevent duplicate searches)
      if (filterLiedtext === lastSearchTerm) {
        console.log("Skipping duplicate search for:", filterLiedtext);
        return;
      }

      blockFilterLiedtext = true;
      filterNoten = '';
      popupSpinnerModal = true;

      try {
        console.log("Server-side search for:", filterLiedtext);

        // Call Firebase Function using httpsCallable
        const result = await searchLiederFn({ searchTerm: filterLiedtext });

        console.log("Search results:", result.data);

        const ergebnisse = result.data.results.map(r => r.ID);
        liederListe = liederListeKat.filter(
          (lied) => ergebnisse.includes(lied.ID)
        );

        console.log(`Found ${result.data.count} songs matching "${filterLiedtext}"`);

        // Remember this search term to prevent duplicates
        lastSearchTerm = filterLiedtext;

      } catch (error) {
        console.error('Server-side search error:', error);

        // Fallback to client-side search if server fails
        console.log("Falling back to client-side search");
        const ergebnisse = filterInLiedtext(filterLiedtext);
        liederListe = liederListeKat.filter(
          (lied) => ergebnisse.includes(lied.ID)
        );
      } finally {
        popupSpinnerModal = false;
        blockFilterLiedtext = false;
      }
    }, 2000); // Wait 2 seconds after last keystroke
  }

  function handleFilterNoten() {
    if (blockFilterLiedtext) return;
    blockFilterLiedtext = true;
    filterLiedtext = '';
    setTimeout(() => {
      liederListe = liederListeKat.filter(
        (lied) => lied.name.toLowerCase().includes(filterNoten.toLowerCase())
      );
      blockFilterLiedtext = false;
    }, 500);
  }

  let filterKat = 'Combolieder';
  let kategorien = [
    { value: 'Alle Lieder', name: 'Alle Lieder' },
    { value: 'Combolieder', name: 'Gesungene Lieder' },
  ];

  function handleFilterKat() {
    setTimeout(() => {
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
      const loadedLied = { ...docSnap.data() };
      const index1 = liederListe.findIndex((l) => l.ID == lied.ID);
      liederListe[index1] = { ...lied, ...loadedLied };

      const index2 = liederListeKat.findIndex((l) => l.ID == lied.ID);
      liederListeKat[index2] = { ...lied, ...loadedLied };

      console.log('Lied: ', loadedLied);
    } else {
      console.log('Lied nicht gefunden!');
    }
  }
</script>
{#if $currentUser && !popupSpinnerModal && !comboListRole}
   <div class="flex justify-center p-8 ">
    <Card class="border-2 border-red-600 bg-red-50 content-center">
      <div class="p-8"    >
        <ExclamationCircleOutline class="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 class="text-xl font-bold mb-4 text-red-700">Zugriff verweigert</h1>
        <p>Du hast leider keine Berechtigung, um diese Seite zu sehen. Bitte wende dich an den Administrator.</p>
      </div>  
    </Card>
   </div>
{/if}
{#if $currentUser && !popupSpinnerModal && comboListRole}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm p-4">
      <h2 class="text-gray-900 dark:text-white font-bold mb-4">Lieder Liste</h2>

      <div>
        <div class="">
          <div class="flex space-x-4 mb-6">
            <ButtonGroup class="w-full">
              <InputAddon>
                <FileMusicOutline class="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </InputAddon>
              <Input
                class=""
                bind:value={filterNoten}
                oninput={handleFilterNoten}
                onchange={handleFilterNoten}
                placeholder="Suche im Titel"
              />
            </ButtonGroup>

            <ButtonGroup class="w-full">
              <InputAddon>
                <FileMusicOutline class="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </InputAddon>
              <Input
                class=""
                bind:value={filterLiedtext}
                oninput={handleFilterLiedtext}
                onchange={handleFilterLiedtext}
                placeholder="Suche im Liedtext"
              />
            </ButtonGroup>

            <Select class="w-100" items={kategorien} bind:value={filterKat} onchange={handleFilterKat} placeholder="Kategorie"
            ></Select>
          </div>
        </div>
        <Table striped={true} sortable>
          <TableHead>
            <TableHeadCell columnId="Titel">Noten</TableHeadCell>
            <TableHeadCell sortable={false}>Hörprobe</TableHeadCell>
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
                          onclick={() => {
                            liedTextModal = true;
                            liedText = lied.Liedtext;
                            liedTextTitel = lied.Titel;
                          }}
                        >
                          <ListMusicOutline size="md" class="mr-2" />
                        </A>
                      {/await}
                    {:else}
                      <GradientButton color="cyanToBlue" shadow pill={true} class="!p-2" onclick={() => liedLaden(lied, index)}>
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
                <TableBodyCell>
                  <GradientButton
                    shadow
                    color="cyanToBlue"
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
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
<Modal title={liedTextTitel} bind:open={liedTextModal} autoclose ooutsideclose={true}>
  <P>{liedText}</P>
  {#snippet footer()}
    <GradientButton color="cyanToBlue" type="submit" class="w-32">Schließen</GradientButton>   
  {/snippet}
</Modal>
