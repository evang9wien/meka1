<script>
  import { Modal, Button } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import Login from './Login.svelte';

  export let popupUserAuthModal;
</script>

<Modal bind:open={popupUserAuthModal} size="xs" autoclose>
  <div class="text-center">
    <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" />
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">Bitte erst einloggen.</h3>
  </div>
  <Login />
</Modal>
