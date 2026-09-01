<script lang="ts">
  import { onMount } from 'svelte';
  import axios from 'axios';
  import dayjs from 'dayjs';
  import 'dayjs/locale/de';

  import { Timeline, TimelineItem, Avatar } from 'flowbite-svelte';
  import { CalendarWeekSolid, FilterOutline } from 'flowbite-svelte-icons';
  import PredigtAvatar from '../predigt/PredigtAvatar.svelte';
  import { resolveLocalAvatarSrc } from '../predigt/PredigtConstants.ts';
  import { predigerList, getPredigerKuerzelFromStore, initPredigerStore, type PredigerEntry } from '../stores/predigerStore.ts';
  import { initAppCheck, getDb } from '../firebase/firebase.ts';

  interface CalendarItem {
    summary: string;
    description?: string;
    start: { dateTime: string };
    startDate?: string;
    [key: string]: unknown;
  }

  const kreuzSrc = resolveLocalAvatarSrc('kreuz-bunt.svg') ?? '';

  // Reaktiv: gibt Kürzel zurück — list-Parameter zwingt Svelte zur Neuauswertung
  // wenn sich $predigerList ändert
  function getKuerzelForAvatar(description: string | undefined, list: PredigerEntry[] | null): string {
    if (!description) return '';
    return getPredigerKuerzelFromStore(description);
  }

  export let filter: string | undefined = undefined;

  let items: CalendarItem[] = [];

  onMount(async () => {
    dayjs.locale('de');
    // Prediger-Store initialisieren (lädt Firestore "prediger", einmaliger Seed wenn leer)
    const app = initAppCheck();
    initPredigerStore(getDb());
    // console.log(dayjs(1316116057189).fromNow());
    axios
      .get(
        'https://www.googleapis.com/calendar/v3/calendars/095lkf9ujgaa4u1qmi4e2vf00k@group.calendar.google.com/events?key=AIzaSyBU0NT8Jy8m_2UkJdThdIs1Ee0lL9ZzVus&timeMin=' +
          new Date().toISOString()
      )
      .then((response) => {
        items = response.data.items;
        items = items.sort(function (a, b) {
          var keyA = new Date(a.start.dateTime),
            keyB = new Date(b.start.dateTime);
          // Compare the 2 dates
          if (keyA < keyB) return -1;
          if (keyA > keyB) return 1;
          return 0;
        });
        //console.log(items);
        //console.log('Filter: ', filter);
        items = items.map((i) => {
          dayjs.locale('de');
          return { ...i, startDate: dayjs(new Date(i.start.dateTime)).format('dddd, D. MMMM  YYYY, H:mm ') };
        });
        if (filter) {
          items = items.filter((f) => f.summary.toLowerCase().includes(filter.toLowerCase()));
        }
        //console.log(items);
      });
  });
</script>

<div class="flex justify-center mb-6 ml-6">
  
  <Timeline order="vertical">
    {#each items as item}
      <TimelineItem title={item.summary} date="">        
        
        {#snippet orientationSlot()}
          <span class="absolute bg-primary-200 dark:bg-primary-900 -start-10 flex h-6 w-6 items-center justify-center rounded-full ring-6 ring-[#f0f5fb] dark:ring-[#111d33]">
        
          
            {#if item.summary.includes('MEKA-Classic')}
              <PredigtAvatar clazz="w-6 h-6" title="meka classic" />
            {:else if item.summary.includes('Comboprobe')}
              <PredigtAvatar clazz="w-6 h-6" title="comboprobe" />
            {:else if getKuerzelForAvatar(item.description, $predigerList)}
              <PredigtAvatar clazz="w-6 h-6" prediger={getKuerzelForAvatar(item.description, $predigerList)} />
            {:else}
              <img src={kreuzSrc} alt="Termin" class="w-5 h-5 object-contain" />
            {/if}
          
            </span>
            {/snippet}        
        <p class="mb-4 text-base font-normal text-[#2c4a7c] dark:text-[#bcd0ed]">
          {item.startDate}
        </p>
        <p class="mb-4 text-base font-normal text-[#6a96d3] dark:text-[#6a96d3]">
          {item.description ? item.description : ''}
        </p>
      </TimelineItem>
    {/each}
  </Timeline>
</div>
