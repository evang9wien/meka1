<script lang="ts">
  import { onMount } from 'svelte';
  import dayjs from 'dayjs';
  import 'dayjs/locale/de';

  import { Card, Toggle } from 'flowbite-svelte';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import PredigtAvatar from './predigt/PredigtAvatar.svelte';
  import { initPredigerStore, getLongNameFromStore } from './stores/predigerStore.ts';

  import { initAppCheck, getDb } from './firebase/firebase.ts';
  import {
    getDatabase,
    ref as dbref,
    onValue,
    query,
    orderByKey,
    startAt,
  } from 'firebase/database';

  interface Termin {
    Termin: string;
    Abendmahl?: string | number;
    Verantwortlich?: string;
    Veranstaltung?: string;
    KS_Koordination?: string;
    Zusatzinfo?: string;
    name: string;
    value: string;
  }

  let termine: Termin[] | undefined;
  let popupSpinnerModal = true;

  onMount(() => {
    const app = initAppCheck();
    initPredigerStore(getDb());
    const dbRealtime = getDatabase(app);
    const fromDate = dayjs().format('YYYY-MM-DD');

    const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate));

    onValue(dbRef, (snapshot) => {
      if (snapshot?.val()) {
        let alle: Termin[] = Object.values(snapshot.val()).map((t) => ({
          ...t,
          name: t.Termin + (t.Abendmahl == '1' ? ' (Y)' : ''),
          value: t.Termin,
        }));
        termine = alle.filter((t) => t.Veranstaltung == 'GD' && t.Verantwortlich != 'COM');
        popupSpinnerModal = false;
      }
    }, (error) => {
      console.error('Fehler beim Laden der Kirchenservice-Termine:', error);
      popupSpinnerModal = false;
    });
  });

  const formatDate = (date: string) => {
    dayjs.locale('de');
    return dayjs(date).format('dd., D. MMMM YYYY, H:mm');
  };
</script>

{#if !popupSpinnerModal && termine}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm p-4">
      <h2 class="text-[#1e3257] dark:text-[#dce9f7] font-bold mb-4">Kirchenserviceplan</h2>
      <Table striped={true}>
        <TableHead>
          <TableHeadCell>Termin</TableHeadCell>
          <TableHeadCell>Koordination</TableHeadCell>
          <TableHeadCell>Bemerkung</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each termine as termin}
            <TableBodyRow>
              <TableBodyCell>
                <div class="flex flex-col place-items-center">
                  <PredigtAvatar prediger={termin.Verantwortlich} />
                  <div class="text-sm text-[#3a61a0] dark:text-[#93b3e0]">{getLongNameFromStore(termin.Verantwortlich)}</div>
                  {formatDate(termin.Termin)}
                </div>
              </TableBodyCell>
              <TableBodyCell>{termin.KS_Koordination ?? ''}</TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-col">
                  <div>{termin.Abendmahl == 1 ? 'Abendmahl' : ''}</div>
                  <div>{termin.Zusatzinfo ?? ''}</div>
                </div>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Kirchenserviceplan wird geladen." />
