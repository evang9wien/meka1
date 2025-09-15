<script>
  import { onMount } from 'svelte';

  import { Label, Input, Checkbox } from 'flowbite-svelte';
  import { A, Button } from 'flowbite-svelte';
  import { EnvelopeSolid } from 'flowbite-svelte-icons';
  import { Card } from 'flowbite-svelte';

  let registerSuccessful = false;
  let registerFailed = false;
  let optInChecked = false;
  let emailValue = '';
  let optInInput;
  let emailInput;
  let errorText = '';

  let url =
    'https://dd82935b.sibforms.com/serve/MUIFABI1M965SxHkTk2d4-VW43vzmmDkFdalvRQrqctYApKtF64YRbk0oTY-_eGs6c8K0QCmRUp9SnitxzKzjt_c1FNuAtqyNIdU1lxaxrRnEPMlZ_c4MB3iG4Q3z7EBYwAAVmNezVxlLR5mpYWaCJP6vSXPf4V3DUaEN1uuMj1DD7JVRmCkp7KCPjvq6LHO5OYKoDVav8ISILIj';
  let submitFrame;
  let submitFrameDocStatus = 0; // 0 = not loaded. 1 = srcdoc set, 2 = submitted

  onMount(async () => {
    emailInput = document.getElementById('EMAIL');
    optInInput = document.getElementById('OPT_IN');
    submitFrame = document.getElementById('submitFrame');
  });

  function CheckAndSubmit() {
    if (!EmailIsValid()) {
      errorText = 'Bitte geben Sie eine gültige E-Mail Addresse ein.';
      emailInput.focus();
      return;
    }

    if (!optInChecked) {
      errorText = 'Bitte bestätigen Sie die Datenschutzerklärung.';
      optInInput.focus();
      return;
    }

    errorText = '';
    SubmitForm();
  }

  function EmailIsValid() {
    return emailInput.validity.valid;
  }

  function SubmitForm() {
    let doc =
      '<!DOCTYPE html>' +
      '<html>' +
      '<head></head>' +
      '<body>' +
      "<form id='subForm' method='POST' action='" +
      url +
      "' >" +
      "<input id='EMAIL' name='EMAIL' type='text' value='" +
      emailValue +
      "' />" +
      "<input id='OPT_IN' name='OPT_IN' type='checkbox' value='1' checked/>" +
      "<input type='text' name='email_address_check' value='' />" +
      "<input type='hidden' name='locale' value='de' />" +
      "<input type='hidden' name='html_type' value='simple' />" +
      '</form>' +
      '</body>' +
      '</html>';

    submitFrameDocStatus = 1;
    submitFrame.srcdoc = doc;
    // expect the load event to invoke SubFrameLoaded
  }

  function SubFrameLoaded(event) {
    if (submitFrameDocStatus == 1) {
      // we updated srcdoc
      let subFrameDoc = submitFrame.contentDocument;
      let submitForm = subFrameDoc.getElementById('subForm');

      submitFrameDocStatus = 2;
      submitForm.submit();
    } else if (submitFrameDocStatus == 2) {
      // received response
      let subFrameDoc = submitFrame.contentDocument;
      if (subFrameDoc) {
        if (subFrameDoc.body) {
          if (subFrameDoc.body.children.length != 0) {
            registerFailed = true;
            return;
          }
        }
      }
      registerSuccessful = true;
    }
  }
</script>

<Card class="flex justify-center p-4" size="lg">
  {#if !registerSuccessful && !registerFailed}
    <div class="space-y-6">
      <div class="mb-6">
        <Label for="EMAIL" class="block mb-2">Bitte geben Sie Ihre E-Mail-Adresse ein, um sich anzumelden</Label>
        <Input id="EMAIL" type="email" name="EMAIL" placeholder="email" bind:value={emailValue} required>
          <EnvelopeSolid slot="left" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </Input>
      </div>

      <Checkbox
        class="mb-6 space-x-1 rtl:space-x-reverse"
        id="OPT_IN"
        name="OPT_IN"
        value="1"
        required
        bind:checked={optInChecked}
        >Ich möchte Ihren Newsletter erhalten und akzeptiere die Datenschutzerklärung</Checkbox
      >
      <div class="mb-6 text-sm text-red-800">{errorText}</div>

      <div class="flex flex-row mt-4 space-x-3 rtl:space-x-reverse lg:mt-6 text-xs">
        <div class="flex-1">
          <svg width="63" height="63" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 63">
            <path
              class="path1"
              d="M31.54 0l1.05 3.06 3.385-.01-2.735 1.897 1.05 3.042-2.748-1.886-2.738 1.886 1.044-3.05-2.745-1.897h3.393zm13.97 3.019L46.555 6.4l3.384.01-2.743 2.101 1.048 3.387-2.752-2.1-2.752 2.1 1.054-3.382-2.745-2.105h3.385zm9.998 10.056l1.039 3.382h3.38l-2.751 2.1 1.05 3.382-2.744-2.091-2.743 2.091 1.054-3.381-2.754-2.1h3.385zM58.58 27.1l1.04 3.372h3.379l-2.752 2.096 1.05 3.387-2.744-2.091-2.75 2.092 1.054-3.387-2.747-2.097h3.376zm-3.076 14.02l1.044 3.364h3.385l-2.743 2.09 1.05 3.392-2.744-2.097-2.743 2.097 1.052-3.377-2.752-2.117 3.385-.01zm-9.985 9.91l1.045 3.364h3.393l-2.752 2.09 1.05 3.393-2.745-2.097-2.743 2.097 1.05-3.383-2.751-2.1 3.384-.01zM31.45 55.01l1.044 3.043 3.393-.008-2.752 1.9L34.19 63l-2.744-1.895-2.748 1.891 1.054-3.05-2.743-1.9h3.384zm-13.934-3.98l1.036 3.364h3.402l-2.752 2.09 1.053 3.393-2.747-2.097-2.752 2.097 1.053-3.382-2.743-2.1 3.384-.01zm-9.981-9.91l1.045 3.364h3.398l-2.748 2.09 1.05 3.392-2.753-2.1-2.752 2.096 1.053-3.382-2.743-2.102 3.384-.009zM4.466 27.1l1.038 3.372H8.88l-2.752 2.097 1.053 3.387-2.743-2.09-2.748 2.09 1.053-3.387L0 30.472h3.385zm3.069-14.025l1.045 3.382h3.395L9.23 18.56l1.05 3.381-2.752-2.09-2.752 2.09 1.053-3.381-2.744-2.1h3.384zm9.99-10.056L18.57 6.4l3.393.01-2.743 2.1 1.05 3.373-2.754-2.092-2.751 2.092 1.053-3.382-2.744-2.1h3.384zm24.938 19.394l-10-4.22a2.48 2.48 0 00-1.921 0l-10 4.22A2.529 2.529 0 0019 24.75c0 10.47 5.964 17.705 11.537 20.057a2.48 2.48 0 001.921 0C36.921 42.924 44 36.421 44 24.75a2.532 2.532 0 00-1.537-2.336zm-2.46 6.023l-9.583 9.705a.83.83 0 01-1.177 0l-5.416-5.485a.855.855 0 010-1.192l1.177-1.192a.83.83 0 011.177 0l3.65 3.697 7.819-7.916a.83.83 0 011.177 0l1.177 1.191a.843.843 0 010 1.192z"
              fill="#0092FF"
            ></path>
          </svg>
        </div>
        <div class="flex-auto">
          Für den Versand unserer Newsletter nutzen wir Brevo. Mit Ihrer Anmeldung stimmen Sie zu, dass die eingegebenen
          Daten an Brevo übermittelt werden. Beachten Sie bitte auch die <A
            class="text-muted dark:text-slate-400 underline font-medium"
            href="https://www.brevo.com/de/legal/termsofuse/">Datenschutzbestimmungen.</A
          >
        </div>
      </div>

      <div class="mb-6">
        <Button color="light" onclick={CheckAndSubmit}>Anmelden</Button>
      </div>
      <div class="mb-6 text-xs">
        <p>
          Nach erfolgreichem Absenden erhalten Sie eine E-Mail and die oben angegeben Adresse.<br />
          Bitte klicken Sie den Link in dieser E-Mail damit die Anmeldung zum Newsletter abgeschlossen werden kann.
        </p>
      </div>
      <input type="text" name="email_address_check" value="" class="hidden" />
      <input type="hidden" name="locale" value="de" />
    </div>
    <div id="formDiv" class="hidden">
      <iframe
        id="submitFrame"
        src="about:blank"
        title="submitFrame"
        on:load={SubFrameLoaded}
        allow="fullscreen 'none'"
      />
    </div>
  {/if}
  {#if registerSuccessful}
    <h3>Vielen Dank für Ihre Anmeldung</h3>
    <p>
      Sie erhalten in Kürze eine E-Mail zur Bestätigung Ihrer E-Mail Adresse.<br />
      Bitte klicken Sie den Link in dieser E-Mail damit die Anmeldung zum Newsletter abgeschlossen werden kann.
    </p>
    <p class="text-xs">Die E-Mail hat den Absender 'pfarrer@5682290.brevosend.com'</p>
  {/if}
  {#if registerFailed}
    <h3>Leider ist bei der Anmeldung ein Problem aufgetreten</h3>
    <p>Bitte versuchen Sie die Anmeldung später nocheinmal. Vielen Dank.</p>
  {/if}
</Card>
