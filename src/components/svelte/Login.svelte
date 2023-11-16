<script>
  import { onMount } from 'svelte';
  import axios from 'axios';
  import { GradientButton } from 'flowbite-svelte';
  import { Label, Input } from 'flowbite-svelte';
  import { Card } from 'flowbite-svelte';

  let name = '';
  let password = '';

  let loginSucess = false;

  const login = () => {
    console.log('Login');
    axios
      .post('https://www.evang9.wien/root/wp-json/jwt-auth/v1/token', {
        username: name,
        password: password,
      })
      .then((response) => {
        const token = response.data.token;
        localStorage.setItem('jwt', token);
        loginSucess = true;
      });
  };
</script>

<div class="flex justify-center">
  <Card class="mb-6">
    <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Login für Mitarbeiter</h5>
    <!-- <Title>Login</Title> -->
    {#if !loginSucess}
      <div class="mb-6">
        <Label for="default-input-n" class="block mb-2">Name</Label>
        <Input bind:value={name} id="default-input-n" placeholder="Name" />
      </div>
      <div class="mb-6">
        <Label for="default-input-p" class="block mb-2">Password</Label>
        <Input bind:value={password} id="default-input-p" type="password" placeholder="Password" />
      </div>
      <GradientButton class="mb-6" color="cyanToBlue" on:click={login}>Login</GradientButton>
    {:else}
      Login erfolgreich
    {/if}
  </Card>
</div>
