<script lang="ts">
  import { Avatar, Tooltip } from 'flowbite-svelte';
  import { predigerList, type PredigerEntry } from '../stores/predigerStore.ts';
  import { resolveLocalAvatarSrc } from './PredigtConstants.ts';

  export let prediger: string = '';
  export let clazz: string = '';
  export let title: string = '';

  const musikSrc       = resolveLocalAvatarSrc('musik.png')       ?? '';
  const mekaclassicSrc = resolveLocalAvatarSrc('meka-classic.png') ?? '';
  const kreuzSrc       = resolveLocalAvatarSrc('kreuz-bunt.svg')   ?? '';

  function getAvatar(list: PredigerEntry[] | null, p: string, t: string): string {
    // Sondertitel (Comboprobe, MEKA-Classic)
    if (t?.toLowerCase().includes('comboprobe'))   return musikSrc;
    if (t?.toLowerCase().includes('meka classic')) return mekaclassicSrc;

    if (list && p) {
      const entry = list.find((e) => e.kuerzel === p || e.vorname === p);
      if (entry) {
        // localImage: Dateiname → lokales Bild aus /assets/images/avatar/
        if (entry.localImage) {
          const local = resolveLocalAvatarSrc(entry.localImage);
          if (local) return local;
        }
        // avatarUrl: Firebase Storage URL
        if (entry.avatarUrl) return entry.avatarUrl;
      }
    }

    // COM (Comboprobe ohne title-Hint)
    if (p === 'COM') return musikSrc;
    // GD (Gottesdienst ohne bekannten Prediger) — or default fallback
    if (p === 'GD')  return kreuzSrc;

    return kreuzSrc;
  }

  function getLongName(list: PredigerEntry[] | null, p: string): string {
    if (!p) return '';
    if (list) {
      const entry = list.find((e) => e.kuerzel === p || e.vorname === p);
      if (entry?.langname) return entry.langname;
    }
    return '';
  }

  $: avatarSrc = getAvatar($predigerList, prediger, title);
  $: longName  = getLongName($predigerList, prediger);
  // Local assets (kreuz, musik, meka-classic) need a plain <img> — flowbite Avatar
  // shows a grey placeholder instead of rendering them correctly in the circle.
  $: isLocalAsset = avatarSrc === kreuzSrc || avatarSrc === musikSrc || avatarSrc === mekaclassicSrc;
</script>

{#if isLocalAsset}
  <span class="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 ring-2 ring-gray-200 dark:ring-gray-600 {clazz || 'w-10 h-10'}">
    <img src={avatarSrc} alt={prediger} class="w-3/4 h-3/4 object-contain" />
  </span>
{:else}
  <Avatar size="md" class="object-cover {clazz}" src={avatarSrc} />
{/if}
{#if longName}
  <Tooltip>{longName}</Tooltip>
{/if}
