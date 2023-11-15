<script>
  import { onMount } from "svelte";
  import axios from "axios";
  import Button, { Label, Icon } from "@smui/button";
  import Select, { Option } from "@smui/select";
  import Checkbox from "@smui/checkbox";
  import FormField from "@smui/form-field";
  import Snackbar, { Actions } from "@smui/snackbar";
  import moment from 'moment';
  import {getAuthHeader, isUserAuth} from './auth.js';

  let termine;
  let members;
  let selectedmember;
  let mySnackbar;
  let userAuth = true;
  const loadCombo = () => {
    resetSelection();
    axios
      .get("https://www.evang9.wien/root/wp-json/combo/v1/combo?month=6")
      .then(response => {
        // termine = response.data;
        termine = JSON.parse(response.data);
      });
  };

  onMount(() => {
    userAuth = isUserAuth(); 
    loadCombo();
    axios
      .get("https://www.evang9.wien/root/wp-json/combo/v2/combomembers", getAuthHeader())
      .then(response => {
        members = JSON.parse(response.data);
        console.log(members);
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

  let combo = {};

  const resetSelection = () => {
    combo.Tasten = [];
    combo.Melodie = [];
    combo.Drums = [];
    combo.Bass = [];
    combo.Gitarre = [];
  };

  const checkEntries = (newEntry, oldEntry) => {
    if (!oldEntry) {
      return newEntry;
    }
    if (!oldEntry.includes(newEntry)) {
      return oldEntry + " " + newEntry;
    }
    // remove newEntry
    return oldEntry
      .replace("*" + newEntry + "*", "")
      .replace(newEntry, "")
      .trim();
  };

  let handleSave = event => {
    mySnackbar.open();
    let newEntries = [];
    Object.entries(combo).forEach(([key, values]) => {
      values.forEach(value => {
        let data = value.split(",");
        let termin = {};
        termin.Termin = data[0];
        termin.key = key;
        termin.value = checkEntries(selectedmember, data[1]);
        newEntries.push(termin);
      });
    });
    let name = selectedmember;
    console.log(name, JSON.stringify(newEntries));
    
    axios
      .patch(
        "https://www.evang9.wien/root/wp-json/combo/v2/comboedit",
        newEntries
      )
      .then(
        response => {
          console.log("Success:", response);
          loadCombo();
          axios
            .get(
              // "https://www.evang9.wien/root/wp-json/combo/v1/comboemail?name=AE&date=1.1.2020&instrument=Git&inout=EIN"
              encodeURI(
                "https://www.evang9.wien/root/wp-json/combo/v2/comboemail?name=" +
                  name +
                  "&entries=" +
                  JSON.stringify(newEntries)
              )
            )
            .then(resp => {
              console.log("Send Email", resp);
            });
        },
        error => {
          console.log("Error:", error);
        }
      );
    // reset selected member
    selectedmember = '';
  };
</script>
<center>
{#if userAuth}
<div>

  {#if selectedmember == null}
    <p>
      <Label>Bitte wähle Deinen</Label>
    </p>
  {/if}

  <span>
    <Select bind:value={selectedmember} label={selectedmember == null ? "Namen":"Name"}>      
      {#if members}
        {#each members as member}
          <Option value={member.ShortName}>
            {member.VName} {member.FName} ({member.ShortName})
          </Option>
        {/each}
      {/if}
    </Select>
  </span>

  {#if selectedmember != null}
    <div style="margin-top: 15px;">
      Bitte kontrolliere vor der Bestätigung Deine Eingabe nochmals, Danke!
      <Button
        variant="raised"
        on:click={handleSave}
        disabled={selectedmember == null}>
        <Label>Bestätigen</Label>
      </Button>
    </div>
  {/if}
</div>
<p />
<div class="combo-center">
  <table class="ma_list">
    <tbody>
      <tr class="table_header">
        <td>Termin</td>
        <td>Tasten</td>
        <td>Melodie</td>
        <td>Drums</td>
        <td>Bass</td>
        <td>Git.</td>
        <td>AM</td>
        <td>Bemerkung</td>
        <td>Pred.</td>
      </tr>
      {#if termine}
        {#each termine as termin}
          <tr>
            <!--
            <td>{formatDate(Date.parse(termin.Termin))}</td>            
            -->
            <td>{formatDate(moment(termin.Termin).toDate())}</td>
            <td>
              <FormField>
                <span slot="label">{termin.Tasten}</span>
                <Checkbox
                  bind:group={combo.Tasten}
                  value={termin.Termin + ',' + termin.Tasten} />
              </FormField>
            </td>
            <td>
              <FormField>
                <span slot="label">{termin.Melodie}</span>
                <Checkbox
                  bind:group={combo.Melodie}
                  value={termin.Termin + ',' + termin.Melodie} />
              </FormField>
            </td>
            <td>
              <FormField>
                <span slot="label">{termin.Drums}</span>
                <Checkbox
                  bind:group={combo.Drums}
                  value={termin.Termin + ',' + termin.Drums} />
              </FormField>
            </td>
            <td>
              <FormField>
                <span slot="label">{termin.Bass}</span>
                <Checkbox
                  bind:group={combo.Bass}
                  value={termin.Termin + ',' + termin.Bass} />
              </FormField>
            </td>
            <td>
              <FormField>
                <span slot="label">{termin.Gitarre}</span>
                <Checkbox
                  bind:group={combo.Gitarre}
                  value={termin.Termin + ',' + termin.Gitarre} />
              </FormField>
            </td>
            <td>{termin.Abendmahl == 1 ? 'Y' : ''}</td>
            <td>{termin.Zusatzinfo}</td>
            <td>{termin.Verantwortlich}</td>
          </tr>
        {/each}
      {:else}
        <tr>
          <td colspan="100">loading.....</td>
        </tr>
      {/if}

    </tbody>
  </table>
</div>
{:else}
Bitte zuerst einloggen.
{/if}
</center>
<Snackbar bind:this={mySnackbar}>
  <Label>Auswahl wird gespeichert.</Label>
</Snackbar>
