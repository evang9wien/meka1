<script lang="ts">
  import { onMount } from 'svelte';

  import { Label, Select } from 'flowbite-svelte';
  import { Button } from 'flowbite-svelte';
  import { Tooltip, GradientButton } from 'flowbite-svelte';
  import { Checkbox } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';

  import { InfoCircleOutline, FileMusicOutline, PlaySolid, PauseSolid, ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider } from 'flowbite-svelte';
  import { Modal } from 'flowbite-svelte';

  import dayjs from 'dayjs';
  import 'dayjs/locale/de';
  import WaitPopup from './popup/WaitPopup.svelte';
  import PredigtAvatar from './predigt/PredigtAvatar.svelte';
  import { initPredigerStore, getLongNameFromStore } from './stores/predigerStore.ts';
  import { getUrl } from './url/url.ts';

  import LoginFirebase from './auth/LoginFirebase.svelte';
  import { initAuth, currentUser, userRoles, authReady } from './stores/authStore.ts';
  import { initAppCheck, getDb } from './firebase/firebase.ts';
  import { collection, getDocs } from 'firebase/firestore';
  import {
    getDatabase,
    set,
    ref as dbref,
    onValue,
    query,
    orderByKey,
    startAt,
    endAt,
  } from 'firebase/database';

  import emailjs, { EmailJSResponseStatus } from '@emailjs/browser';

  interface Termin {
    Termin: string;
    Abendmahl?: string | number;
    Verantwortlich?: string;
    Veranstaltung?: string;
    KS_Koordination?: string;
    KS_Begruessung?: string;
    KS_Abendmahl?: string;
    KS_Bar?: string;
    KS_Kuchen?: string;
    Zusatzinfo?: string;
    name: string;
    value: string;
  }

  interface Member {
    uid: string;
    name: string;
    value: string;
    ShortName?: string;
    roles?: string[];
    VName?: string;
    FName?: string;
    [key: string]: unknown;
  }

  let popupUserAuthModal = false;
  let popupSpinnerModal = false;
  let termine: Termin[] | undefined;
  let members: Member[] | undefined;
  let selectedmember: string | undefined;
  // let mySnackbar;
  let dbRealtime: ReturnType<typeof getDatabase>;
  let dataLoaded = false;

  onMount(() => {
    initAuth();
  });

  // Reaktiv: sobald User eingeloggt → Daten laden (einmalig)
  $: if ($currentUser && !dataLoaded) {
    dataLoaded = true;
    login($currentUser);
  }

  const loadkirchenservice = () => {
    popupSpinnerModal = true;
    console.log('FireBase');

    const fromDate = dayjs().format('YYYY-MM-DD');

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
        termine = termine.filter((t) => t.Veranstaltung == 'GD' && t.Verantwortlich != 'COM');
        console.log('Termine: ', termine);
        popupSpinnerModal = false;
      }
    });
  };

  const login = async (_user?: unknown) => {
    const app = initAppCheck();
    initPredigerStore(getDb());
    dbRealtime = getDatabase(app);

    popupSpinnerModal = true;
    loadkirchenservice();

    const dbFireStore = getDb();
    const accountsSnap = await getDocs(collection(dbFireStore, 'accounts'));
    members = accountsSnap.docs
      .map(d => ({ uid: d.id, ...d.data() }))
      .filter(a => Array.isArray(a.roles) && a.roles.includes('kirchenservice') && a.ShortName)
      .map(a => ({
        ...a,
        name: [a.VName, a.FName].filter(Boolean).join(' ') + ' (' + a.ShortName + ')',
        value: a.ShortName,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    console.log('Mitarbeiter (aus accounts): ', members);
  };

  const formatDate = (date: Date) => {
    dayjs.locale('de');
    return dayjs(new Date(date)).format('dd., D. MMMM  YYYY, H:mm ');
  };

  let kirchenservice: Record<string, string[]> = {};

  const resetSelection = () => {
    kirchenservice.KS_Koordination = [];
    kirchenservice.KS_Begruessung = [];
    kirchenservice.KS_Abendmahl = [];
    kirchenservice.KS_Bar = [];
    kirchenservice.KS_Kuchen = [];
  };

  const checkEntries = (newEntry: string, oldEntry: string | undefined): string => {
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

  let handleSave = (_event?: unknown) => {
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

<!-- ═══════ ZUGRIFFSSCHUTZ ═══════ -->
{#if $authReady && $currentUser && !$userRoles.includes('kirchenservice') && !$userRoles.includes('admin') && !popupSpinnerModal}
  <div class="flex justify-center p-8">
    <Card class="border-2 border-[#c0392b] bg-[#fce8e8] dark:bg-[#3d1a1a]">
      <div class="p-8">
        <ExclamationCircleOutline class="w-16 h-16 text-[#c0392b] mx-auto mb-4" />
        <h1 class="text-xl font-bold mb-4 text-[#c0392b]">Zugriff verweigert</h1>
        <p>Diese Seite ist nur für Benutzer mit der Rolle <strong>Kirchenservice</strong> zugänglich.</p>
      </div>
    </Card>
  </div>
{/if}

<!-- ═══════ HAUPTINHALT ═══════ -->
{#if $currentUser && ($userRoles.includes('kirchenservice') || $userRoles.includes('admin')) && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm p-4">
      <h2 class="text-[#1e3257] dark:text-[#dce9f7] font-bold mb-4">Kirchenserviceplan Eintragung</h2>
      <div class="flex flex-row">
        <Select class="mb-4 mr-4" items={members} bind:value={selectedmember} placeholder="Bitte wähle Deinen Namen"
        ></Select>

        <GradientButton class="mb-4 mr-4" color="cyanToBlue" onclick={handleSave} disabled={!selectedmember}
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
                  <div class="text-sm text-[#3a61a0] dark:text-[#93b3e0]">{getLongNameFromStore(termin.Verantwortlich)}</div>
                  {formatDate(dayjs(termin.Termin).toDate())}
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
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
