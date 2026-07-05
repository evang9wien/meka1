<script lang="ts">
  import { onMount } from 'svelte';
  import "leaflet/dist/leaflet.css";
  import L from 'leaflet';
  import type { Map as LeafletMap, Marker } from 'leaflet';

  export let view: [number, number];
  export let zoom: number;
  export let maxZoom: number;
  export let minZoom: number;
  export let marker: [number, number];
  export let markerPopup: string;
  export let markerPath: string;

  let map: LeafletMap;
  let mark: Marker;

  L.Icon.Default.prototype.options.imagePath = String(markerPath);

  onMount(async () => {
    map = L.map('map', {
      dragging: !L.Browser.mobile,
      tap: !L.Browser.mobile,
      scrollWheelZoom: false,
    }).setView(view, zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: minZoom,
      maxZoom: maxZoom,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mark = L.marker(marker).addTo(map);
    mark.bindPopup(markerPopup);
  });
</script>

<div id="map" class="h-100 z-30"></div>

<style>  
</style>
