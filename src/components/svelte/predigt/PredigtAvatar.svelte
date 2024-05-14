<script>
  import stefan from '../../../assets/images/avatar/stefan-Avatar.png';
  import harald from '../../../assets/images/avatar/Harald-Geschl-Avatar.png';
  import mark from '../../../assets/images/avatar/Mark-Ruiz-Hellin-Avatar.png';
  import tanja from '../../../assets/images/avatar/Tanja-Avatar.png';
  import wolfgang from '../../../assets/images/avatar/Wolfgang-Avatar.png';
  import mekaclassic from '../../../assets/images/avatar/Mekaclassic.webp';
  import musik from '../../../assets/images/avatar/musik.png';

  import { Avatar } from 'flowbite-svelte';
  import { TicketOutline } from 'flowbite-svelte-icons';

  export let prediger;
  export let clazz = '';
  export let title = '';

  const getAvatar = () => {
    if (title && title.toLowerCase().includes('meka classic')) return mekaclassic.src;
    console.log(prediger);
    if (prediger == 'SFJ' || prediger == 'Stefan') return stefan.src;
    if (prediger == 'MRH' || prediger == 'Mark') return mark.src;
    if (prediger == 'TDH' || prediger == 'Tanja') return tanja.src;
    if (prediger == 'WW' || prediger == 'Wolfgang') return wolfgang.src;
    if (prediger == 'GH' || prediger == 'Harald') return harald.src;
    if (prediger == 'COM') return musik.src;
  };
</script>

<Avatar size="md" class={clazz} src={getAvatar()} />
