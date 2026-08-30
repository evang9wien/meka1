<script>
  import { Avatar, Tooltip } from 'flowbite-svelte';
  import { predigerList } from '../stores/predigerStore.ts';
  import { resolveLocalAvatarSrc } from './PredigtConstants.js';

  export let prediger = '';
  export let clazz = '';
  export let title = '';

  const musikSrc       = resolveLocalAvatarSrc('musik.png')       ?? '';
  const mekaclassicSrc = resolveLocalAvatarSrc('meka-classic.png') ?? '';
  const kreuzSrc       = resolveLocalAvatarSrc('kreuz-bunt.svg')   ?? '';

  function getAvatar(list, p, t) {
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
    // GD (Gottesdienst ohne bekannten Prediger)
    if (p === 'GD')  return kreuzSrc;

    return '';
  }

  function getLongName(list, p) {
    if (!p) return '';
    if (list) {
      const entry = list.find((e) => e.kuerzel === p || e.vorname === p);
      if (entry?.langname) return entry.langname;
    }
    return '';
  }

  $: avatarSrc = getAvatar($predigerList, prediger, title);
  $: longName  = getLongName($predigerList, prediger);
</script>

<Avatar size="md" class="object-cover {clazz}" src={avatarSrc} />
{#if longName}
  <Tooltip>{longName}</Tooltip>
{/if}
