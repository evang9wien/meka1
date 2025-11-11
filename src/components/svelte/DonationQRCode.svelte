<script>
  import { onMount } from 'svelte';
  import QRCode from 'qrcode';

  let qrCodeDataUrl = '';
  let loading = true;

  onMount(async () => {
    // SEPA-Überweisung QR-Code Daten (EPC QR-Code Format)
    const sepaData = `BCD
001
1
SCT
RLNWATWWXXX
Evangelisches Pfarramt A.B.
AT463200000007477664



Spende für die Messiaskapelle`;

    try {
      qrCodeDataUrl = await QRCode.toDataURL(sepaData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      loading = false;
    } catch (error) {
      console.error('QR-Code Fehler:', error);
      loading = false;
    }
  });
</script>

<span class="flex flex-col items-center gap-4">
  {#if loading}
    <div class="text-sm text-gray-500">QR-Code wird generiert...</div>
  {:else if qrCodeDataUrl}
    <img src={qrCodeDataUrl} alt="SEPA QR-Code für Spendenkonto" class="border border-gray-300 rounded" />
    <p class="text-xs text-gray-600 text-center">SEPA-Überweisung mit QR-Code</p>
  {:else}
    <p class="text-sm text-gray-500">QR-Code konnte nicht generiert werden.</p>
  {/if}
</span>

<style>
  img {
    max-width: 200px;
    height: auto;
  }
</style>
