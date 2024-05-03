<script>
  import stefan from '../../../assets/images/avatar/stefan-Avatar.png';
  import harald from '../../../assets/images/avatar/Harald-Geschl-Avatar.png';
  import mark from '../../../assets/images/avatar/Mark-Ruiz-Hellin-Avatar.png';
  import tanja from '../../../assets/images/avatar/Tanja-Avatar.png';
  import wolfgang from '../../../assets/images/avatar/Wolfgang-Avatar.png';

  import { Avatar } from 'flowbite-svelte';

  export let prediger;

  const getAvatar = () => {
    console.log(prediger);
    if (prediger == 'SFJ') return stefan.src;
    if (prediger == 'MRH') return mark.src;
    if (prediger == 'TDH') return tanja.src;
    if (prediger == 'WW') return wolfgang.src;
    if (prediger == 'GH') return harald.src;
  };
</script>

<Avatar size="md" src={getAvatar()} />
