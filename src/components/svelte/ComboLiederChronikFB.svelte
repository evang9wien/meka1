<script>
  import { onMount } from 'svelte';
  import moment from 'moment';

  import { getImageAvatar, getLongName } from './predigt/PredigtConstants.js';
  import { Label, Select, Input, InputAddon, Helper, GradientButton } from 'flowbite-svelte';
  import { Button, ButtonGroup } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { MicrophoneOutline, EditOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';

  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';

  import { openMp3, stopMp3 } from './mp3.js';
  import { openPdf } from './pdf.js';
  import { getAuthHeader, isUserAuth } from './auth.js';
  import { comboReihenfolge } from './combo/combo.js';
  import { getUrl } from './url/url.js';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { firebaseConfig } from './firebase/firebase.js';
  import LoginFirebase from './auth/LoginFirebase.svelte';
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

  let liederListe = [];
  let liederListeAll = [];
  let liederListeKat;

  let open = false;
  let liedtext;
  let liedtitelDlg;
  let response = 'Nothing yet.';

  let userAuth;
  let popupSpinnerModal = false;
  let popupUserAuthModal = false;
  const yearNow = new Date().getFullYear();

  let storage;
  let auth;
  let dbFireStore;
  let dbRealtime;
  let popupFireBaseLogin = false;
  let alleLieder;

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

      // console.log('Temine: ', dbRef);

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

      console.log('Alle Lieder: ', alleLieder);

      dbRealtime = getDatabase(app);

      loadLieder({ value: yearNow });

      // popupSpinnerModal = true;
      // userAuth = await isUserAuth();
      // if (!userAuth) {
      //   popupUserAuthModal = true;
      //   return;
      // }
      // loadLieder({ value: yearNow });

      popupSpinnerModal = false;
    });
  });

  const loadLieder = (year) => {
    let y = year.value ? year.value : year;
    const fromDate = moment().set('year', y).set('month', 0).set('date', 1).format('YYYY-MM-DD');

    console.log('Date: ', fromDate);

    const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate));
    onValue(dbRef, async (snapshot) => {
      if (snapshot) {
        let termine = Object.values(snapshot.val()).map((t) => ({
          ...t,
          name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''),
          value: t.Termin,
        }));
        termine = termine.filter((t) => t.LiedAuswahl);

        console.log('Termine orig: ', termine);
        termine = termine
          .map((t) => {
            let res = t.LiedAuswahl;
            return res.map((r) => ({ ...r, ...t }));
          })
          .flat();

        termine = termine.map((l) => {
          const lied = alleLieder.filter((f) => f.ID == l.lied_liste_nummer);
          // console.log(alleLieder, l);
          // console.log(lied);
          let res = { ...l, Titel: lied[0] };
          return res;
        });
        console.log('Termine: ', termine);
        // termine = termine.ma
        liederListeAll = termine;
        liederListe = termine;
        // handleSort();
        popupSpinnerModal = false;
      }
    });
    // axios.get(getUrl() + '/root/wp-json/combo/v2/comboLiederChronik?date=' + y, getAuthHeader()).then((response) => {
    //   liederListe = JSON.parse(response.data);

    //   liederListeAll = liederListe;

    //   console.log('Alle Lieder: ', liederListeAll);

    //   handleSort();
    //   popupSpinnerModal = false;
    // });
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

{#if userAuth && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
      <h2 class="text-gray-900 dark:text-white font-bold mb-4">Comboplan Chronik</h2>

      <div>
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
                    <Avatar size="md" src="{getUrl()}/comboapps/img/{getImageAvatar(lied.Verantwortlich)}" />
                    {lied.Termin}
                  </div>
                </TableBodyCell>

                <TableBodyCell>
                  <div class="flex flex-row">
                    <!-- <FileMusicOutline
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
                    /> -->
                    <div class="mr-2">
                      {#if lied.Titel}
                        {lied.Titel.name}
                      {/if}
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
                    <!-- <div class="flex flex-row">
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
                    </div> -->
                  {/if}
                </TableBodyCell>
                <TableBodyCell>
                  {comboReihenfolge.filter((f) => f.Reihenfolge == lied.lied_im_GD_nummer)[0].Beschreibung}
                </TableBodyCell>
                <TableBodyCell>
                  {lied.Tasten}
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Liederchronik wird geladen." />
<LoginFirebase {popupFireBaseLogin} {auth} />
