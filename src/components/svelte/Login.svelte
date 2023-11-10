<script>
    import { onMount } from "svelte";
    import axios from "axios";
    import Button, { Label } from "@smui/button";
    import Paper, { Title } from "@smui/paper";
    import Textfield from '@smui/textfield';
    import Icon from '@smui/textfield/icon';
    import HelperText from '@smui/textfield/helper-text';

    let name='';
    let password='';

    let loginSucess = false;

    const login = () => {
      console.log('Login');
      axios
        .post("https://www.evang9.wien/root/wp-json/jwt-auth/v1/token",
        {
        username: name,
        password: password
        })
        .then(response => {
            const token = response.data.token;            
            localStorage.setItem("jwt", token);
            loginSucess = true;

        });

   };
  
    
  </script>
  <center>    
    <Paper>
      <Title>Login</Title>
      {#if !loginSucess}      
        <Textfield bind:value={name} label="Name">                
        </Textfield>
        <br/>
        <Textfield
          type="password"
          bind:value={password} 
          label="Password">
        </Textfield>
        <br/>
        <Button on:click={login}>
          <Label>Login</Label>
        </Button>
      {:else}
        Login erfolgreich  
      {/if}
    </Paper>
  </center>