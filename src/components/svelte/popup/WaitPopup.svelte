<script>
  import { Modal, Button } from 'flowbite-svelte';
  import { Spinner } from 'flowbite-svelte';
  export let popupSpinnerModal = false;
  export let message = '';
</script>

<Modal bind:open={popupSpinnerModal} size="sm" autoclose>
  <div class="text-left">
    <!-- <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" /> -->
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">Bitte warten ...</h3>
    <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
      <Spinner color="purple" size={8} />&nbsp;{message}
    </h3>
  </div>
</Modal>
