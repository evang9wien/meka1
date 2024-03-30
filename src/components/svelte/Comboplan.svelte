<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import moment from 'moment';
  import { getImageAvatar, getLongName } from './predigt/PredigtConstants.js';

  import { Label, Select, Input, InputAddon, Helper, GradientButton } from 'flowbite-svelte';
  import { Button, ButtonGroup } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { MicrophoneOutline, EditOutline, FileMusicOutline, PlaySolid, PauseSolid } from 'flowbite-svelte-icons';
  import { Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';
  import WaitPopup from './popup/WaitPopup.svelte';
  import { Avatar, Dropdown, DropdownHeader, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-svelte';
  import { getUrl } from './url/url.js';

  let termine;
  let popupSpinnerModal = true;
  onMount(() => {
    popupSpinnerModal = true;
    axios.get(getUrl() + '/root/wp-json/combo/v1/combo?month=3').then((response) => {
      termine = JSON.parse(response.data);
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
</script>

{#if !popupSpinnerModal}
  <div class="flex justify-center mb-6">
    <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
      <h2 class="text-gray-900 dark:text-white font-bold mb-4">Comboplan</h2>
      <Table striped={true}>
        <TableHead>
          <TableHeadCell>Termin</TableHeadCell>
          <TableHeadCell>Bemerkung</TableHeadCell>
          <TableHeadCell>Tasten</TableHeadCell>
          <TableHeadCell>Melodie</TableHeadCell>
          <TableHeadCell>Drums</TableHeadCell>
          <TableHeadCell>Bass</TableHeadCell>
          <TableHeadCell>Git.</TableHeadCell>
        </TableHead>
        <TableBody>
          {#each termine as termin}
            <TableBodyRow>
              <TableBodyCell>
                <div class="flex flex-col place-items-center">
                  <Avatar size="md" src="{getUrl()}/comboapps/img/{getImageAvatar(termin.Verantwortlich)}" />
                  <Tooltip>{getLongName(termin.Verantwortlich)}</Tooltip>
                  {formatDate(moment(termin.Termin).toDate())}
                </div>
              </TableBodyCell>
              <TableBodyCell>
                <div class="flex flex-col">
                  <div>{termin.Abendmahl == 1 ? 'Abendmahl' : ''}</div>
                  <div>{termin.Zusatzinfo}</div>
                </div>
              </TableBodyCell>
              <TableBodyCell>{termin.Tasten}</TableBodyCell>
              <TableBodyCell>{termin.Melodie}</TableBodyCell>
              <TableBodyCell>{termin.Drums}</TableBodyCell>
              <TableBodyCell>{termin.Bass}</TableBodyCell>
              <TableBodyCell>{termin.Gitarre}</TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    </Card>
  </div>
{/if}
<WaitPopup {popupSpinnerModal} message="Comboplan wird geladen." />
