<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import dayjs from 'dayjs';
  import 'dayjs/locale/de';

  import { Timeline, TimelineItem, Avatar } from 'flowbite-svelte';
  import { CalendarWeekSolid, FilterOutline } from 'flowbite-svelte-icons';
  import { getImageCalAvatar } from '../predigt/PredigtConstants.js';
  import PredigtAvatar from '../predigt/PredigtAvatar.svelte';

  export let filter;

  let items = [];

  onMount(async () => {
    dayjs.locale('de');
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
      <TimelineItem title={item.summary} >        
        
        {#snippet orientationSlot()}
          <span class="absolute bg-primary-200 dark:bg-primary-900 -start-10 flex h-6 w-6 items-center justify-center rounded-full ring-6 ring-white dark:ring-gray-900">
        
          
            {#if item.summary.includes('MEKA-Classic')}
              <PredigtAvatar clazz="w-6 h-6" title="meka classic" } />
            {:else if item.summary.includes('Comboprobe')}
              <PredigtAvatar clazz="w-6 h-6" title="comboprobe" } />  
            {:else if getImageCalAvatar(item.description ? item.description.split(' ')[0] : '')}
              <PredigtAvatar clazz="w-6 h-6" prediger={item.description.split(' ')[0]} />
            {:else}            
              <CalendarWeekSolid class="text-primary-600 dark:text-primary-400 h-4 w-4" />
            {/if}
          
            </span>
            {/snippet}        
        <p class="mb-4 text-base font-normal text-gray-600 dark:text-gray-200">
          {item.startDate}
        </p>
        <p class="mb-4 text-base font-normal text-gray-400 dark:text-gray-400">
          {item.description ? item.description : ''}
        </p>
      </TimelineItem>
    {/each}
  </Timeline>
</div>
