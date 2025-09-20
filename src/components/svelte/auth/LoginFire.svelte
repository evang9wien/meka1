<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { Button, GradientButton } from 'flowbite-svelte';
  import { Label, Input } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';
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

<div class="flex justify-center">
  <Card class="mb-6">
    <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Login für Mitarbeiter</h5>
    <!-- <Title>Login</Title> -->
    {#if !loginSucess}
      {#if loginError}
        <Alert color="red">
          <InfoCircleSolid slot="icon" class="w-4 h-4" />
          <div class="font-medium">Login Fehler!</div>
          E-Mail oder Passwort ist fehlerhaft.
        </Alert>
      {/if}
      <div class="mb-6">
        <Label for="default-input-n" class="block mb-2">E-Mail</Label>
        <Input bind:value={name} id="default-input-n" placeholder="E-Mail" />
      </div>
      <div class="mb-6">
        <Label for="default-input-p" class="block mb-2">Password</Label>
        <Input bind:value={password} id="default-input-p" type="password" placeholder="Password" />
      </div>
      <GradientButton class="mb-6" color="cyanToBlue" onclick={login}>Login</GradientButton>
      <div>
        <Button class="text-muted underline dark:text-slate-400 font-medium" onclick={resetPassword}
          >Passwort vergessen?</Button
        >
      </div>
      <div>
        {passwordResetMsg}
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
