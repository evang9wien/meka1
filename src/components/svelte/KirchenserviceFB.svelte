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
  import { collection, getDocs } from 'firebase/firestore';
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
  // ShortName → Langname (z.B. "MS" → "Maria Sommer")
  let memberNames: Record<string, string> = {};

  onMount(async () => {
    const app = initAppCheck();
    initPredigerStore(getDb());
    const dbFireStore = getDb();
    const dbRealtime = getDatabase(app);

    // Accounts laden für ShortName → Langname Auflösung (nur wenn erlaubt)
    try {
      const accountsSnap = await getDocs(collection(dbFireStore, 'accounts'));
      memberNames = Object.fromEntries(
        accountsSnap.docs
          .map(d => d.data())
          .filter(a => a.ShortName)
          .map(a => [a.ShortName, [a.VName, a.FName].filter(Boolean).join(' ')])
      );
    } catch {
      // Ohne Login: Firestore accounts nicht lesbar → ShortNames als Fallback
    }

    const fromDate = dayjs().format('YYYY-MM-DD');
    const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate));

    onValue(dbRef, (snapshot) => {
      if (snapshot?.val()) {
        let alle: Termin[] = Object.values(snapshot.val()).map((t: any) => ({
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

  // Löst ein Leerzeichen-getrenntes Kürzel-String auf, z.B. "MS AB" → "Maria Sommer, Anna Berger"
  const resolveMemberNames = (shortNames: string | undefined): string => {
    if (!shortNames) return '';
    return shortNames.trim().split(/\s+/)
      .map(s => memberNames[s] ?? s)
      .join(', ');
  };

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
                  <div class="text-sm text-[#3a61a0] dark:text-[#93b3e0]">{getLongNameFromStore(termin.Verantwortlich ?? '')}</div>
                  {formatDate(termin.Termin)}
                </div>
              </TableBodyCell>
              <TableBodyCell>{resolveMemberNames(termin.KS_Koordination)}</TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-col">
                  <div>{termin.Abendmahl == '1' ? 'Abendmahl' : ''}</div>
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
