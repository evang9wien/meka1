<script lang="ts">
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Datepicker, Input, Label, GradientButton, Card } from 'flowbite-svelte';

  let fromDate: string = new Date().toISOString().split('T')[0];
  let toDate: string = new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const calendarId = '095lkf9ujgaa4u1qmi4e2vf00k@group.calendar.google.com';
  const apiKey = 'AIzaSyBU0NT8Jy8m_2UkJdThdIs1Ee0lL9ZzVus';
  const firebaseUrl = 'https://YOUR_PROJECT.firebaseio.com/events.json';

  async function fetchEvents() {
    console.log(new Date(fromDate).toISOString());
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}` +
      `&timeMin=${new Date(fromDate).toISOString()}` +
      `&timeMax=${new Date(new Date(toDate).getTime() + 24 * 60 * 60 * 1000).toISOString()}`;

    try {
      const response = await axios.get(url);

      const events = response.data.items;
      console.log(events);

      for (const event of events) {
        const start = event.start.dateTime || event.start.date;
        const timestamp = new Date(start).toISOString().replace('T', ' ').substring(0, 19);

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
          Veranstaltung: event.summary || '',
          Verantwortlich: '',
          Zusatzinfo: event.description || '',
        };

        await axios.put(`https://YOUR_PROJECT.firebaseio.com/events/${timestamp}.json`, data);
      }
      alert('Termine erfolgreich importiert.');
    } catch (error) {
      console.error('Fehler beim Abrufen oder Speichern der Termine:', error);
    }
  }
</script>

<div class="flex justify-center mb-4">
  <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
    <h1 class="text-gray-900 dark:text-white font-bold mb-4">Google Kalender Import</h1>
    <div class="grid gap-4 sm:grid-cols-2 sm:gap-6">
      <div class="flex flex-row">
        <Label for="fromDate">Von Datum</Label>
        <Input inline id="fromDate" bind:value={fromDate} />
      </div>

      <div class="flex flex-row">
        <Label for="toDate">Bis Datum</Label>
        <Input id="toDate" bind:value={toDate} />
      </div>

      <GradientButton class="mb-4 mr-4" color="cyanToBlue" on:click={fetchEvents}>Termine importieren</GradientButton>
    </div>
  </Card>
</div>
