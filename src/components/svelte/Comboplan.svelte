    <script>
    import { onMount } from "svelte";
    import axios from "axios";
    import moment from 'moment';
  
    let termine;
    onMount(() => {
      axios
        .get("https://www.evang9.wien/root/wp-json/combo/v1/combo?month=3")
        .then(response => {
          termine = JSON.parse(response.data);
          // termine = response.data;
        });
    });
  
    let formatDate = date => {
      const options = {
        weekday: "short",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric"
      };
      return new Date(date)
        .toLocaleDateString("de-DE", options)
        .replace(/,/g, "");
    };
  </script>
  
  <center>
    <table class="ma_list">
      <tbody>
        <tr class="table_header">
          <td>Termin</td>
          <td>AM</td>
          <td>Bemerkung</td>
          <td>Pred.</td>
          <td>Tasten</td>
          <td>Melodie</td>
          <td>Drums</td>
          <td>Bass</td>
          <td>Git.</td>
        </tr>
        {#if termine}
          {#each termine as termin}
            <tr>
              <td>{formatDate(moment(termin.Termin).toDate())}</td>
              <td>{termin.Abendmahl == 1 ? 'Y' : ''}</td>
              <td>{termin.Zusatzinfo}</td>
              <td>{termin.Verantwortlich}</td>
              <td>{termin.Tasten}</td>
              <td>{termin.Melodie}</td>
              <td>{termin.Drums}</td>
              <td>{termin.Bass}</td>
              <td>{termin.Gitarre}</td>
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="100">loading.....</td>
          </tr>
        {/if}
      </tbody>
    </table>
  </center>
  