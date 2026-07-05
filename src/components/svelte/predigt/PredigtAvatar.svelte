<script>
  // Statische Fallback-Imports (werden verwendet wenn Firebase-URL noch nicht geladen)
  import stefan      from '../../../assets/images/avatar/stefan-Avatar.png';
  import harald      from '../../../assets/images/avatar/Harald-Geschl-Avatar.png';
  import mark        from '../../../assets/images/avatar/Mark-Ruiz-Hellin-Avatar.png';
  import tanja       from '../../../assets/images/avatar/Tanja-Avatar.png';
  import wolfgang    from '../../../assets/images/avatar/Wolfgang-Avatar.png';
  import mekaclassic from '../../../assets/images/avatar/meka-classic.png';
  import musik       from '../../../assets/images/avatar/musik.png';

  import { Avatar } from 'flowbite-svelte';
  import { predigerList } from '../stores/predigerStore.js';

  export let prediger = '';
  export let clazz = '';
  export let title = '';

  // Statische Fallback-Map (Kürzel + Vornamen → lokales Bild)
  const staticFallback = {
    SFJ: stefan.src,     Stefan:   stefan.src,
    GH:  harald.src,     Harald:   harald.src,
    MRH: mark.src,       Mark:     mark.src,
    TDH: tanja.src,      Tanja:    tanja.src,
    WW:  wolfgang.src,   Wolfgang: wolfgang.src,
    COM: musik.src,
  };

  function getAvatar(list) {
    // Sondertitel (Comboprobe, MEKA-Classic)
    if (title?.toLowerCase().includes('comboprobe'))  return musik.src;
    if (title?.toLowerCase().includes('meka classic')) return mekaclassic.src;

    // Firebase-Store: avatarUrl vorhanden?
    if (list && prediger) {
      const entry = list.find((p) => p.kuerzel === prediger || p.vorname === prediger);
      if (entry?.avatarUrl) return entry.avatarUrl;
    }

    // Statischer Fallback
    return staticFallback[prediger] ?? '';
  }
</script>

<Avatar size="md" class="object-cover {clazz}" src={getAvatar($predigerList)} />
