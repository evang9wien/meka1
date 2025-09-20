<script>
  import { onMount } from 'svelte';
  import { getAuth, signOut } from 'firebase/auth';
  import { initAppCheck } from "../firebase/firebase.js";  
  import { Alert } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';

  

  let result = '';
  onMount(async () => {
    const app = initAppCheck();
    const auth = getAuth(app);
    signOut(auth)
      .then(() => {
        // Sign-out successful.
        result = 'Logout erfolgreich';
      })
      .catch((error) => {
        // An error happened.
        result = error;
      });
  });
</script>

<div class="flex justify-center mb-6">
  <Card class="lg:max-w-screen-lg md:max-w-screen-md xs:max-w-screen-xs sm:max-w-screen-sm">
    <Alert color="green">
      <span class="font-medium">Logout!</span>
      <div>{result}</div>
    </Alert>
  </Card>
</div>
