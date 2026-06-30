<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Button, GradientButton } from 'flowbite-svelte';
  import { Label, Input } from 'flowbite-svelte';
  import { Alert } from 'flowbite-svelte';
  import { InfoCircleSolid } from 'flowbite-svelte-icons';
  import { initAppCheck } from "./../firebase/firebase.js";
  
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';

  export let auth = null;
  export let loginReload = true;

  let name = '';
  let password = '';

  let loginSucess = false;
  let loginError = false;

  let passwordResetMsg = '';
  const resetPassword = () => {
    if (!name) {
      passwordResetMsg = 'Bitte eine Email Adresse angeben.';
      return;
    }
    sendPasswordResetEmail(auth, name)
      .then(() => {
        passwordResetMsg = `Es wurde erfolgreich eine Email an ${name} verschickt.`;
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        passwordResetMsg = `Beim Versenden der Email ist ein Fehler aufgetreten: ${errorMessage} (${errorCode})`;
        // ..
      });
  };

  const login = () => {
    console.log('Login');
    if (auth == null) {
      const app = initAppCheck();
      auth = getAuth(app);
    }
    signInWithEmailAndPassword(auth, name, password)
      .then((userCredential) => {
        // Signed in
        loginSucess = true;
        loginError = false;
        if (loginReload) {
          window.location.reload();
        }
        // ...
      })
      .catch((error) => {
        loginSucess = false;
        loginError = true;
      });
  };
</script>

<div class="p-6">
  {#if !loginSucess}
    {#if loginError}
      <Alert color="red" class="mb-4">
        <InfoCircleSolid slot="icon" class="w-4 h-4" />
        <div class="font-medium">Login Fehler!</div>
        E-Mail oder Passwort ist fehlerhaft.
      </Alert>
    {/if}
    <div class="mb-3">
      <Label for="login-email" class="block mb-1 text-sm">E-Mail</Label>
      <Input bind:value={name} id="login-email" placeholder="name@evang9.wien" type="email" />
    </div>
    <div class="mb-4">
      <Label for="login-pw" class="block mb-1 text-sm">Passwort</Label>
      <Input bind:value={password} id="login-pw" type="password" placeholder="Passwort" />
    </div>
    <GradientButton class="w-full mb-3" color="cyanToBlue" onclick={login}>Anmelden</GradientButton>
    <div class="text-center">
      <Button color="light" size="xs" class="text-xs text-gray-500 dark:text-gray-400 underline" onclick={resetPassword}>
        Passwort vergessen?
      </Button>
    </div>
    {#if passwordResetMsg}
      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">{passwordResetMsg}</p>
    {/if}
  {:else}
    <Alert color="green">
      <InfoCircleSolid slot="icon" class="w-4 h-4" />
      <div class="font-medium">Login erfolgreich!</div>
      Die Seiten im geschützen Bereich können nun geöffnet werden.
    </Alert>
  {/if}
</div>
