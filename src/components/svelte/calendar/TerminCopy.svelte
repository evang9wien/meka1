<script lang="ts">
  import { onMount } from 'svelte';
  import axios from 'axios';
  import {
    Input,
    Label,
    GradientButton,
    Card,
    Table,
    TableHead,
    TableBody,
    TableBodyRow,
    TableBodyCell,
    TableHeadCell,
  } from 'flowbite-svelte';
  import { Button } from 'flowbite-svelte';
  import { ArrowsRepeatOutline, TrashBinOutline, FolderPlusOutline, CheckCircleSolid } from 'flowbite-svelte-icons';
  import dayjs from 'dayjs';

  import { getDatabase, ref as dbref, query, orderByKey, startAt, onValue, set } from 'firebase/database';
  import { remove } from 'firebase/database'; // für Löschen
  import { firebaseConfig } from '../firebase/firebase.js';
  import { getFirestore, doc, getDoc } from 'firebase/firestore';
  import { initializeApp, getApps, getApp } from 'firebase/app';
  import WaitPopup from '../popup/WaitPopup.svelte';
  import LoginFirebase from '../auth/LoginFirebase.svelte';
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';

  dayjs.extend(utc);
  dayjs.extend(timezone);

  let userAuth = false;
  let popupSpinnerModal = false;
  let auth;
  let popupFireBaseLogin = false;

  let fromDate: string = new Date().toISOString().split('T')[0];
  let toDate: string = new Date(Date.now() + 32 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const calendarId = '095lkf9ujgaa4u1qmi4e2vf00k@group.calendar.google.com';
  const apiKey = 'AIzaSyBU0NT8Jy8m_2UkJdThdIs1Ee0lL9ZzVus';

  let dbRealtime;

  let googleEvents: any[] = [];
  let firebaseEvents: any[] = [];

  // Hilfsstruktur für kombinierte Darstellung
  let combinedEvents: any[] = [];

  let terminAdminRole = false;
  let members;

  const predigerMapping = {
    'Stefan FLEISCHNER-JANITS': 'SFJ',
    'Harald GESCHL': 'GH',
    'Wolfgang WALDSCHÜTZ': 'WW',
    'Mark RUIZ HELLÍN': 'MRH',
    'Tanja DIETRICH HÜBNER': 'TDH',
  };

  function extractVerantwortlich(description: string): string {
    for (const name in predigerMapping) {
      if (description?.toUpperCase().includes(name.toUpperCase())) {
        return predigerMapping[name];
      }
    }
    return '';
  }

  function extractAbendmahl(description: string): string {
    return description?.includes('~ Y') ? '1' : '0';
  }

  // Firebase App absichern

  async function fetchGoogleEvents() {
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}` +
      `&timeMin=${new Date(fromDate).toISOString()}` +
      `&timeMax=${new Date(new Date(toDate).getTime() + 24 * 60 * 60 * 1000).toISOString()}`;

    try {
      const response = await axios.get(url);
      googleEvents = response.data.items.map((event) => {
        const start = event.start.dateTime || event.start.date;
        const timestamp = dayjs(start).tz('Europe/Vienna').format('YYYY-MM-DD HH:mm:ss');
        return {
          id: event.id,
          timestamp,
          summary: event.summary || '',
          description: event.description || '',
        };
      });

      combineEvents();
    } catch (error) {
      console.error('Fehler beim Abrufen der Google Calendar Termine:', error);
    }
  }

  async function fetchFirebaseEvents() {
    const dbRef = query(dbref(dbRealtime, 'combo/termine'), orderByKey(), startAt(fromDate));
    onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        firebaseEvents = Object.values(snapshot.val());
      } else {
        firebaseEvents = [];
      }
      combineEvents();
    });
  }
  async function deleteFromFirebase(timestamp: string) {
    try {
      await remove(dbref(dbRealtime, `combo/termine/${timestamp}`));
      fetchFirebaseEvents();
    } catch (error) {
      console.error('Fehler beim Löschen aus Firebase:', error);
    }
  }

  async function addComboprobe(timestamp: string) {
    const data = {
      Abendmahl: '',
      Bass: '',
      Combo: '',
      Drums: '',
      Gitarre: '',
      KS_Koordination: '',
      Melodie: '',
      Tasten: '',
      Termin: timestamp,
      Veranstaltung: 'CP',
      Verantwortlich: 'COM',
      Zusatzinfo: 'Comboprobe',
    };

    try {
      await set(dbref(dbRealtime, `combo/termine/${timestamp}`), data);
      fetchFirebaseEvents();
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Comboprobe:', error);
    }
  }

  // Kombiniert Termine mit gleichem Zeitstempel
  function combineEvents() {
    const map = new Map();

    for (const ge of googleEvents) {
      map.set(ge.timestamp, { timestamp: ge.timestamp, google: ge, firebase: null });
    }

    for (const fe of firebaseEvents) {
      if (map.has(fe.Termin)) {
        map.get(fe.Termin).firebase = fe;
      } else {
        map.set(fe.Termin, { timestamp: fe.Termin, google: null, firebase: fe });
      }
    }

    combinedEvents = Array.from(map.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    console.log(combineEvents);
  }

  function isSynced(timestamp: string) {
    return firebaseEvents.some((e) => e.Termin === timestamp);
  }

  // Liste mit zusätzlichen zu entfernenden Wörtern
  const removeWords = ['Pfarrer', 'Lektorin', 'Lektor', 'Pf.i.R.'];

  function cleanDescription(description: string): string {
    if (!description) return '';

    let cleaned = description;

    // 1. Abendmahl-Zeichen "~ Y" oder "~Y" entfernen
    cleaned = cleaned.replace(/\s*~\s*Y\s*/gi, ' ');

    // 2. Predigernamen aus predigerMapping entfernen (inkl. optionalem Komma)
    for (const name in predigerMapping) {
      const regex = new RegExp(name + '\\s*,?', 'gi');
      cleaned = cleaned.replace(regex, ' ');
    }

    // 3. Zusatzwörter entfernen (inkl. optionalem Komma)
    for (const word of removeWords) {
      const regex = new RegExp(word + '\\s*,?', 'gi');
      cleaned = cleaned.replace(regex, ' ');
    }

    // 4. Überflüssige Leerzeichen bereinigen
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

    return cleaned;
  }



  async function syncToFirebase(event) {
    const data = {
      Abendmahl: extractAbendmahl(event.description),
      Bass: '',
      Combo: '1',
      Drums: '',
      Gitarre: '',
      KS_Koordination: '',
      Melodie: '',
      Tasten: '',
      Termin: event.timestamp,
      Veranstaltung: 'GD',
      Verantwortlich: extractVerantwortlich(event.description),
      Zusatzinfo: cleanDescription(event.description), // <- hier bereinigt
    };

    try {
      await set(dbref(dbRealtime, `combo/termine/${event.timestamp}`), data);
      fetchFirebaseEvents(); // reload after sync
    } catch (error) {
      console.error('Fehler beim Schreiben in Firebase:', error);
    }
  }

  onMount(() => {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    dbRealtime = getDatabase(app);
    auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        popupFireBaseLogin = true;
        return;
      } else {
        userAuth = true;
      }
      popupSpinnerModal = true;
      await fetchGoogleEvents();
      await fetchFirebaseEvents();
      

      const dbFireStore = getFirestore(app);
      const maRef = doc(dbFireStore, 'mitarbeiter', 'combo');
      const docSnap = await getDoc(maRef);
      if (docSnap.exists()) {
        members = Object.values(docSnap.data()).filter((m) => m.Active == '1');
        members = members
          .map((t) => ({
            ...t,
            name: t.VName + ' ' + t.FName + ' (' + t.ShortName + ')',
            value: t.ShortName,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        // rolle prüfen
        console.log('Mitarbeiter: ', members);
        console.log('User: ', user.providerData[0].email);
        let loginUser = members.filter((m) => m.Email == user.providerData[0].email);
        if (loginUser.length > 0) {
          console.log('LoginUser: ', loginUser[0]);
          // if (loginUser[0].role && loginUser[0].role.filter((r) => r == 'comboadmin').length > 0) {
          //   console.log('Role: ', loginUser[0].role);
          //   comboAdminRole = true;
          // }
          if (loginUser[0].role && loginUser[0].role.filter((r) => r == 'terminadmin').length > 0) {
            console.log('Role: ', loginUser[0].role);
            terminAdminRole = true;
          }
        }
      }
      popupSpinnerModal = false;

    });
  });
</script>

<!-- UI -->
{#if userAuth && !popupSpinnerModal && !terminAdminRole}
   <div class="p-4">
    <Card class="border-2 border-red-600 bg-red-50 content-center">
      <h1 class="text-xl font-bold mb-4 text-red-700">Zugriff verweigert</h1>
      <p>Du hast leider keine Berechtigung, um diese Seite zu sehen. Bitte wende dich an den Administrator.</p>
    </Card>
   </div>
{/if}
{#if userAuth && !popupSpinnerModal && terminAdminRole}
  <div class="p-4">
    <Card>
      <h1 class="text-xl font-bold mb-4">Terminübersicht</h1>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label for="fromDate">Von Datum</Label>
          <Input id="fromDate" bind:value={fromDate} />
        </div>
        <div>
          <Label for="toDate">Bis Datum</Label>
          <Input id="toDate" bind:value={toDate} />
        </div>
      </div>
      <GradientButton
        color="cyanToBlue"
        on:click={async () => {
          popupSpinnerModal = true;
          await fetchGoogleEvents();
          await fetchFirebaseEvents();
          popupSpinnerModal = false;
        }}
      >
        Termine neu laden
      </GradientButton>
    </Card>

    <Table class="mt-6">
      <TableHead>
        <TableHeadCell>Datum & Uhrzeit</TableHeadCell>
        <TableHeadCell>Google Calendar</TableHeadCell>
        <TableHeadCell>Firebase</TableHeadCell>
        <TableHeadCell>Aktion</TableHeadCell>
      </TableHead>
      <TableBody>
        {#each combinedEvents as entry}
          <TableBodyRow>
            <TableBodyCell>{entry.timestamp}</TableBodyCell>
            <TableBodyCell>
              {#if entry.google}
                <div class="font-bold">{entry.google.summary}</div>
                <div class="text-sm text-gray-500">{entry.google.description}</div>
              {:else}
                <span class="text-gray-400 italic">Kein Eintrag</span>
              {/if}
            </TableBodyCell>
            <TableBodyCell>
              {#if entry.firebase}
                <div class="font-bold">{entry.firebase.Veranstaltung}</div>
                <div class="text-sm">
                  Verantworlich: <span class="font-semibold">{entry.firebase.Verantwortlich}</span>
                </div>
                {#if entry.firebase.Abendmahl === '1'}
                  <div class="text-sm text-green-600 font-semibold">Abendmahl: Ja</div>
                {/if}
                <div class="text-sm text-gray-500">{entry.firebase.Zusatzinfo}</div>
              {:else}
                <span class="text-gray-400 italic">Nicht vorhanden</span>
              {/if}
            </TableBodyCell>
            <TableBodyCell class="flex flex-col gap-2">
              {#if entry.google && entry.google?.summary.replaceAll(" ", "") !== 'Comboprobe'}
                <Button
                  size="xs"
                  color="blue"
                  on:click={() => syncToFirebase(entry.google)}
                  disabled={isSynced(entry.timestamp)}
                >
                  <ArrowsRepeatOutline class="mr-2 h-4 w-4" />
                  {isSynced(entry.timestamp) ? '✓ Synced' : 'Sync ' + entry.google?.summary}
                </Button>
              {/if}
              {#if entry.google && entry.google?.summary.replaceAll(" ", "") === 'Comboprobe' && isSynced(entry.timestamp)}
                <Button size="xs" color="blue" disabled={isSynced(entry.timestamp)}>
                  <ArrowsRepeatOutline class="mr-2 h-4 w-4" />
                  {isSynced(entry.timestamp) ? '✓ Synced Comboprobe' : 'Sync '}
                </Button>
              {/if}
              {#if !entry.google}
                <Button size="xs" color="red" on:click={() => deleteFromFirebase(entry.timestamp)}>
                  <TrashBinOutline class="mr-2 h-4 w-4" />
                  Löschen
                </Button>
              {:else if entry.google?.summary.replaceAll(" ", "") === 'Comboprobe' && !entry.firebase}
                <Button size="xs" color="yellow" on:click={() => addComboprobe(entry.timestamp)}>
                  <FolderPlusOutline class="mr-2 h-4 w-4" />
                  Sync Comboprobe
                </Button>
              {/if}
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
    <Card href="/cards" class="p-4 sm:p-6 md:p-8">
      <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        Anleitung für die Terminpflege
      </h5>
      <p class="leading-tight font-normal text-gray-700 dark:text-gray-400">
        Zuerste müssen neue Termine im Meka Google Kalendar eingepflegt werden. <br />
        Für Gottestdienste muss
      </p>
      <ul class="my-7 space-y-4">
        <li class="flex space-x-2 rtl:space-x-reverse">
          <CheckCircleSolid class="text-primary-600 dark:text-primary-500 h-4 w-4" /><span
            class="text-base leading-tight font-normal text-gray-500 dark:text-gray-400">der Titel</span
          >
        </li>
        <li class="flex space-x-2 rtl:space-x-reverse">
          <CheckCircleSolid class="text-primary-600 dark:text-primary-500 h-4 w-4" /><span
            class="text-base leading-tight font-normal text-gray-500 dark:text-gray-400"
            >und in der Beschreibung der Name</span
          >
        </li>
        <li class="flex space-x-2 rtl:space-x-reverse">
          <CheckCircleSolid class="text-primary-600 dark:text-primary-500 h-4 w-4" /><span
            class="text-base leading-tight font-normal text-gray-500 dark:text-gray-400">das Abendmahlzeichen ~ Y</span
          >
        </li>
        <li class="flex space-x-2 rtl:space-x-reverse">
          <CheckCircleSolid class="text-primary-600 dark:text-primary-500 h-4 w-4" /><span
            class="text-base leading-tight font-normal text-gray-500 dark:text-gray-400"
            >und optional Zusatzinfo
          </span>
        </li>
      </ul>
      eingetragen werden.<br /><br />
      Für einen neuen Comboprobentermin muss
      <ul class="my-7 space-y-4">
        <li class="flex space-x-2 rtl:space-x-reverse">
          <CheckCircleSolid class="text-primary-600 dark:text-primary-500 h-4 w-4" /><span
            class="text-base leading-tight font-normal text-gray-500 dark:text-gray-400"
            >ein Termin mit dem Titel Comboprobe
          </span>
        </li>
      </ul>
      eingetragen werden.<br /><br />
      <p>
        Sobald die Termine im Google Kalendar eingetragen sind, können sie hier in den Combo Kalendar kopiert werden.
      </p>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Termine werden neu geladen." />
<!-- <LoginWarn {popupUserAuthModal} /> -->
<LoginFirebase {popupFireBaseLogin} {auth} />
