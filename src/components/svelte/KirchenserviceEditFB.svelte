<script>
  import { onMount } from 'svelte';

  import { Label, Select } from 'flowbite-svelte';
  import { Button } from 'flowbite-svelte';
  import { Tooltip, GradientButton } from 'flowbite-svelte';
  import { Checkbox } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';

  import { InfoCircleOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider } from 'flowbite-svelte';
  import { Modal } from 'flowbite-svelte';

  import moment from 'moment';
  import { getAuthHeader, isUserAuth } from './auth.js';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { getImageAvatar, getLongName } from './predigt/PredigtConstants.js';
  import PredigtAvatar from './predigt/PredigtAvatar.svelte';
  import { getUrl } from './url/url.js';

  import LoginSimple from './auth/LoginSimpleModal.svelte';
  import { firebaseConfig } from './firebase/firebase.js';
  import { initializeApp } from 'firebase/app';
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
  import { getFirestore, doc, getDoc } from 'firebase/firestore';
  import {
    getDatabase,
    get,
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

  import emailjs, { EmailJSResponseStatus } from '@emailjs/browser';

  let popupUserAuthModal = false;
  let popupSpinnerModal = false;
  let termine;
  let members;
  let selectedmember;
  // let mySnackbar;
  let userAuth = false;
  let dbRealtime;
  let auth = false;
  let popupSimpleLogin = true;

  const loadkirchenservice = () => {
    popupSpinnerModal = true;
    console.log('FireBase');

    const fromDate = moment().format('YYYY-MM-DD');

    // console.log('Now: ', now.format('YYYY-MM-DD'));

    const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate));
    // console.log('Temine: ', dbRef);

    onValue(dbRef, async (snapshot) => {
      if (snapshot) {
        resetSelection();
        termine = Object.values(snapshot.val()).map((t) => ({
          ...t,
          name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''),
          value: t.Termin,
        }));
        termine = termine.filter((t) => t.Veranstaltung == 'GD');
        console.log('Termine: ', termine);
        popupSpinnerModal = false;
      }
    });
  };

  const callback = () => {
    console.log('Auth:', auth);
    popupSimpleLogin = false;
    login();
  };

  const login = async () => {
    // onMount(async () => {
    const app = initializeApp(firebaseConfig);
    // auth = getAuth(app);
    // onAuthStateChanged(auth, async (user) => {
    //   if (!user) {
    //     popupFireBaseLogin = true;
    //     return;
    //   } else {
    //     userAuth = true;
    //   }
    userAuth = true;
    dbRealtime = getDatabase(app);

    popupSpinnerModal = true;
    loadkirchenservice();

    const dbFireStore = getFirestore(app);
    const maRef = doc(dbFireStore, 'mitarbeiter', 'kirchenservice');
    const docSnap = await getDoc(maRef);
    if (docSnap.exists()) {
      members = Object.values(docSnap.data()).filter((m) => m.Active == '1');
      members = members.map((t) => ({
        ...t,
        name: t.VName + ' ' + t.FName + ' (' + t.ShortName + ')',
        value: t.ShortName,
      }));
      console.log('Mitarbeiter: ', members);
    }
    // });
  };

  let formatDate = (date) => {
    const options = {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    };
    return new Date(date).toLocaleDateString('de-DE', options).replace(/,/g, '');
  };

  let kirchenservice = {};

  const resetSelection = () => {
    kirchenservice.KS_Koordination = [];
    kirchenservice.KS_Begruessung = [];
    kirchenservice.KS_Abendmahl = [];
    kirchenservice.KS_Bar = [];
    kirchenservice.KS_Kuchen = [];
  };

  const checkEntries = (newEntry, oldEntry) => {
    if (!oldEntry) {
      return newEntry;
    }
    if (!oldEntry.includes(newEntry)) {
      return oldEntry + ' ' + newEntry;
    }
    // remove newEntry
    return oldEntry
      .replace('*' + newEntry + '*', '')
      .replace(newEntry, '')
      .trim();
  };

  const sendEmail = async (message, subject) => {
    try {
      await emailjs.send(
        'service_rzebsaf',
        'template_d17yqvi',
        { subject: subject, message: message },
        {
          publicKey: 'jZ6lvMXTvg1PtIufC',
        }
      );
      console.log('SUCCESS!');
    } catch (err) {
      if (err instanceof EmailJSResponseStatus) {
        console.log('EMAILJS FAILED...', err);
        return;
      }

      console.log('ERROR', err);
    }
  };

  let handleSave = (event) => {
    // mySnackbar.open();
    let newEntries = [];
    Object.entries(kirchenservice).forEach(([key, values]) => {
      values.forEach((value) => {
        let data = value.split(',');
        let termin = {};
        termin.Termin = data[0];
        termin.key = key;
        termin.value = checkEntries(selectedmember, data[1]);
        newEntries.push(termin);
      });
    });
    let name = selectedmember;

    const longName = members.filter((m) => m.value == name)[0].name;

    let message = '';

    newEntries.forEach((entry) => {
      // const obj = {};
      // obj[entry.key] = entry.value;
      set(dbref(dbRealtime, 'combo/termine/' + entry.Termin + '/' + entry.key), entry.value);
      const einaus = entry.value.includes(name) ? 'EIN' : 'AUS';
      message += `${longName} hat sich am ${entry.Termin} in der Spalte ${entry.key} ${einaus}getragen !`;
      message += '\n';
    });

    // reset selected member
    selectedmember = '';

    // send email
    console.log('EMail: ', name, newEntries);

    const subject = `${longName} hat die Kirchenserviceliste aktualisiert!`;

    console.log(message);
    console.log(subject);
    // sendEmail(message, subject);
  };
</script>

{#if userAuth && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
      <h2 class="text-gray-900 dark:text-white font-bold mb-4">Kirchenserviceplan Eintragung</h2>
      <div class="flex flex-row">
        <Select class="mb-4 mr-4" items={members} bind:value={selectedmember} placeholder="Bitte wähle Deinen Namen"
        ></Select>

        <GradientButton class="mb-4 mr-4" color="cyanToBlue" on:click={handleSave} disabled={!selectedmember}
          >Bestätigen</GradientButton
        >
        <InfoCircleOutline size="xl"></InfoCircleOutline><Tooltip placement="left"
          >Für eine Termineintragung den Namen und <br /> den Termin auswählen und bestätigen. <br />Zum Löschen den
          Termin nochmal auswählen <br />und bestätigen.</Tooltip
        >
      </div>

      <Table striped={true}>
        <TableHead>
          <TableHeadCell>Termin</TableHeadCell>
          <TableHeadCell>Koordination</TableHeadCell>
          <!--
          <TableHeadCell>Begr.</TableHeadCell>
          <TableHeadCell>Abendm.</TableHeadCell>
          <TableHeadCell>Bar</TableHeadCell>
          <TableHeadCell>Kuchen</TableHeadCell>
          -->
          <TableHeadCell>Bemerkung</TableHeadCell>
        </TableHead>

        <TableBody>
          {#each termine as termin}
            <TableBodyRow>
              <TableBodyCell>
                <div class="flex flex-col place-items-center">
                  <PredigtAvatar prediger={termin.Verantwortlich} />
                  {formatDate(moment(termin.Termin).toDate())}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-row">
                  <Checkbox
                    disabled={!selectedmember}
                    bind:group={kirchenservice.KS_Koordination}
                    value={termin.Termin + ',' + termin.KS_Koordination}
                  />
                  {termin.KS_Koordination}
                </div>
              </TableBodyCell>
              <!--
              <TableBodyCell>
                <div class="flex flex-row">
                  <Checkbox
                    disabled={!selectedmember}
                    bind:group={kirchenservice.KS_Begruessung}
                    value={termin.Termin + ',' + termin.KS_Begruessung}
                  />
                  {termin.KS_Begruessung}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-row">
                  <Checkbox
                    disabled={!selectedmember}
                    bind:group={kirchenservice.KS_Abendmahl}
                    value={termin.Termin + ',' + termin.KS_Abendmahl}
                  />
                  {termin.KS_Abendmahl}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-row">
                  <Checkbox
                    disabled={!selectedmember}
                    bind:group={kirchenservice.KS_Bar}
                    value={termin.Termin + ',' + termin.KS_Bar}
                  />
                  {termin.KS_Bar}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-row">
                  <Checkbox
                    disabled={!selectedmember}
                    bind:group={kirchenservice.KS_Kuchen}
                    value={termin.Termin + ',' + termin.KS_Kuchen}
                  />
                  {termin.KS_Kuchen}
                </div>
              </TableBodyCell>
            -->
              <TableBodyCell>
                <div class="flex flex-col">
                  <div>{termin.Abendmahl == 1 ? 'Abendmahl' : ''}</div>
                  <div>{termin.Zusatzinfo}</div>
                </div>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="kirchenserviceplan wird neu geladen." />
<!-- <LoginWarn {popupUserAuthModal} /> -->
<LoginSimple {popupSimpleLogin} {auth} {callback} />
