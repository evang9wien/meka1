<script>
    import { onMount } from "svelte";
    import axios from "axios";
    import Button, { Label } from "@smui/button";
    import Textfield from '@smui/textfield';
    import Icon from '@smui/textfield/icon';
    import HelperText from '@smui/textfield/helper-text';

    let name='';
    let password='';

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
            console.log("Resp Token:", response);
            console.log(token);
            localStorage.setItem("jwt", token);
            
            const authConfig = {
              headers: {
                  Authorization: "Bearer " + token
              }
            }

            axios
            .get("https://www.evang9.wien/root/wp-json/combo/v2/combohello",authConfig)  
            .then(response => {
              console.log("Resp Hello:", response);
            });          

        });

    };
  
    
  </script>
  <center>
    <div>Login</div>
    <Textfield bind:value={name} label="Name">
      
      <HelperText slot="helper">Name</HelperText>
    </Textfield>
    <Textfield
       type="password"
       bind:value={password} 
       label="Password">
      
      <HelperText slot="helper">Password</HelperText>
    </Textfield>
    <Button on:click={login}>
      <Label>Login</Label>
      </Button>

  </center>