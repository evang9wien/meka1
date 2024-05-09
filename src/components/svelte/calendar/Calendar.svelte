<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import * as dayjs from 'dayjs';
  import 'dayjs/locale/de';

  import moment from 'moment/min/moment-with-locales';

  import { Timeline, TimelineItem, Avatar } from 'flowbite-svelte';
  import { CalendarWeekSolid, FilterOutline } from 'flowbite-svelte-icons';
  import { ArrowRightOutline } from 'flowbite-svelte-icons';
  import { getImageCalAvatar } from '../predigt/PredigtConstants.js';
  import PredigtAvatar from '../predigt/PredigtAvatar.svelte';

  export let filter;

  let items = [];

  onMount(async () => {
    moment.locale('de');
    console.log(moment(1316116057189).fromNow());
    axios
      .get(
        'https://www.googleapis.com/calendar/v3/calendars/095lkf9ujgaa4u1qmi4e2vf00k@group.calendar.google.com/events?key=AIzaSyBU0NT8Jy8m_2UkJdThdIs1Ee0lL9ZzVus&timeMin=' +
          new Date().toISOString()
      )
      .then((response) => {
        items = response.data.items;
        items.sort(function (a, b) {
          var keyA = new Date(a.start.dateTime),
            keyB = new Date(b.start.dateTime);
          // Compare the 2 dates
          if (keyA < keyB) return -1;
          if (keyA > keyB) return 1;
          return 0;
        });

        items = items.map((i) => {
          moment.locale('de');
          return { ...i, startDate: moment(new Date(i.start.dateTime)).format('dddd, Do MMMM  YYYY, H:mm ') };
        });
        if (filter) {
          items = items.filter((f) => f.summary.toLowerCase().includes(filter));
        }
        console.log(items);
      });
  });
</script>

<div class="flex justify-center mb-6">
  <Timeline order="vertical">
    {#each items as item}
      <TimelineItem title={item.summary} date={item.startDate}>
        <svelte:fragment slot="icon">
          <span
            class="flex absolute -start-3 justify-center items-center w-6 h-6 bg-primary-200 rounded-full ring-8 ring-blue-50 dark:ring-[#030620] dark:bg-primary-900"
          >
            {#if item.summary.includes('meka Classic')}
              <PredigtAvatar clazz="w-6 h-6" title="meka classic" } />
            {:else if getImageCalAvatar(item.description ? item.description.split(' ')[0] : '')}
              <PredigtAvatar clazz="w-6 h-6" prediger={item.description.split(' ')[0]} />
            {:else}
              <CalendarWeekSolid class="w-4 h-4 text-primary-600 dark:text-primary-400" />
            {/if}
          </span>
        </svelte:fragment>

        <div class="flex space-x-4 text-base font-normal text-gray-500 dark:text-gray-400">
          {item.description ? item.description : ''}
        </div>
      </TimelineItem>
    {/each}
  </Timeline>
</div>
