<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import dayjs from 'dayjs';
  import 'dayjs/locale/de';
  import { getImageAvatar, getLongName } from './predigt/PredigtConstants.js';
  import PredigtAvatar from './predigt/PredigtAvatar.svelte';

  import { Label, Select, Input, InputAddon, Helper, GradientButton } from 'flowbite-svelte';
  import { Button, ButtonGroup } from 'flowbite-svelte';
  import { Card, Toggle } from 'flowbite-svelte';
  import { MicrophoneOutline, EditOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';
  import { getUrl } from './url/url.js';
  
  import { initAppCheck } from "./firebase/firebase.js";
  import { getAuth, onAuthStateChanged } from 'firebase/auth';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import {
    getDatabase,
    ref as dbref,
    onValue,
    query,
    orderByKey,
    limitToLast,
    limitToFirst,
    startAt,
    endAt,
  } from 'firebase/database';

  let termine;
  let popupSpinnerModal = true;
  let showComboProben = false;
  let userAuth = false;
  let auth;
  let popupFireBaseLogin = false;
  onMount(() => {
    
    console.log('FireBase');    
    const app = initAppCheck();
    auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        popupFireBaseLogin = true;
        return;
      } else {
        userAuth = true;
      }
      popupSpinnerModal = true;
      const dbRealtime = getDatabase(app);
      const fromDate = dayjs().format('YYYY-MM-DD');

      // console.log('Now: ', now.format('YYYY-MM-DD'));

      const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate));
      // console.log('Temine: ', dbRef);

      onValue(dbRef, async (snapshot) => {
        if (snapshot) {
          termine = Object.values(snapshot.val()).map((t) => ({
            ...t,
            name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''),
            value: t.Termin,
          }));
          console.log('Termine: ', termine);
          popupSpinnerModal = false;
        }
      });
    });
  });

  let formatDate = (date) => {
    dayjs.locale('de');
    return dayjs(date).format('dd. D.M. H:mm ');
  };
</script>

{#if userAuth && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm p-4">
      <h2 class="text-gray-900 dark:text-white font-bold mb-4">Comboplan</h2>
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
                    <Tooltip>{getLongName(termin.Verantwortlich)}</Tooltip>
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
<LoginFirebase {popupFireBaseLogin} {auth} />
