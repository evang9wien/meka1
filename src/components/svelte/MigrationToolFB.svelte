<script>
  import { onMount } from 'svelte';
  import { GradientButton, Button, Card, Badge, Alert, Spinner } from 'flowbite-svelte';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { CheckCircleSolid, ExclamationCircleOutline, InfoCircleSolid } from 'flowbite-svelte-icons';

  import { initAuth, currentUser, userRoles, authReady } from './stores/authStore.js';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { initAppCheck } from './firebase/firebase.js';
  import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

  // ─── Rollen-Gruppen die aus mitarbeiter gelesen werden ───────────────────────
  const MITARBEITER_GRUPPEN = ['combo', 'kirchenservice'];

  // ─── State ───────────────────────────────────────────────────────────────────
  let dbFireStore;
  let popupSpinnerModal = false;
  let dataLoaded = false;

  // Vorschau-Daten
  let previewRows = [];   // { uid, name, email, shortNameAlt (aus accounts), shortNameNeu, gruppe, status }
  let analyseDone = false;

  // Migrations-Status
  let migrating = false;
  let migrationDone = false;
  let migrationErrors = [];

  // ─── Init ────────────────────────────────────────────────────────────────────
  onMount(() => { initAuth(); });

  $: if ($currentUser && !dataLoaded) {
    dataLoaded = true;
    const app = initAppCheck();
    dbFireStore = getFirestore(app);
  }

  // ─── Schritt 1: Analysieren ──────────────────────────────────────────────────
  const analyse = async () => {
    popupSpinnerModal = true;
    previewRows = [];
    analyseDone = false;
    migrationDone = false;
    migrationErrors = [];

    try {
      // Alle accounts laden (uid → {email, ShortName, VName, FName, ...})
      const accountsSnap = await getDocs(collection(dbFireStore, 'accounts'));
      const accountsByEmail = {};
      const accountsByUid = {};
      accountsSnap.docs.forEach(d => {
        const data = d.data();
        accountsByUid[d.id] = { uid: d.id, ...data };
        if (data.email) accountsByEmail[data.email.toLowerCase()] = { uid: d.id, ...data };
      });

      // Alle Mitarbeiter-Gruppen durchgehen
      for (const gruppe of MITARBEITER_GRUPPEN) {
        const maSnap = await getDoc(doc(dbFireStore, 'mitarbeiter', gruppe));
        if (!maSnap.exists()) continue;

        for (const [, ma] of Object.entries(maSnap.data())) {
          // Mitarbeiter ohne E-Mail → separat anzeigen
          if (!ma.Email) {
            previewRows.push({
              uid: '—',
              name: `${ma.VName ?? ''} ${ma.FName ?? ''}`.trim(),
              email: '—',
              shortNameAlt: '—',
              shortNameNeu: ma.ShortName ?? '',
              gruppe,
              status: 'keine_email',
            });
            continue;
          }

          const emailKey = ma.Email.toLowerCase();
          const account = accountsByEmail[emailKey];

          if (!account) {
            previewRows.push({
              uid: '—',
              name: `${ma.VName ?? ''} ${ma.FName ?? ''}`.trim(),
              email: ma.Email,
              shortNameAlt: '—',
              shortNameNeu: ma.ShortName ?? '',
              gruppe,
              status: 'kein_account',
            });
            continue;
          }

          previewRows.push({
            uid: account.uid,
            name: `${ma.VName ?? ''} ${ma.FName ?? ''}`.trim() || (account.VName ?? ''),
            email: ma.Email,
            shortNameAlt: account.ShortName ?? '—',
            shortNameNeu: ma.ShortName ?? '',
            gruppe,
            status: account.ShortName === ma.ShortName ? 'aktuell' : 'migration',
          });
        }
      }

      previewRows = previewRows.sort((a, b) => a.name.localeCompare(b.name));
      analyseDone = true;
    } catch (e) {
      console.error(e);
    }

    popupSpinnerModal = false;
  };

  // ─── Schritt 2: Migration durchführen ────────────────────────────────────────
  const migrate = async () => {
    migrating = true;
    migrationErrors = [];

    const toMigrate = previewRows.filter(r => r.status === 'migration' && r.uid !== '—');

    for (const row of toMigrate) {
      try {
        await updateDoc(doc(dbFireStore, 'accounts', row.uid), {
          ShortName: row.shortNameNeu,
        });
        row.status = 'aktuell';
      } catch (e) {
        console.error(`Fehler bei ${row.email}:`, e);
        migrationErrors.push(`${row.name} (${row.email}): ${e.message}`);
        row.status = 'fehler';
      }
    }

    previewRows = [...previewRows];
    migrating = false;
    migrationDone = true;
  };

  // ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
  $: toMigrateCount   = previewRows.filter(r => r.status === 'migration').length;
  $: aktuellCount     = previewRows.filter(r => r.status === 'aktuell').length;
  $: keinAccountCount = previewRows.filter(r => r.status === 'kein_account').length;
  $: keineEmailCount  = previewRows.filter(r => r.status === 'keine_email').length;
</script>

<!-- ═══════ ZUGRIFFSSCHUTZ ═══════ -->
{#if $currentUser && !$userRoles.includes('admin') && !popupSpinnerModal}
  <div class="flex justify-center p-8">
    <Card class="border-2 border-red-600 bg-red-50">
      <div class="p-8">
        <ExclamationCircleOutline class="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 class="text-xl font-bold mb-4 text-red-700">Zugriff verweigert</h1>
        <p>Diese Seite ist nur für Administratoren zugänglich.</p>
      </div>
    </Card>
  </div>
{/if}

<!-- ═══════ HAUPTINHALT ═══════ -->
{#if $currentUser && $userRoles.includes('admin') && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md sm:max-w-screen-sm p-4 w-full">

      <h2 class="text-gray-900 dark:text-white font-bold text-xl mb-1">Migration: mitarbeiter → accounts</h2>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Liest <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">ShortName</code> aus
        <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">mitarbeiter/combo</code> und
        <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">mitarbeiter/kirchenservice</code>
        und schreibt ihn in das jeweilige
        <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">accounts/{'{uid}'}</code>-Dokument
        (Matching über E-Mail-Adresse).
      </p>

      <!-- Schritt 1 -->
      <div class="mb-4 flex gap-3 items-center flex-wrap">
        <GradientButton color="cyanToBlue" onclick={analyse} disabled={migrating}>
          {#if popupSpinnerModal}<Spinner size={4} class="mr-2" />Analysiere…{:else}1. Analysieren{/if}
        </GradientButton>

        {#if analyseDone}
          <GradientButton
            color="greenToBlue"
            onclick={migrate}
            disabled={migrating || toMigrateCount === 0}
          >
            {#if migrating}<Spinner size={4} class="mr-2" />Migration läuft…{:else}2. Migration durchführen ({toMigrateCount}){/if}
          </GradientButton>
        {/if}
      </div>

      <!-- Status-Zusammenfassung -->
      {#if analyseDone}
        <div class="flex gap-2 flex-wrap mb-4">
          <Badge color="green">{aktuellCount} bereits aktuell</Badge>
          <Badge color="blue">{toMigrateCount} zu migrieren</Badge>
          {#if keinAccountCount > 0}
            <Badge color="yellow">{keinAccountCount} kein Account gefunden</Badge>
          {/if}
          {#if keineEmailCount > 0}
            <Badge color="red">{keineEmailCount} keine E-Mail in mitarbeiter</Badge>
          {/if}
        </div>
      {/if}

      <!-- Erfolg / Fehler -->
      {#if migrationDone && migrationErrors.length === 0}
        <Alert color="green" class="mb-4">
          <CheckCircleSolid slot="icon" class="w-4 h-4" />
          Migration erfolgreich abgeschlossen.
        </Alert>
      {/if}
      {#if migrationErrors.length > 0}
        <Alert color="red" class="mb-4">
          <InfoCircleSolid slot="icon" class="w-4 h-4" />
          <p class="font-medium">Fehler bei {migrationErrors.length} Einträgen:</p>
          <ul class="mt-1 list-disc list-inside text-xs">
            {#each migrationErrors as err}<li>{err}</li>{/each}
          </ul>
        </Alert>
      {/if}

      <!-- Vorschau-Tabelle -->
      {#if previewRows.length > 0}
        <Table striped={true}>
          <TableHead>
            <TableHeadCell>Name</TableHeadCell>
            <TableHeadCell>E-Mail</TableHeadCell>
            <TableHeadCell>Gruppe</TableHeadCell>
            <TableHeadCell>ShortName (accounts)</TableHeadCell>
            <TableHeadCell>ShortName (mitarbeiter)</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each previewRows as row}
              <TableBodyRow>
                <TableBodyCell>
                  <div class="font-medium text-sm text-gray-900 dark:text-white">{row.name}</div>
                  <div class="text-xs text-gray-400 font-mono">{row.uid}</div>
                </TableBodyCell>
                <TableBodyCell class="text-xs">{row.email}</TableBodyCell>
                <TableBodyCell>
                  <Badge color="indigo" class="text-xs">{row.gruppe}</Badge>
                </TableBodyCell>
                <TableBodyCell class="font-mono text-sm">{row.shortNameAlt}</TableBodyCell>
                <TableBodyCell class="font-mono text-sm font-semibold">{row.shortNameNeu}</TableBodyCell>
                <TableBodyCell>
                  {#if row.status === 'aktuell'}
                    <Badge color="green">✓ aktuell</Badge>
                  {:else if row.status === 'migration'}
                    <Badge color="blue">→ wird migriert</Badge>
                  {:else if row.status === 'kein_account'}
                    <Badge color="yellow">⚠ kein Account</Badge>
                  {:else if row.status === 'keine_email'}
                    <Badge color="red">✗ keine E-Mail</Badge>
                  {:else if row.status === 'fehler'}
                    <Badge color="red">✗ Fehler</Badge>
                  {/if}
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      {/if}

    </Card>
  </div>
{/if}

<WaitPopup {popupSpinnerModal} message="Daten werden analysiert…" />
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
