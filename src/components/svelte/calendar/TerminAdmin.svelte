<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import dayjs from 'dayjs';
  import 'dayjs/locale/de';

  import { Timeline, TimelineItem, Avatar, GradientButton } from 'flowbite-svelte';
  import { CalendarWeekSolid } from 'flowbite-svelte-icons';
  import { ArrowRightOutline } from 'flowbite-svelte-icons';
  import { getImageCalAvatar } from '../predigt/PredigtConstants.js';
  import PredigtAvatar from '../predigt/PredigtAvatar.svelte';

  const sync = () => {
    console.log('Sync Termine ...');

    axios
      .get(
        'https://www.googleapis.com/calendar/v3/calendars/095lkf9ujgaa4u1qmi4e2vf00k@group.calendar.google.com/events?key=AIzaSyBU0NT8Jy8m_2UkJdThdIs1Ee0lL9ZzVus&timeMin=' +
          new Date().toISOString()
      )
      .then((response) => {
        let items = response.data.items;
        items.sort(function (a, b) {
          var keyA = new Date(a.start.dateTime),
            keyB = new Date(b.start.dateTime);
          // Compare the 2 dates
          if (keyA < keyB) return -1;
          if (keyA > keyB) return 1;
          return 0;
        });

        items = items.map((i) => {
          dayjs.locale('de');
          return { ...i, startDate: dayjs(new Date(i.start.dateTime)).format('dddd, Do MMMM  YYYY, H:mm ') };
        });

        // filter gottesdienste
        items = items.filter((f) => f.summary.toLowerCase().includes('gottesdienst'));

        console.log(items);
      });
  };

  // onMount(async () => {
  //   dayjs.locale('de');
  //   console.log(dayjs(1316116057189).fromNow());
  //   axios
  //     .get(
  //       'https://www.googleapis.com/calendar/v3/calendars/095lkf9ujgaa4u1qmi4e2vf00k@group.calendar.google.com/events?key=AIzaSyBU0NT8Jy8m_2UkJdThdIs1Ee0lL9ZzVus&timeMin=' +
  //         new Date().toISOString()
  //     )
  //     .then((response) => {
  //       items = response.data.items;
  //       items.sort(function (a, b) {
  //         var keyA = new Date(a.start.dateTime),
  //           keyB = new Date(b.start.dateTime);
  //         // Compare the 2 dates
  //         if (keyA < keyB) return -1;
  //         if (keyA > keyB) return 1;
  //         return 0;
  //       });

  //       items = items.map((i) => {
  //         dayjs.locale('de');
  //         return { ...i, startDate: dayjs(new Date(i.start.dateTime)).format('dddd, Do MMMM  YYYY, H:mm ') };
  //       });
  //       console.log(items);
  //     });
  // });
</script>

<div class="flex flex-row"><h2 class="text-gray-900 dark:text-white font-bold mb-4">TerminAdmin</h2></div>
<div class="flex flex-row">
  <GradientButton class="mb-4 mr-4" color="cyanToBlue" onclick={sync}>Termine abgleichen</GradientButton>
  <!-- <Timeline order="vertical">
    {#each items as item}
      <TimelineItem title={item.summary} date={item.startDate}>
        <svelte:fragment slot="icon">
          <span
            class="flex absolute -start-3 justify-center items-center w-6 h-6 bg-primary-200 rounded-full ring-8 ring-blue-50 dark:ring-[#030620] dark:bg-primary-900"
          >
            {#if getImageCalAvatar(item.description ? item.description.split(' ')[0] : '')}
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
  </Timeline> -->
</div>
