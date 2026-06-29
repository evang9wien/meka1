<script>
  import { onMount } from 'svelte';
  import { GradientButton, Button, Card, Badge, Input, Label, Spinner, Alert } from 'flowbite-svelte';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Modal } from 'flowbite-svelte';
  import { ExclamationCircleOutline, UserAddOutline, TrashBinOutline, CheckCircleSolid, InfoCircleSolid } from 'flowbite-svelte-icons';

  import { initAuth, currentUser, userRoles, authReady } from './stores/authStore.js';
  import LoginFirebase from './auth/LoginFirebase.svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { initAppCheck } from './firebase/firebase.js';
  import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
  import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

  // ─── Alle verfügbaren Rollen mit Beschreibung ─────────────────────────────

  const ALL_ROLES = [
    { id: 'admin',             label: 'Admin',               desc: 'Benutzerverwaltung (diese Seite)' },
    { id: 'combo',             label: 'Combo',               desc: 'Comboplan Eintragung & Liederauswahl ansehen' },
    { id: 'comboedit',         label: 'Combo Edit',          desc: 'Comboplan: Eintragung eigener Name' },
    { id: 'comboadmin',        label: 'Combo Admin',         desc: 'Comboplan: Admin-Modus (Stern setzen)' },
    { id: 'terminadmin',       label: 'Termin Admin',        desc: 'Termine anlegen & Google-Sync' },
    { id: 'combolist',         label: 'Liederliste',         desc: 'Liederliste & Liederauswahl anzeigen' },
    { id: 'liederedit',        label: 'Lieder Edit',         desc: 'Lieder anlegen & bearbeiten' },
    { id: 'liederauswahledit', label: 'Liederauswahl Edit',  desc: 'Liederauswahl für GD bearbeiten' },
    { id: 'predigtedit',       label: 'Predigt Edit',        desc: 'Predigten hochladen' },
    { id: 'kirchenservice',    label: 'Kirchenservice',      desc: 'Kirchenservice-Plan bearbeiten' },
  ];

  // ─── State ────────────────────────────────────────────────────────────────

  let dbFireStore;
  let users = [];
  let popupSpinnerModal = false;
  let dataLoaded = false;

  // Rollen bearbeiten
  let editUser = null;
  let editRoles = [];
  let editModalOpen = false;
  let saveStatus = '';   // '' | 'saving' | 'error'

  // Neuer User
  let newModalOpen = false;
  let newUid = '';
  let newEmail = '';
  let newVName = '';
  let newFName = '';
  let newRoles = [];
  let newStatus = '';    // '' | 'saving' | 'ok' | 'error' | 'exists'

  // Löschen
  let deleteUser = null;
  let deleteModalOpen = false;

  // Toast
  let toastMsg = '';
  let toastType = 'green';
  let toastVisible = false;
  let toastTimeout;

  // ─── Auth & Laden ─────────────────────────────────────────────────────────

  onMount(() => { initAuth(); });

  $: if ($currentUser && !dataLoaded) {
    dataLoaded = true;
    loadData();
  }

  const loadData = async () => {
    const app = initAppCheck();
    dbFireStore = getFirestore(app);
    popupSpinnerModal = true;
    await loadUsers();
    popupSpinnerModal = false;
  };

  const loadUsers = async () => {
    const snap = await getDocs(collection(dbFireStore, 'accounts'));
    users = snap.docs
      .map(d => ({ uid: d.id, ...d.data(), roles: d.data().roles ?? [] }))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  };

  const fullName = (user) =>
    [user.VName, user.FName].filter(Boolean).join(' ') || user.email || user.uid;

  // ─── Benutzer bearbeiten (Rollen + Namen) ─────────────────────────────────

  let editVName = '';
  let editFName = '';
  let editEmail = '';

  const openEdit = (user) => {
    editUser = user;
    editRoles = [...user.roles];
    editVName = user.VName ?? '';
    editFName = user.FName ?? '';
    editEmail = user.email ?? '';
    saveStatus = '';
    editModalOpen = true;
  };

  const toggleEditRole = (roleId) => {
    if (editRoles.includes(roleId)) {
      editRoles = editRoles.filter(r => r !== roleId);
    } else {
      editRoles = [...editRoles, roleId];
    }
  };

  const saveUser = async () => {
    saveStatus = 'saving';
    try {
      await updateDoc(doc(dbFireStore, 'accounts', editUser.uid), {
        roles: editRoles,
        role1: editRoles.includes('combo') ? 'combo' : '',
        VName: editVName.trim(),
        FName: editFName.trim(),
        email: editEmail.trim(),
      });
      users = users.map(u => u.uid === editUser.uid
        ? { ...u, roles: editRoles, VName: editVName.trim(), FName: editFName.trim(), email: editEmail.trim() }
        : u
      );
      editModalOpen = false;
      showToast(`${editVName.trim() || editEmail.trim()} gespeichert.`, 'green');
    } catch (e) {
      console.error(e);
      saveStatus = 'error';
    }
  };

  // ─── Neuen User anlegen ───────────────────────────────────────────────────

  const openNew = () => {
    newUid = '';
    newEmail = '';
    newVName = '';
    newFName = '';
    newRoles = [];
    newStatus = '';
    newModalOpen = true;
  };

  const toggleNewRole = (roleId) => {
    if (newRoles.includes(roleId)) {
      newRoles = newRoles.filter(r => r !== roleId);
    } else {
      newRoles = [...newRoles, roleId];
    }
  };

  const createUser = async () => {
    if (!newUid.trim()) return;
    newStatus = 'saving';
    try {
      // Prüfen ob UID schon als Dokument existiert
      if (users.find(u => u.uid === newUid.trim())) {
        newStatus = 'exists';
        return;
      }
      // Firestore-Dokument unter der echten UID anlegen
      await setDoc(doc(dbFireStore, 'accounts', newUid.trim()), {
        email: newEmail.trim(),
        VName: newVName.trim(),
        FName: newFName.trim(),
        roles: newRoles,
        role1: newRoles.includes('combo') ? 'combo' : '',
      });
      newStatus = 'ok';
      await loadUsers();
      setTimeout(() => { newModalOpen = false; }, 1000);
      showToast(`${newVName || newFName || newEmail} angelegt.`, 'green');
    } catch (e) {
      console.error(e);
      newStatus = 'error';
    }
  };

  // ─── Passwort-Reset senden ────────────────────────────────────────────────

  const sendReset = async (user) => {
    if (!user.email) { showToast('Keine E-Mail-Adresse hinterlegt.', 'red'); return; }
    try {
      const app = initAppCheck();
      const auth = getAuth(app);
      await sendPasswordResetEmail(auth, user.email);
      showToast(`Passwort-Reset an ${user.email} gesendet.`, 'green');
    } catch (e) {
      showToast(`Fehler: ${e.message}`, 'red');
    }
  };

  // ─── User löschen ─────────────────────────────────────────────────────────

  const openDelete = (user) => {
    deleteUser = user;
    deleteModalOpen = true;
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(dbFireStore, 'accounts', deleteUser.uid));
      users = users.filter(u => u.uid !== deleteUser.uid);
      deleteModalOpen = false;
      showToast(`${fullName(deleteUser)} entfernt.`, 'green');
    } catch (e) {
      console.error(e);
      showToast('Fehler beim Löschen.', 'red');
      deleteModalOpen = false;
    }
  };

  // ─── Toast ────────────────────────────────────────────────────────────────

  const showToast = (msg, type = 'green') => {
    clearTimeout(toastTimeout);
    toastMsg = msg;
    toastType = type;
    toastVisible = true;
    toastTimeout = setTimeout(() => { toastVisible = false; }, 4000);
  };

  const roleLabel = (roleId) => ALL_ROLES.find(r => r.id === roleId)?.label ?? roleId;
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

      <div class="flex flex-row items-center justify-between mb-6">
        <h2 class="text-gray-900 dark:text-white font-bold text-xl">Benutzerverwaltung</h2>
        <GradientButton color="cyanToBlue" onclick={openNew}>
          <UserAddOutline class="w-4 h-4 mr-2" />
          Neuer Benutzer
        </GradientButton>
      </div>

      {#if toastVisible}
        <Alert color={toastType} class="mb-4">
          <CheckCircleSolid slot="icon" class="w-4 h-4" />
          {toastMsg}
        </Alert>
      {/if}

      <!-- Rollentabelle Legende -->
      <details class="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <summary class="cursor-pointer font-medium">Rollen-Übersicht anzeigen</summary>
        <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
          {#each ALL_ROLES as role}
            <div><span class="font-semibold">{role.label}</span> — {role.desc}</div>
          {/each}
        </div>
      </details>

      <Table striped={true}>
        <TableHead>
          <TableHeadCell>Name / E-Mail</TableHeadCell>
          <TableHeadCell>Rollen</TableHeadCell>
          <TableHeadCell class="text-right">Aktionen</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each users as user}
            <TableBodyRow>
              <TableBodyCell>
                <div class="font-medium text-gray-900 dark:text-white">{fullName(user)}</div>
                <div class="text-xs text-gray-500">{user.email || '—'}</div>
                <div class="text-xs text-gray-400 font-mono">{user.uid}</div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-wrap gap-1">
                  {#each user.roles as roleId}
                    <Badge color="blue" class="text-xs">{roleLabel(roleId)}</Badge>
                  {/each}
                  {#if user.roles.length === 0}
                    <span class="text-gray-400 text-xs italic">keine Rollen</span>
                  {/if}
                </div>
                <div class="mt-1 text-xs">
                  {#if user.role1 === 'combo'}
                    <Badge color="green" class="text-xs">Storage: combo ✓</Badge>
                  {:else}
                    <Badge color="red" class="text-xs">Storage: role1 nicht gesetzt</Badge>
                  {/if}
                </div>
              </TableBodyCell>
              <TableBodyCell class="text-right">
                <div class="flex flex-row gap-2 justify-end">
                  <GradientButton size="xs" color="cyanToBlue" onclick={() => openEdit(user)}>
                    Edit
                  </GradientButton>
                  <Button size="xs" color="alternative" onclick={() => sendReset(user)}>
                    PW Reset
                  </Button>
                  <Button size="xs" color="red" onclick={() => openDelete(user)}>
                    <TrashBinOutline class="w-3 h-3" />
                  </Button>
                </div>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>

    </Card>
  </div>
{/if}

<!-- ═══════ MODAL: BENUTZER BEARBEITEN ═══════ -->
<Modal title="Benutzer bearbeiten" bind:open={editModalOpen} size="md">
  {#if editUser}
    <div class="mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs font-mono text-gray-400">
      UID: {editUser.uid}
    </div>

    <div class="mb-3 grid grid-cols-2 gap-3">
      <div>
        <Label for="edit-vname" class="mb-1">Vorname</Label>
        <Input id="edit-vname" bind:value={editVName} placeholder="Vorname" />
      </div>
      <div>
        <Label for="edit-fname" class="mb-1">Nachname</Label>
        <Input id="edit-fname" bind:value={editFName} placeholder="Nachname" />
      </div>
    </div>

    <div class="mb-5">
      <Label for="edit-email" class="mb-1">E-Mail</Label>
      <Input id="edit-email" type="email" bind:value={editEmail} placeholder="name@evang9.wien" />
    </div>

    <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Rollen</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      {#each ALL_ROLES as role}
        <label class="flex items-start gap-3 p-2 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
          <input
            type="checkbox"
            class="mt-0.5"
            checked={editRoles.includes(role.id)}
            onchange={() => toggleEditRole(role.id)}
          />
          <div>
            <div class="font-medium text-sm text-gray-800 dark:text-white">{role.label}</div>
            <div class="text-xs text-gray-500">{role.desc}</div>
          </div>
        </label>
      {/each}
    </div>

    {#if saveStatus === 'error'}
      <Alert color="red" class="mb-4">
        <InfoCircleSolid slot="icon" class="w-4 h-4" />
        Fehler beim Speichern. Bitte erneut versuchen.
      </Alert>
    {/if}

    <div class="flex gap-3 pt-2">
      <GradientButton color="cyanToBlue" onclick={saveUser} disabled={saveStatus === 'saving'}>
        {#if saveStatus === 'saving'}<Spinner size={4} class="mr-2" />Speichern…{:else}Speichern{/if}
      </GradientButton>
      <Button color="alternative" onclick={() => (editModalOpen = false)}>Abbrechen</Button>
    </div>
  {/if}
</Modal>

<!-- ═══════ MODAL: NEUER BENUTZER ═══════ -->
<Modal title="Neuen Benutzer anlegen" bind:open={newModalOpen} size="md">

  <!-- Schritt-für-Schritt Anleitung -->
  <div class="mb-5 p-3 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700 text-sm">
    <p class="font-semibold text-blue-800 dark:text-blue-200 mb-2">So geht's — 2 Schritte:</p>
    <ol class="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
      <li>
        <strong>Firebase Console</strong> →
        <a href="https://console.firebase.google.com/" target="_blank" class="underline">Authentication → Users</a>
        → „Add user" → E-Mail &amp; Passwort eingeben → User anlegen →
        <strong>die UID kopieren</strong> (steht in der ersten Spalte der Tabelle).
      </li>
      <li>
        Hier unten die <strong>kopierte UID</strong> einfügen, Name, E-Mail und Rollen setzen → Anlegen.
      </li>
    </ol>
    <p class="mt-2 text-xs text-blue-600 dark:text-blue-400">
      Der User kann sich danach sofort einloggen und hat die zugewiesenen Rollen.
      Optional: "PW Reset" senden, damit er sein Passwort selbst setzen kann.
    </p>
  </div>

  <div class="mb-3">
    <Label for="new-uid" class="mb-1">
      Firebase UID <span class="text-red-500">*</span>
    </Label>
    <Input
      id="new-uid"
      bind:value={newUid}
      placeholder="z.B. XyZ1a2b3c4d5e6f7g8h9"
      class="font-mono text-sm"
    />
    <p class="text-xs text-gray-500 mt-1">
      Aus Firebase Console → Authentication → Users → erste Spalte (User UID)
    </p>
  </div>

  <div class="mb-3 grid grid-cols-2 gap-3">
    <div>
      <Label for="new-vname" class="mb-1">Vorname</Label>
      <Input id="new-vname" bind:value={newVName} placeholder="Vorname" />
    </div>
    <div>
      <Label for="new-fname" class="mb-1">Nachname</Label>
      <Input id="new-fname" bind:value={newFName} placeholder="Nachname" />
    </div>
  </div>

  <div class="mb-5">
    <Label for="new-email" class="mb-1">E-Mail</Label>
    <Input id="new-email" type="email" bind:value={newEmail} placeholder="name@evang9.wien" />
  </div>

  <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Rollen</p>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
    {#each ALL_ROLES as role}
      <label class="flex items-start gap-3 p-2 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
        <input
          type="checkbox"
          class="mt-0.5"
          checked={newRoles.includes(role.id)}
          onchange={() => toggleNewRole(role.id)}
        />
        <div>
          <div class="font-medium text-sm text-gray-800 dark:text-white">{role.label}</div>
          <div class="text-xs text-gray-500">{role.desc}</div>
        </div>
      </label>
    {/each}
  </div>

  {#if newStatus === 'exists'}
    <Alert color="yellow" class="mb-3">
      <InfoCircleSolid slot="icon" class="w-4 h-4" />
      Diese UID existiert bereits in der Benutzerliste.
    </Alert>
  {:else if newStatus === 'error'}
    <Alert color="red" class="mb-3">
      <InfoCircleSolid slot="icon" class="w-4 h-4" />
      Fehler beim Anlegen. Bitte erneut versuchen.
    </Alert>
  {:else if newStatus === 'ok'}
    <Alert color="green" class="mb-3">
      <CheckCircleSolid slot="icon" class="w-4 h-4" />
      Benutzer erfolgreich angelegt.
    </Alert>
  {/if}

  <div class="flex gap-3 pt-2">
    <GradientButton
      color="cyanToBlue"
      onclick={createUser}
      disabled={!newUid.trim() || newStatus === 'saving' || newStatus === 'ok'}
    >
      {#if newStatus === 'saving'}<Spinner size={4} class="mr-2" />Anlegen…{:else}Anlegen{/if}
    </GradientButton>
    <Button color="alternative" onclick={() => (newModalOpen = false)}>Abbrechen</Button>
  </div>
</Modal>

<!-- ═══════ MODAL: LÖSCHEN BESTÄTIGEN ═══════ -->
<Modal bind:open={deleteModalOpen} size="xs">
  <div class="text-center">
    <ExclamationCircleOutline class="mx-auto mb-4 text-red-500 w-12 h-12" />
    <h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Benutzer entfernen?</h3>
    <p class="mb-5 text-sm text-gray-500">
      <strong>{fullName(deleteUser)}</strong> wird aus der Rollenverwaltung entfernt.
      Der Firebase Auth-Account bleibt erhalten und muss separat in der
      <a href="https://console.firebase.google.com/" target="_blank" class="underline">Firebase Console</a>
      gelöscht werden.
    </p>
    <div class="flex gap-3 justify-center pt-2">
      <Button color="red" onclick={confirmDelete}>Ja, entfernen</Button>
      <Button color="alternative" onclick={() => (deleteModalOpen = false)}>Abbrechen</Button>
    </div>
  </div>
</Modal>

<WaitPopup {popupSpinnerModal} message="Benutzerdaten werden geladen." />
<LoginFirebase popupFireBaseLogin={$authReady && !$currentUser} auth={null} />
