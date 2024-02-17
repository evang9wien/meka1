<script>
  import { onMount } from 'svelte';
  import './leaflet.js';

  export let view;
  export let zoom;
  export let maxZoom;
  export let minZoom;
  export let marker;
  export let markerPopup;
  export let markerPath;

  var map;
  var mark;
  var attr;

  L.Icon.Default.prototype.options.imagePath = String(markerPath + '/');

  onMount(async () => {
    map = L.map('map').setView(view, zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: minZoom,
      maxZoom: maxZoom,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mark = L.marker(marker).addTo(map);
    mark.bindPopup(markerPopup);
  });
</script>

<div id="map" class="h-96 z-30"></div>

<style>
  @import './leaflet.css';
</style>
