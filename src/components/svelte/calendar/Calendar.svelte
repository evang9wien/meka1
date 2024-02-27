<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import moment from 'moment/min/moment-with-locales';

  import { Timeline, TimelineItem, Button } from 'flowbite-svelte';
  import { ArrowRightOutline } from 'flowbite-svelte-icons';

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
          return { ...i, startDate: moment(new Date(i.start.dateTime)).format('dddd, Do MMMM  YYYY, h:mm ') };
        });
        console.log(items);
      });
  });
</script>

<div class="flex justify-center mb-6">
  <Timeline>
    {#each items as item}
      <TimelineItem title={item.summary} date={item.startDate}>
        <p class="text-base font-normal text-gray-500 dark:text-gray-400">{item.description ? item.description : ''}</p>
      </TimelineItem>
    {/each}
  </Timeline>
</div>
