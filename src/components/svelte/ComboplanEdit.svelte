<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Label, Select } from 'flowbite-svelte';
  import { Button } from 'flowbite-svelte';
  import { Tooltip, GradientButton } from 'flowbite-svelte';
  import { Checkbox } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';

  import { InfoCircleOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider } from 'flowbite-svelte';
  import { Modal } from 'flowbite-svelte';

  import moment from 'moment';
  import { getAuthHeader, isUserAuth } from './auth.js';
  import LoginWarn from './auth/LoginWarn.svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { getImage, getLongName } from './predigt/PredigtConstants.js';
  import { getUrl } from './url/url.js';

  let popupUserAuthModal = false;
  let popupSpinnerModal = true;
  let termine;
  let members;
  let selectedmember;
  // let mySnackbar;
  let userAuth = false;
  const loadCombo = () => {
    resetSelection();
    axios.get(getUrl() + '/root/wp-json/combo/v1/combo?month=6').then((response) => {
      // termine = response.data;
      termine = JSON.parse(response.data);
    });
  };

  onMount(() => {
    userAuth = isUserAuth();
    if (!userAuth) {
      popupUserAuthModal = true;
      return;
    }
    popupSpinnerModal = true;
    loadCombo();
    axios.get(getUrl() + '/root/wp-json/combo/v2/combomembers', getAuthHeader()).then((response) => {
      members = JSON.parse(response.data);
      members = members.map((t) => ({ ...t, name: t.VName + ' ' + t.FName, value: t.ShortName }));
      console.log(members);
      popupSpinnerModal = false;
    });
  });

  let formatDate = (date) => {
    const options = {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    };
    return new Date(date).toLocaleDateString('de-DE', options).replace(/,/g, '');
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
      return oldEntry + ' ' + newEntry;
    }
    // remove newEntry
    return oldEntry
      .replace('*' + newEntry + '*', '')
      .replace(newEntry, '')
      .trim();
  };

  let handleSave = (event) => {
    // mySnackbar.open();
    let newEntries = [];
    Object.entries(combo).forEach(([key, values]) => {
      values.forEach((value) => {
        let data = value.split(',');
        let termin = {};
        termin.Termin = data[0];
        termin.key = key;
        termin.value = checkEntries(selectedmember, data[1]);
        newEntries.push(termin);
      });
    });
    let name = selectedmember;
    console.log(name, JSON.stringify(newEntries));

    axios.patch(getUrl() + '/root/wp-json/combo/v2/comboedit', newEntries, getAuthHeader()).then(
      (response) => {
        console.log('Success:', response);
        loadCombo();
        axios
          .get(
            // "https://www.evang9.wien/root/wp-json/combo/v1/comboemail?name=AE&date=1.1.2020&instrument=Git&inout=EIN"
            encodeURI(
              getUrl() + '/root/wp-json/combo/v2/comboemail?name=' + name + '&entries=' + JSON.stringify(newEntries)
            ),
            getAuthHeader()
          )
          .then((resp) => {
            console.log('Send Email', resp);
          });
      },
      (error) => {
        console.log('Error:', error);
      }
    );

    // reset selected member
    selectedmember = '';
  };
</script>

{#if userAuth && !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
      <h2 class="text-gray-900 dark:text-white font-bold mb-4">Comboplan Eintragung</h2>
      <div class="flex flex-row">
        <Select class="mb-4 mr-4" items={members} bind:value={selectedmember} placeholder="Bitte wähle Deinen Namen"
        ></Select>

        <GradientButton class="mb-4 mr-4" color="cyanToBlue" on:click={handleSave} disabled={!selectedmember}
          >Bestätigen</GradientButton
        >
        <InfoCircleOutline size="xl"></InfoCircleOutline><Tooltip placement="left"
          >Für eine Termineintragung den Namen und <br /> den Termin auswählen und bestätigen. <br />Zum Löschen den
          Termin nochmal auswählen <br />und bestätigen.</Tooltip
        >
      </div>

      <Table striped={true}>
        <TableHead>
          <TableHeadCell>Termin</TableHeadCell>
          <TableHeadCell>Tasten</TableHeadCell>
          <TableHeadCell>Melodie</TableHeadCell>
          <TableHeadCell>Drums</TableHeadCell>
          <TableHeadCell>Bass</TableHeadCell>
          <TableHeadCell>Git.</TableHeadCell>
          <TableHeadCell>Bemerkung</TableHeadCell>
        </TableHead>

        <TableBody>
          {#each termine as termin}
            <TableBodyRow>
              <TableBodyCell>
                <div class="flex flex-col place-items-center">
                  <Avatar size="md" src="{getUrl()}/comboapps/img/{getImage(termin.Verantwortlich)}" />
                  {formatDate(moment(termin.Termin).toDate())}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-row">
                  <Checkbox
                    disabled={!selectedmember}
                    bind:group={combo.Tasten}
                    value={termin.Termin + ',' + termin.Tasten}
                  />
                  {termin.Tasten}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-row">
                  <Checkbox
                    disabled={!selectedmember}
                    bind:group={combo.Melodie}
                    value={termin.Termin + ',' + termin.Melodie}
                  />
                  {termin.Melodie}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-row">
                  <Checkbox
                    disabled={!selectedmember}
                    bind:group={combo.Drums}
                    value={termin.Termin + ',' + termin.Drums}
                  />
                  {termin.Drums}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-row">
                  <Checkbox
                    disabled={!selectedmember}
                    bind:group={combo.Bass}
                    value={termin.Termin + ',' + termin.Bass}
                  />
                  {termin.Bass}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-row">
                  <Checkbox
                    disabled={!selectedmember}
                    bind:group={combo.Gitarre}
                    value={termin.Termin + ',' + termin.Gitarre}
                  />
                  {termin.Gitarre}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-col">
                  <div>{termin.Abendmahl == 1 ? 'Abendmahl' : ''}</div>
                  <div>{termin.Zusatzinfo}</div>
                </div>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Comboplan wird neu geladen." />
<LoginWarn {popupUserAuthModal} />
