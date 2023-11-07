<script>
    import { onMount } from "svelte";
    import axios from "axios";
    onMount(() => {
      axios
        .post("https://www.evang9.wien/root/wp-json/jwt-auth/v1/token",
        {
        username: 'eidmanna',
        password: ''
        })
        .then(response => {
            const token = response.data.token;
            console.log("Resp Token:", response);
            console.log(token);
            
            const authConfig = {
              headers: {
                  Authorization: "Bearer " + token
              }
            }

            axios
            .get("https://www.evang9.wien/root/wp-json/combo/v1/combohello")  
            .then(response => {
              console.log("Resp Hello:", response);
            });

            axios
            .get("https://www.evang9.wien/root/wp-json/wp/v2/users/me", authConfig)  
            .then(response => {
              console.log("User:", response);
            });

        });

      


    });
  
    
  </script>

  <div>Test</div>