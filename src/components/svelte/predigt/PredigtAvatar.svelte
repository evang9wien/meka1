<script>
  import stefan from '../../../assets/images/avatar/stefan-Avatar.png';
  import harald from '../../../assets/images/avatar/Harald-Geschl-Avatar.png';
  import mark from '../../../assets/images/avatar/Mark-Ruiz-Hellin-Avatar.png';
  import tanja from '../../../assets/images/avatar/Tanja-Avatar.png';
  import wolfgang from '../../../assets/images/avatar/Wolfgang-Avatar.png';

  import { Avatar } from 'flowbite-svelte';

  export let prediger;
  export let clazz;

  const getAvatar = () => {
    console.log(prediger);
    if (prediger == 'SFJ' || prediger == 'Stefan') return stefan.src;
    if (prediger == 'MRH' || prediger == 'Mark') return mark.src;
    if (prediger == 'TDH' || prediger == 'Tanja') return tanja.src;
    if (prediger == 'WW' || prediger == 'Wolfgang') return wolfgang.src;
    if (prediger == 'GH' || prediger == 'Harald') return harald.src;
  };
</script>

<Avatar size="md" class={clazz} src={getAvatar()} />
