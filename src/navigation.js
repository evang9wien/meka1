import { getPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Über uns',
      links: [
        {
          text: 'Leitbild',
          href: getPermalink('#leitbild'),
        },
        {
          text: 'Unser Pfarrer',
          href: getPermalink('#pfarrer'),
        },
        {
          text: 'Das Presbyterium',
          href: getPermalink('#presbyterium'),
        },
        {
          text: 'Lektor_innen',
          href: getPermalink('#lektoren'),
        },
        {
          text: 'Bilder aus der Messiaskapelle',
          href: getPermalink('/mekabilderpage'),
        },
      ],
    },
    {
      text: 'Gottesdienste',
      links: [
        {
          text: 'Sonntags um 10',
          href: getPermalink('/gottesdienste'),
        },
        {
          text: 'Sontags um 19 Uhr: OASE',
          href: getPermalink('/gottesdienste#oase'),
        },
        {
          text: 'Termine',
          href: getPermalink('/gottesdienste#termine'),
        },
        {
          text: 'Zum Nachhören',
          href: getPermalink('/nachhoeren'),
        },
      ],
    },
    {
      text: 'Angebote',

      links: [
        {
          text: 'NEU IN DER GEMEINDE? WILLKOMMEN!',
          href: getPermalink('/angebote#neuindergemeinde'),
        },
        {
          text: 'Pfarrer2Go',
          href: getPermalink('/angebote#pfarrer2go'),
        },
        {
          text: 'Kirche Kunterbunt',
          href: getPermalink('/angebote#kirchekunterbunt'),
        },
        {
          text: 'Meka Classic',
          href: getPermalink('/angebote#mekaclassic'),
        },
        {
          text: 'Grätzloase in der Seegasse',
          href: getPermalink('/angebote#graetzloase'),
        },
      ],
    },

    {
      text: 'Kirche',
      href: '#',
      links: [
        {
          text: 'Taufe',
          href: getPermalink('/kirche#taufe'),
        },
        {
          text: 'Konfirmation',
          href: getPermalink('/kirche#konfirmation'),
        },
        {
          text: 'Hochzeit',
          href: getPermalink('/kirche#hochzeit'),
        },
        {
          text: 'Eintritt',
          href: getPermalink('/kirche#eintritt'),
        },
        {
          text: 'Gemeindewechsel',
          href: getPermalink('/kirche#gemeindewechsel'),
        },
        {
          text: 'Todesfall',
          href: getPermalink('/kirche#todesfall'),
        },
      ],
    },
    {
      text: 'Mitarbeiten',
      href: getPermalink('/termine'),
      links: [
        {
          text: 'Mitarbeiten',
          href: getPermalink('/mitarbeiten'),
        },
        {
          text: 'Kirchenservice',
          href: getPermalink('/kirchenservice'),
        },
        {
          text: 'Combo',
          href: getPermalink('/combo'),
        },
      ],
    },
  ],
  actions: [{ text: 'Termine', href: getPermalink('/termine') }],
};

export const footerData = {
  links: [
    {
      title: 'Musik',
      links: [
        {
          text: 'Comboplan',
          href: getPermalink('/combo/comboplanpage'),
        },
        {
          text: 'Comboplan eintragen',
          href: getPermalink('/combo/comboplaneditpage'),
        },
        {
          text: 'Lieder für den Gottesdienst',
          href: getPermalink('/combo/comboliederauswahlpage'),
        },
        {
          text: 'Lieder für den Gottesdienst bearbeiten',
          href: getPermalink('/combo/comboliederauswahleditpage'),
        },
        {
          text: 'Lieder anlegen und bearbeiten',
          href: getPermalink('/combo/comboliedereditpage'),
        },
        {
          text: 'Liederliste gesamt',
          href: getPermalink('/combo/comboliederlistepage'),
        },
        {
          text: 'Liederchronik',
          href: getPermalink('/combo/comboliederchronikpage'),
        },
      ],
    },
    {
      title: 'Kirchenservice',
      links: [
        {
          text: 'Login',
          href: getPermalink('/combo/loginpage'),
        },

        {
          text: 'Kirchenservice',
          href: 'https://www.evang9.wien/root/kirchenservice/',
        },
      ],
    },
    {
      title: 'Admin',
      links: [
        {
          text: 'DecapCMS',
          href: 'https://evang9-wien.netlify.app/decapcms/index.html',
        },
        {
          text: 'Wordpress',
          href: 'https://www.evang9.wien/root/wp-login.php',
        },
        {
          text: 'Github',
          href: 'https://github.com/evang9wien/meka1',
        },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Kontakt', href: getPermalink('/kontakt') },
    { text: 'Impressum', href: getPermalink('/impressum') },
    { text: 'DSGVO', href: getPermalink('/dsgvo') },
    { text: 'Cookies', href: getPermalink('/cookies') },
  ],
  socialLinks: [
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: 'https://www.instagram.com/pfarrerin.mini/' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: 'https://www.facebook.com/Messiaskapelle/' },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/evang9wien/meka1' },
  ],
  footNote: `Evangelische Messiaskapelle, Pfarrgemeinde A.B. Wien Alsergrund © 2024`,
};
