<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import dayjs from 'dayjs';
  import 'dayjs/locale/de';
  import { getImageAvatar, getLongName } from './predigt/PredigtConstants.js';
  import PredigtAvatar from './predigt/PredigtAvatar.svelte';

  import { Label, Select, Input, InputAddon, Helper, GradientButton } from 'flowbite-svelte';
  import { Button, ButtonGroup } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { MicrophoneOutline, EditOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';
  import { getUrl } from './url/url.js';
  import { firebaseConfig } from './firebase/firebase.js';
  import { initializeApp } from 'firebase/app';
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
  onMount(() => {
    popupSpinnerModal = true;
    console.log('FireBase');
    const app = initializeApp(firebaseConfig);
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

  let formatDate = (date) => {
    dayjs.locale('de');
    return dayjs(new Date(date)).format('dd., D. MMMM  YYYY, H:mm ');
  };
</script>

{#if !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
      <h2 class="text-gray-900 dark:text-white font-bold mb-4">Comboplan</h2>
      <Table striped={true}>
        <TableHead>
          <TableHeadCell>Termin</TableHeadCell>
          <TableHeadCell>Bemerkung</TableHeadCell>
          <TableHeadCell>Tasten</TableHeadCell>
          <TableHeadCell>Melodie</TableHeadCell>
          <TableHeadCell>Git.</TableHeadCell>
          <TableHeadCell>Drums</TableHeadCell>
          <TableHeadCell>Bass</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each termine as termin}
            <TableBodyRow>
              <TableBodyCell>
                <div class="flex flex-col place-items-center">
                  <PredigtAvatar prediger={termin.Verantwortlich} />
                  <Tooltip>{getLongName(termin.Verantwortlich)}</Tooltip>
                  {formatDate(dayjs(termin.Termin).toDate())}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-col">
                  <div>{termin.Abendmahl == 1 ? 'Abendmahl' : ''}</div>
                  <div>{termin.Zusatzinfo}</div>
                </div>
              </TableBodyCell>
              <TableBodyCell>{termin.Tasten}</TableBodyCell>
              <TableBodyCell>{termin.Melodie}</TableBodyCell>
              <TableBodyCell>{termin.Gitarre}</TableBodyCell>
              <TableBodyCell>{termin.Drums}</TableBodyCell>
              <TableBodyCell>{termin.Bass}</TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Comboplan wird geladen." />
