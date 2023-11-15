<script>
    import { onMount } from "svelte";
    import axios from "axios";
    onMount(() => {

      const token = localStorage.getItem("jwt");
      if(token) {
        const authConfig = {
          headers: {
              Authorization: "Bearer " + token,
              responseType: 'blob',
          }
        }

        let anchor = document.createElement("a");
        document.body.appendChild(anchor);
        let file = 'https://www.evang9.wien/root/wp-json/combo/v2/combolied/herr_in_deinem_namen?lied=herr_in_deinem_namen&type=pdf';

        let headers = new Headers();
        headers.append('Authorization', 'Bearer ' + token);

        fetch(file, { headers })
            .then(response => response.blob())
            .then(blobby => {
                console.log("Resp Test:", blobby);
                let objectUrl = window.URL.createObjectURL(blobby);

                // window.open(objectUrl, '_blank');
                // anchor.href = objectUrl;
                // anchor.download = 'some-file.pdf';
                // anchor.click();

                window.URL.revokeObjectURL(objectUrl);
        });

        /*
        console.log("Test");
        axios
        .get("https://www.evang9.wien/root/wp-json/combo/v2/combolied/herr_in_deinem_namen?lied=herr_in_deinem_namen&type=pdf",authConfig)  
        .then(response => {
          console.log("Resp Test:", response);
          let file = new Blob([response.data], {type: 'application/pdf'});
          let fileURL = URL.createObjectURL(file);
          // let fileURL = URL.createObjectURL(response.data);
          window.open(fileURL, '_blank');
          // window.open("data:application/pdf," + encodeURI(response.data)); 
          //let pdfWindow = window.open("")
          //pdfWindow.document.write(
          //  "<iframe width='100%' height='100%' src='data:application/pdf;base64, " +
          //encodeURI(response.data) + "'></iframe>"
          // var byteCharacters = response.data;
          // var byteNumbers = new Array(byteCharacters.length);
          // for (var i = 0; i < byteCharacters.length; i++) {
          //   byteNumbers[i] = byteCharacters.charCodeAt(i);
          // }
          // var byteArray = new Uint8Array(byteNumbers);
          // var file = new Blob([byteArray], { type: 'application/pdf;base64' });
          // var fileURL = URL.createObjectURL(file);
          // window.open(fileURL);

        });    
        */
      };
    });
  
    
  </script>

  <div>Test</div>