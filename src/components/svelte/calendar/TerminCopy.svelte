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
  import dayjs from 'dayjs';

  import { getDatabase, ref as dbref, query, orderByKey, startAt, onValue, set } from 'firebase/database';
  import { firebaseConfig } from '../firebase/firebase.js';
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

  let googleEvents: any[] = [];
  let firebaseEvents: any[] = [];

  // Hilfsstruktur für kombinierte Darstellung
  let combinedEvents: any[] = [];

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
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const dbRealtime = getDatabase(app);
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

  async function syncToFirebase(event) {
    const data = {
      Abendmahl: '',
      Bass: '',
      Combo: '',
      Drums: '',
      Gitarre: '',
      KS_Koordination: '',
      Melodie: '',
      Tasten: '',
      Termin: event.timestamp,
      Veranstaltung: event.summary,
      Verantwortlich: '',
      Zusatzinfo: event.description,
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
      popupSpinnerModal = false;
    });
  });
</script>

<!-- UI -->

{#if userAuth && !popupSpinnerModal}
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
                <div class="font-bold">{entry.firebase.Verantwortlich}</div>
                <div class="text-sm text-gray-500">{entry.firebase.Zusatzinfo}</div>
              {:else}
                <span class="text-gray-400 italic">Nicht vorhanden</span>
              {/if}
            </TableBodyCell>
            <TableBodyCell>
              {#if entry.google}
                <button
                  class="px-2 py-1 text-sm bg-blue-500 text-white rounded disabled:opacity-50"
                  on:click={() => syncToFirebase(entry.google)}
                  disabled={isSynced(entry.timestamp)}
                >
                  {isSynced(entry.timestamp) ? '✓ Synced' : '→ Sync'}
                </button>
              {:else}
                —
              {/if}
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Termine werden neu geladen." />
<!-- <LoginWarn {popupUserAuthModal} /> -->
<LoginFirebase {popupFireBaseLogin} {auth} />
