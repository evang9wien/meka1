<script>
  import { Modal, Button } from 'flowbite-svelte';
  import { ExclamationCircleOutline } from 'flowbite-svelte-icons';
  import LoginFire from './LoginFire.svelte';

  export let popupFireBaseLogin;
  export let auth;
</script>

<Modal bind:open={popupFireBaseLogin} size="xs">
  <div class="text-center">
    <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" />
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
      Bitte erst in den Mitarbeiterbereich einloggen.
    </h3>
  </div>
  <LoginFire {auth} />
</Modal>
