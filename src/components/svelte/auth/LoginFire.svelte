<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { GradientButton } from 'flowbite-svelte';
  import { Label, Input } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
  import { Alert } from 'flowbite-svelte';
  import { InfoCircleSolid } from 'flowbite-svelte-icons';
  import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

  export let auth;

  let name = '';
  let password = '';

  let loginSucess = false;

  let loginError = false;

  const login = () => {
    console.log('Login');
    signInWithEmailAndPassword(auth, name, password);
    loginSucess = true;
    loginError = false;
  };
</script>

<div class="flex justify-center">
  <Card class="mb-6">
    <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Firebase Login für Mitarbeiter</h5>
    <!-- <Title>Login</Title> -->
    {#if !loginSucess}
      {#if loginError}
        <Alert color="red">
          <InfoCircleSolid slot="icon" class="w-4 h-4" />
          <div class="font-medium">Login Fehler!</div>
          Benutzername oder Passwort ist fehlerhaft.
        </Alert>
      {/if}
      <div class="mb-6">
        <Label for="default-input-n" class="block mb-2">Name</Label>
        <Input bind:value={name} id="default-input-n" placeholder="Name" />
      </div>
      <div class="mb-6">
        <Label for="default-input-p" class="block mb-2">Password</Label>
        <Input bind:value={password} id="default-input-p" type="password" placeholder="Password" />
      </div>
      <GradientButton class="mb-6" color="cyanToBlue" on:click={login}>Login</GradientButton>
      <div>
        <a
          class="text-muted underline dark:text-slate-400 font-medium"
          href="https://www.evang9.wien/root/wp-login.php?action=lostpassword">Passwort vergessen?</a
        >
      </div>
    {:else}
      <Alert color="green">
        <InfoCircleSolid slot="icon" class="w-4 h-4" />
        <div class="font-medium">Login erfolgreich!</div>
        Die Seiten im geschützen Bereich können nun geöffnet werden.
      </Alert>
    {/if}
  </Card>
</div>
