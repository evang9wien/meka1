<script>
    import { onMount } from "svelte";
    import axios from "axios";
    onMount(() => {

      const token = localStorage.getItem("jwt");
      if(token) {
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
      };
    });
  
    
  </script>

  <div>Test</div>