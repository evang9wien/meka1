<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import moment from 'moment/min/moment-with-locales';

  import { Timeline, TimelineItem, Avatar } from 'flowbite-svelte';
  import { CalendarWeekSolid } from 'flowbite-svelte-icons';
  import { ArrowRightOutline } from 'flowbite-svelte-icons';
  import { getImageCal } from '../predigt/PredigtConstants.js';

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
            {#if getImageCal(item.description ? item.description.split(' ')[0] : '')}
              <Avatar
                class="w-6 h-6"
                size="md"
                src="https://www.evang9.wien/comboapps/img/{getImageCal(item.description.split(' ')[0])}"
              />
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
