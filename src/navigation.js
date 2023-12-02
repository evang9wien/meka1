import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

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
        {
          text: 'Grätzloase in der Seegasse',
          href: getPermalink('/angebote#graetzloase'),
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
          href: getPermalink('/termine'),
        },
        {
          text: 'Zum Nachhören',
          href: getPermalink('/predigtpage'),
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
          text: 'Angebote',
          href: getPermalink('/angebote#angebot'),
        },
        {
          text: 'Pfarrer to go',
          href: getPermalink('/angebote#pfarrer2go'),
        },
        {
          text: 'Grätzloase in der Seegasse',
          href: getPermalink('/angebote#graetzloase'),
        },
        {
          text: 'MEKA Classic',
          href: getPermalink('/mekaclassic'),
        },
        {
          text: 'Zuversichtstraining goes Christmas',
          href: getPermalink('/zuversichtgoeschristmas'),
        },
      ],
    },

    {
      text: 'Kirche',
      href: '#',
      links: [
        {
          text: 'Taufe',
          href: getPermalink('/kirche/taufe'),
        },
        {
          text: 'Konfirmation',
          href: getPermalink('/kirche/konfirmation'),
        },
        {
          text: 'Hochzeit',
          href: getPermalink('/kirche/hochzeit'),
        },
        {
          text: 'Eintritt',
          href: getPermalink('/kirche/eintritt'),
        },
        {
          text: 'Gemeindewechsel',
          href: getPermalink('/kirche/gemeindewechsel'),
        },
        {
          text: 'Todesfall',
          href: getPermalink('/kirche/todesfall'),
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
      title: 'Combo',
      links: [
        {
          text: 'Login',
          href: getPermalink('/combo/loginpage'),
        },
        {
          text: 'Comboplan',
          href: getPermalink('/combo/comboplanpage'),
        },
        {
          text: 'Comboplan eintragen',
          href: getPermalink('/combo/comboplaneditpage'),
        },
        {
          text: 'Liederauswahl',
          href: getPermalink('/combo/comboliederauswahlpage'),
        },
        {
          text: 'Liederauswahl editieren',
          href: 'https://www.evang9.wien/root/lieder_auswahl/',
        },
        {
          text: 'Liederliste',
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
          text: 'Mitarbeiterliste',
          href: getPermalink('/'),
        },
        {
          text: 'Kirchenservice',
          href: 'https://www.evang9.wien/root/kirchenservice/',
        },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Kontakt', href: getPermalink('/kontakt') },
    { text: 'Impressum', href: getPermalink('/impressum') },
    { text: 'DSGVO', href: getPermalink('/dsvo') },
  ],
  socialLinks: [
    { ariaLabel: 'X', icon: 'tabler:brand-x', href: '#' },
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: '#' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: '#' },
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/onwidget/astrowind' },
  ],
  footNote: `Evangelische Messiaskapelle, Pfarrgemeinde A.B. Wien Alsergrund © 2023`,
};
