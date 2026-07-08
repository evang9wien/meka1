<script lang="ts">
  import { onMount } from 'svelte';
  import axios from 'axios';
  import dayjs from 'dayjs';
  import 'dayjs/locale/de';
  import PredigtAvatar from './predigt/PredigtAvatar.svelte';
  import { initPredigerStore } from './stores/predigerStore.ts';

  import { Label, Select, Input, InputAddon, Helper, GradientButton } from 'flowbite-svelte';
  import { Button, ButtonGroup } from 'flowbite-svelte';
  import { Card, Toggle } from 'flowbite-svelte';
  import { MicrophoneOutline, EditOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider } from 'flowbite-svelte';
  import { getUrl } from './url/url.ts';
  
  import { initAuth, currentUser, authReady } from './stores/authStore.ts';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import {
    getDatabase,
    ref as dbref,
    onValue,
    query,
    orderByKey,
    startAt,
    endAt,
  } from 'firebase/database';
  import { initAppCheck, getDb } from './firebase/firebase.ts';

  interface Termin {
    Termin: string;
    Abendmahl?: string;
    Verantwortlich?: string;
    Tasten?: string;
    Melodie?: string;
    Gitarre?: string;
    Drums?: string;
    Bass?: string;
    Beamer?: string;
    Zusatzinfo?: string;
    name: string;
    value: string;
  }

  let termine: Termin[] | undefined;
  let popupSpinnerModal = true;
  let showComboProben = false;

  // Subscription für Firebase Realtime Database
  let termineSubscription: ReturnType<typeof onValue> | null = null;

  onMount(() => {
    console.log('FireBase');
    initAuth();
  });

  // Reaktiv: sobald User eingeloggt → Daten laden
  $: if ($currentUser && !termineSubscription) {
    loadTermine();
  }

  const loadTermine = () => {
    popupSpinnerModal = true;
    const app = initAppCheck();
    initPredigerStore(getDb());
    const dbRealtime = getDatabase(app);
    const fromDate = dayjs().format('YYYY-MM-DD');

    const dbRef = query(
      dbref(dbRealtime, 'combo/termine'),
      orderByKey(),
      startAt(fromDate)
    );

    termineSubscription = onValue(dbRef, (snapshot) => {
      if (snapshot?.val()) {
        termine = Object.entries(snapshot.val())
          .map(([_, t]) => ({
            ...t,
            name: `${t.Termin}${t.Abendmahl === '1' ? ' (Y)' : ''}`,
            value: t.Termin
          }));
        console.log('Termine geladen:', termine.length);
        popupSpinnerModal = false;
      }
    }, (error) => {
      console.error('Fehler beim Laden der Termine:', error);
      popupSpinnerModal = false;
    });
  };

  let formatDate = (date: string) => {
    dayjs.locale('de');
    return dayjs(date).format('dd. D.M. H:mm ');
  };
</script>

{#if $currentUser && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm p-4">
      <h2 class="text-[#1e3257] dark:text-[#dce9f7] font-bold mb-4">Comboplan</h2>
      <Toggle color="teal" class="pb-4" bind:checked={showComboProben}>Comboproben anzeigen</Toggle>
      <Table striped={true}>
        <TableHead>
          <TableHeadCell>Termin</TableHeadCell>
          <TableHeadCell>Tasten</TableHeadCell>
          <TableHeadCell>Melodie</TableHeadCell>
          <TableHeadCell>Git.</TableHeadCell>
          <TableHeadCell>Drums</TableHeadCell>
          <TableHeadCell>Bass</TableHeadCell>
          <TableHeadCell>Beamer</TableHeadCell>
          <TableHeadCell>Bemerkung</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each termine as termin}
            {#if showComboProben || !(termin.Verantwortlich == 'COM')}
              <TableBodyRow>
                <TableBodyCell>
                  <div class="flex flex-col place-items-center">
                    <PredigtAvatar prediger={termin.Verantwortlich} />
                    {formatDate(termin.Termin)}
                  </div>
                </TableBodyCell>
                <TableBodyCell>{termin.Tasten}</TableBodyCell>
                <TableBodyCell>{termin.Melodie}</TableBodyCell>
                <TableBodyCell>{termin.Gitarre}</TableBodyCell>
                <TableBodyCell>{termin.Drums}</TableBodyCell>
                <TableBodyCell>{termin.Bass}</TableBodyCell>
                <TableBodyCell>{termin.Beamer}</TableBodyCell>
                <TableBodyCell>
                  <div class="flex flex-col">
                    <div>{termin.Abendmahl == 1 ? 'Abendmahl' : ''}</div>
                    <div>{termin.Zusatzinfo}</div>
                  </div>
                </TableBodyCell>
              </TableBodyRow>
            {/if}
          {/each}
        </TableBody>
      </Table>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Comboplan wird geladen." />
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
