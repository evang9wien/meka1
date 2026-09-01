<script lang="ts">
  import { Modal, Button } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import LoginSimple from './LoginSimple.svelte';

  export let popupSimpleLogin: boolean;
  export let auth: boolean;
  export let callback: () => void;
</script>

<Modal bind:open={popupSimpleLogin} size="xs">
  <div class="text-center">
    <ExclamationCircleOutline class="mx-auto mb-4 text-[#93b3e0] w-12 h-12 dark:text-[#bcd0ed]" />
    <h3 class="mb-5 text-lg font-normal text-[#3a61a0] dark:text-[#93b3e0]">
      Bitte erst in den Mitarbeiterbereich einloggen.
    </h3>
  </div>
  <LoginSimple {auth} {callback} {popupSimpleLogin} />
</Modal>
