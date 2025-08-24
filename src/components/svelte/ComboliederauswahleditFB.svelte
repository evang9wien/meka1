<script>
  // Anlegen und bearbeiten der Liederauswahl für den nächsten Sonntag
  import { onMount } from 'svelte';
  import { Label, Select } from 'flowbite-svelte';
  import { A, Button, Toggle } from 'flowbite-svelte';
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

  import { getImageAvatar, getLongName } from './predigt/PredigtConstants.js';
  import PredigtAvatar from './predigt/PredigtAvatar.svelte';

  import { Modal } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { getUrl } from './url/url.js';

  import { comboReihenfolge } from './combo/combo.js';
  import { firebaseConfig } from './firebase/firebase.js';

  import { initializeApp } from 'firebase/app';
  import { getStorage, ref as stref, getDownloadURL, connectStorageEmulator } from 'firebase/storage';
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
  import { getFirestore, doc, getDoc } from 'firebase/firestore';
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
    off,
  } from 'firebase/database';

  import dayjs from 'dayjs';

  let popupModal = false;
  let popupSpinnerModal = false;
  let popupUserAuthModal = false;
  let popupFireBaseLogin = false;
  let selectedTermin;
  // let lastSelectedTermin;

  let termine;

  let verantwortlich;
  let userAuth;

  // Entspricht der DB Tabelle lied_reihenfolge
  let liederReihenfolgeDBTemplate;
  // Entspricht der DB Tabelle lied_auswahl für das selektierte Datum
  let liederDBAuswahl = [];
  // Entspricht den den akteuell selektierten Liedern inklusive der geladenen Liedauswahl
  let liedReihenfolgeSelected;

  let comboLieder;
  const comboLiederDef = ['2', '3', '5', '6', '7', '8'];
  let alleLieder;

  let storage;
  let auth;
  let dbFireStore;
  let dbRealtime;

  let dbRealtimeOnce = false;

  let showComboProben = false;

  let alleTermine;

  const handleLiederDBAuswahl = async () => {
    // lieder nachladen
    const liederDBAuswahlLoad = [];
    for (let lied of liederDBAuswahl) {
      const liedRef = doc(dbFireStore, 'lieder', lied.lied_liste_nummer);
      const docSnap = await getDoc(liedRef);
      if (docSnap.exists()) {
        liederDBAuswahlLoad.push({ ...lied, ...docSnap.data() });
      } else {
        console.log('No such document!');
      }
    }
    liederDBAuswahl = liederDBAuswahlLoad;
    console.log('LiederDBList Load: ', liederDBAuswahl);

    const termin = termine.filter((t) => t.Termin == selectedTermin)[0];
    console.log('Termin:', termin);
    if (!termin) return;
    liedReihenfolgeSelected = liederReihenfolgeDBTemplate
      // GD mit oder ohne AM
      .filter((l) => l[termin.Abendmahl == '1' ? 'GD_mit_Abendmahl' : 'GD_ohne_Abendmahl'] == '1')

      // Zusammenführen der vorgegebenen Liedelemente mit den Geladenen
      .reduce(function (res, current) {
        // Anzahl der selben LiederElemente in der DBAuswahl
        const liederElemente = liederDBAuswahl.filter((l) => l.lied_im_GD_nummer == current.Reihenfolge);

        // console.log('Lieder pro Element: ', liederElemente);

        // es gibt noch keine Auswahl
        if (liederElemente.length == 0) {
          return res.concat([{ ...current }]);
        }

        const result = liederElemente.map((l) => ({
          ...current,
          selectedLied: l,
          ID: l.ID,
          selectedLiedID: l.lied_liste_nummer,
        }));

        return res.concat(result);
      }, []);
    //
    liederListeDuplicatesCheck();
    console.log('Lieder2Save: ', liedReihenfolgeSelected);
    console.log('Lieder geladen: ', liederDBAuswahl);
    sendEmailHrefRefresh();
  };

  onMount(async () => {
    console.log('FireBase');
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        popupFireBaseLogin = true;
        return;
      }

      storage = getStorage(app);

      console.log('onMount');

      userAuth = true;

      popupSpinnerModal = true;
      dbFireStore = getFirestore(app);
      // const docRef = ;
      const liederGes = await getDoc(doc(dbFireStore, 'allelieder', 'gesungen'));
      comboLieder = [];
      for (const [key, value] of Object.entries(liederGes.data())) {
        comboLieder.push({ name: value, value: key, ID: key });
      }
      comboLieder = comboLieder.sort((a, b) => a.name.localeCompare(b.name));
      // console.log(comboLieder);

      const liederNichtGes = await getDoc(doc(dbFireStore, 'allelieder', 'nichtgesungen'));
      const nichtcomboLieder = [];
      for (const [key, value] of Object.entries(liederNichtGes.data())) {
        nichtcomboLieder.push({ name: value, value: key, ID: key });
      }

      alleLieder = comboLieder.concat(nichtcomboLieder);
      alleLieder = alleLieder.sort((a, b) => a.name.localeCompare(b.name));
      // console.log(alleLieder);

      liederReihenfolgeDBTemplate = comboReihenfolge;
      console.log('LiederReihenfolgeDBTemplate: ', liederReihenfolgeDBTemplate);
      dbRealtime = getDatabase(app);

      const fromDate = dayjs().subtract(4, 'weeks').format('YYYY-MM-DD');
      const toDate = dayjs().add(4, 'weeks').format('YYYY-MM-DD');
      // console.log('Now: ', now.format('YYYY-MM-DD'));

      const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate), endAt(toDate));
      // console.log('Temine: ', dbRef);

      onValue(dbRef, async (snapshot) => {
        if (snapshot) {
          if (dbRealtimeOnce) return;
          alleTermine = Object.values(snapshot.val()).map((t) => ({
            ...t,
            name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''),
            value: t.Termin,
          }));
          handleTermine();

          popupSpinnerModal = false;

          console.log('Listener in onMount entfernen');
          off(dbRef);
        }
      });
    });
  });

  const handleTermine = () => {
    window.setTimeout(() => {
      popupSpinnerModal = true;
      liederDBAuswahl = [];
      termine = alleTermine.filter((t) => t.Veranstaltung == (showComboProben ? 'CP' : 'GD'));
      console.log('Termine: ', termine);

      const now = dayjs().subtract(2, 'days').format('YYYY-MM-DD');

      const termin = termine.filter((t) => new Date(t.Termin) > new Date(now))[0];
      console.log('Termin: ', termin);
      if (termin.LiedAuswahl) liederDBAuswahl = termin.LiedAuswahl;
      selectedTermin = termin.Termin;
      verantwortlich = termin.Verantwortlich;
      console.log('Verantwortlich: ', verantwortlich);
      console.log('LiederDBAuswahl: ', liederDBAuswahl);
      handleLiederDBAuswahl();
      popupSpinnerModal = false;
    });
  };

  const handleSelectDate = () => {
    // console.log(sel);
    popupSpinnerModal = true;
    liederDBAuswahl = [];
    console.log('Sel 00: ', selectedTermin);
    console.log('Termine: ', termine);
    window.setTimeout(() => {
      console.log('Sel: ', selectedTermin);

      const dbRefNow = query(
        dbref(dbRealtime, 'combo/termine'),
        orderByKey(),
        startAt(selectedTermin),
        limitToFirst(1)
      );
      // console.log('Temine: ', dbRef);

      onValue(dbRefNow, async (snapshot) => {
        const termin = Object.values(snapshot.val())[0];
        console.log('Termin: ', termin);
        liederDBAuswahl = termin.LiedAuswahl;
        if (!liederDBAuswahl) liederDBAuswahl = [];

        selectedTermin = termin.Termin;
        verantwortlich = termin.Verantwortlich;
        console.log('LiederDBAuswahl: ', liederDBAuswahl);
        handleLiederDBAuswahl();
        popupSpinnerModal = false;
        // Listener entfernen
        console.log('Listener in SelectDate entfernen');
        off(dbRefNow);
      });
    });
  };

  const handleSave = (ev, ev1, ev2) => {
    window.setTimeout(async () => {
      console.log('Lieder Selected:', liedReihenfolgeSelected);
      for (const l of liedReihenfolgeSelected) {
        // liedReihenfolgeSelected = liedReihenfolgeSelected.map(async (l) => {
        // if (l.selectedLiedID && !l.selectedLied) {
        if (l.selectedLiedID && l.selectedLiedID != '' && (!l.selectedLied || l.selectedLiedID != l.selectedLied.ID)) {
          console.log('Load Lied ', l);
          // lied muss neu geladen werden
          const liedRef = doc(dbFireStore, 'lieder', l.selectedLiedID);
          const docSnap = await getDoc(liedRef);
          if (docSnap.exists()) {
            l.selectedLied = { ...l, ...docSnap.data() };
          } else {
            console.log('No such document!');
          }

          // l.selectedLied = alleLieder.find((la) => la.ID == l.selectedLiedID);
        }
        // return l;
      }
      // .forEach((l) => delete l.selected);

      console.log('Save: ', liedReihenfolgeSelected, ev, ev1, ev2);
      // workaround: force UI refresh
      liedReihenfolgeSelected = liedReihenfolgeSelected;
    });
  };

  const handleSaveDBPre = () => {
    popupModal = true;
  };

  const handleSaveDB = () => {
    console.log('Save: ', liedReihenfolgeSelected);

    let liedReihenfolgeDB = liedReihenfolgeSelected
      .filter((l) => l.selectedLied)
      .map((l) => ({
        lied_im_GD_nummer: l.Reihenfolge,
        lied_liste_nummer: l.selectedLiedID,
      }));

    console.log('DB Save: ', liedReihenfolgeDB);
    console.log('DB Save JSON: ', JSON.stringify(liedReihenfolgeDB));
    // popupSpinnerModal = true;

    set(dbref(dbRealtime, 'combo/termine/' + selectedTermin + '/LiedAuswahl'), liedReihenfolgeDB);
    sendEmailHrefRefresh();
  };

  const addLied = (lied) => {
    console.log('Add: ', lied);
    liedReihenfolgeSelected = liedReihenfolgeSelected.reduce((res, current) => {
      if (lied.selectedLiedID && lied.selectedLiedID == current.selectedLiedID) {
        let toDel = { ...current };
        delete toDel.selectedLied;
        delete toDel.selectedLiedID;
        delete toDel.ID;
        return res.concat([{ ...current }, toDel]);
      } else return res.concat([current]);
    }, []);
    console.log('Dupl0: ', liedReihenfolgeSelected);
    liederListeDuplicatesCheck();
    console.log('Dupl: ', liedReihenfolgeSelected);
  };

  const removeLied = (lied) => {
    window.setTimeout(() => {
      if (lied.duplicate)
        liedReihenfolgeSelected = liedReihenfolgeSelected.map((l) => {
          // Damit die Entfernten Duplicate auch aus der DB gelöscht werden, muss das Element mit ID in der Liste bleiben
          // Es wird ein sichtbarkeitflag gesetzt und das selectierte Lied gelöscht.
          // in l1 ist das attribute selectedLied gelöscht
          if (l == lied) {
            const { selectedLied, selectedLiedID, ...l1 } = l;
            return { ...l1, notvisible: l == lied };
          } else return l;
        });
      else {
        delete lied.selectedLied;
        delete lied.selectedLiedID;
        // workaround: force UI refresh
        liedReihenfolgeSelected = liedReihenfolgeSelected;
      }
      liederListeDuplicatesCheck();
      console.log('Dupl: ', liedReihenfolgeSelected);
    });
  };
  // Prüfung ob es vom Liedtyp (Einzug, ...) mehr als eines gibt.
  // Das ist relevant beim Löschen. Zumindest ein Element muss übrig bleiben
  const liederListeDuplicatesCheck = () => {
    liedReihenfolgeSelected.forEach((l) => {
      l.duplicate = false;
    });

    var seen = new Set();
    const duplicates = liedReihenfolgeSelected.filter(
      (item) => !item.notvisible && seen.size === seen.add(item.Reihenfolge).size
    );
    liedReihenfolgeSelected.forEach((item) => {
      if (duplicates.find((f) => f.Reihenfolge == item.Reihenfolge)) {
        item.duplicate = true;
      }
    });
    // const

    // console.log('Dupl: ', liedReihenfolgeSelected);
  };

  let sendEmailHref;
  const sendEmailHrefRefresh = () => {
    let body = 'Liebe Combo!%0D%0A%0D%0A';
    if (liedReihenfolgeSelected)
      liedReihenfolgeSelected.forEach((item) => {
        if (!item.notvisible && item.selectedLied) {
          console.log(item);
          body = body + item.Beschreibung + ': ' + item.selectedLied.Titel + '%0D%0A';
        }
      });

    body =
      body +
      '%0D%0ADie Lieder mit Hörproben und Noten zum Üben und Ausdrucken%0D%0Afindest Du übersichtlich zusammengefasst hier:%0D%0A%0D%0Ahttps://www.evang9.wien/combo/comboliederauswahlFBpage';

    console.log('Email:', selectedTermin);
    const subject = 'Gottesdienst am ' + selectedTermin;

    sendEmailHref = 'mailto:combo@evang9.wien?subject=' + subject + '&body=' + body;

    // return href;
    // let anchor = document.createElement('a');
    // anchor.href = href;
    // anchor.target = '_blank';
    // anchor.click();
  };

  const isComboLied = (lied) => {
    // console.log('Combolied: ', lied);
    // console.log('IsCombilied: ', comboLiederDef.includes(lied.Reihenfolge));
    // console.log('Def: ', comboLiederDef);
    return comboLiederDef.includes(lied.Reihenfolge);
  };
</script>

{#if userAuth && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
      <div>
        {#if termine}
          <div class="flex space-x-4 mb-6">
            {#if verantwortlich}
              {#key verantwortlich}
                <PredigtAvatar prediger={verantwortlich} />
              {/key}
            {/if}
            <div class="space-y-1 font-medium dark:text-white">
              <div>Liederauswahl bearbeiten</div>
              {#if verantwortlich}
                <div class="text-sm text-gray-500 dark:text-gray-400">{getLongName(verantwortlich)}</div>
              {/if}
            </div>
          </div>
          <Select
            class="mb-4 mr-4"
            items={termine}
            bind:value={selectedTermin}
            on:change={handleSelectDate}
            placeholder="Bitte Termin auswählen ..."
          />

          <div class="flex flex-row">
            <GradientButton class="mb-4 mr-4" color="cyanToBlue" on:click={handleSaveDBPre}
              >Liederauswahl speichern</GradientButton
            >
            <InfoCircleOutline class="mb-4 mr-4" size="xl"></InfoCircleOutline>
            <Tooltip>Für die Liederauswahl den Termin <br /> und die Lieder auswählen und speichern.</Tooltip>
            <A class="mb-4 mr-4" color="cyanToBlue" href={sendEmailHref}>Liederauswahl verschicken</A>
            <InfoCircleOutline class="mb-4 mr-4" size="xl"></InfoCircleOutline>
            <Tooltip
              >Es sollte sich das Email Programm öffnen mit der Liederauswahl. Vor dem Versenden kann die Email ganz
              normal bearbeitet werden. Hinweis: Falls sich im Chrome das Email Program nicht öffen, die Setting hier
              prüfen: chrome://settings/handlers (diesen String in die Adresszeile des Chomre einfügen.)</Tooltip
            >
          </div>
        {/if}
        <Toggle color="teal" bind:checked={showComboProben} on:click={handleTermine}>Comboproben anzeigen</Toggle>
      </div>
      <div>
        {#if liedReihenfolgeSelected}
          <Table striped="true">
            <TableHead>
              <TableHeadCell>Lied</TableHeadCell>
              <TableHeadCell></TableHeadCell>
              <TableHeadCell>Titel</TableHeadCell>
              <TableHeadCell>Noten</TableHeadCell>
              <TableHeadCell>Hörprobe</TableHeadCell>
            </TableHead>
            <TableBody>
              {#each liedReihenfolgeSelected as lied}
                {#if !lied.notvisible}
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
                          items={isComboLied(lied) ? comboLieder : alleLieder}
                          bind:value={lied.selectedLiedID}
                          on:change={handleSave}
                          placeholder="Bitte Lied auswählen ..."
                        />
                      </div>
                    </TableBodyCell>
                    <TableBodyCell class="w-4">
                      {#if lied.selectedLied && lied.selectedLied.PDF && lied.selectedLied.PDF != '0'}
                        <div class="flex flex-row">
                          {#await getDownloadURL(stref(storage, 'lieder/noten/' + lied.selectedLied.Dateiname + '.pdf'))}
                            <p>loading</p>
                          {:then url}
                            <A href={url} target="_blank">
                              <FileMusicOutline size="md" class="mr-2" />
                            </A>
                          {/await}
                        </div>
                      {/if}
                    </TableBodyCell>
                    <TableBodyCell>
                      {#if lied.selectedLied && lied.selectedLied.MP3 && lied.selectedLied.MP3 != '0'}
                        <div class="flex flex-row">
                          {#if lied.MP3 != '0'}
                            <div class="flex flex-row">
                              {#await getDownloadURL(stref(storage, 'lieder/mp3/' + lied.selectedLied.Dateiname + '.mp3'))}
                                <p>loading</p>
                              {:then url}
                                <audio controls src={url} preload="none"></audio>
                              {/await}
                            </div>
                          {/if}
                        </div>
                      {/if}
                    </TableBodyCell>
                  </TableBodyRow>
                {/if}
              {/each}
            </TableBody>
          </Table>
        {:else}
          <div>
            <!-- <Spinner color="gray" /> -->
          </div>
        {/if}
      </div>
    </Card>
  </div>
{/if}

<Modal bind:open={popupModal} size="xs" autoclose>
  <div class="text-center">
    <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" />
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
      Soll der geänderte Liederablauf für den Gottestdienst am {selectedTermin} gespeichert werden?
    </h3>
    <Button color="green" class="me-2" on:click={handleSaveDB}>Ja, ich bin mir sicher</Button>
    <Button color="alternative">Nein, abbrechen</Button>
  </div>
</Modal>

<WaitPopup {popupSpinnerModal} message="Liederauswahl wird geladen." />
<LoginFirebase {popupFireBaseLogin} {auth} />
