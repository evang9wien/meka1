<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Button, GradientButton } from 'flowbite-svelte';
  import { Label, Input } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { Alert } from 'flowbite-svelte';
  import { InfoCircleSolid } from 'flowbite-svelte-icons';
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';

  export let auth;
  export let callback;
  export let popupSimpleLogin;

  let name = '';
  let password = '';

  let loginSucess = false;
  let loginError = false;

  let passwordResetMsg = '';

  const login = () => {
    console.log('Login');
    if (password == 'ma') {
      loginSucess = true;
      loginError = false;
      auth = true;
      popupSimpleLogin = false;
      callback();
    } else {
      loginSucess = false;
      loginError = true;
      auth = false;
    }
  };
</script>

<div class="flex justify-center">
  <Card class="mb-6">
    <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Login für Mitarbeiter</h5>
    <!-- <Title>Login</Title> -->
    {#if !loginSucess}
      {#if loginError}
        <Alert color="red">
          <InfoCircleSolid slot="icon" class="w-4 h-4" />
          <div class="font-medium">Login Fehler!</div>
          Passwort ist fehlerhaft.
        </Alert>
      {/if}

      <div class="mb-6">
        <Label for="default-input-p" class="block mb-2">Password</Label>
        <Input bind:value={password} id="default-input-p" type="password" placeholder="Password" />
      </div>
      <GradientButton class="mb-6" color="cyanToBlue" on:click={login}>Login</GradientButton>
      <!-- <div>
        <Button class="text-muted underline dark:text-slate-400 font-medium" on:click={resetPassword}
          >Passwort vergessen?</Button
        >
      </div> -->
    {:else}
      <Alert color="green">
        <InfoCircleSolid slot="icon" class="w-4 h-4" />
        <div class="font-medium">Login erfolgreich!</div>
        Die Seiten im geschützen Bereich können nun geöffnet werden.
      </Alert>
    {/if}
  </Card>
</div>
