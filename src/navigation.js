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
      ],
    },
    {
      text: 'Gottesdienste',
      links: [
        {
          text: 'Sonntags um 10',
          href: getPermalink('/#features'),
        },
        {
          text: 'Sontags um 19 Uhr: OASE',
          href: getPermalink('/services'),
        },
        {
          text: 'Termine',
          href: getPermalink('/pricing'),
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
          href: getPermalink('/angebote'),
        },
        {
          text: 'Für Familien: Kirche Kunterbunt',
          href: getPermalink('/mekaangebotepage'),
        },
        {
          text: 'LUV - Ein Workshop für dich',
          href: getPermalink('/landing/click-through'),
        },
        {
          text: 'Pfarrer to go',
          href: getPermalink('/landing/product'),
        },
        {
          text: 'MEKA Classic',
          href: getPermalink('/landing/pre-launch'),
        },
        {
          text: 'Zuversichtstraining',
          href: getPermalink('/landing/subscription'),
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
          href: getPermalink('/#features'),
        },
        {
          text: 'Login',
          href: getPermalink('/combo/loginpage'),
        },
        {
          text: 'Mitarbeiterliste',
          href: getPermalink('/services'),
        },
        {
          text: 'Kirchenservice',
          href: getPermalink('/pricing'),
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
          text: 'Lieder',
          href: getPermalink('/combo/comboliederauswahlpage'),
        },
        {
          text: 'Liederlist',
          href: getPermalink('/combo/comboliederlistepage'),
        },
        {
          text: 'Liederchronik',
          href: getPermalink('/combo/comboliederchronikpage'),
        },
      ],
    },
  ],
  actions: [{ text: 'Termine', href: getPermalink('/termine') }],
};

export const footerData = {
  links: [],
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
  footNote: `
  Evangelische Messiaskapelle, Pfarrgemeinde A.B. Wien Alsergrund © 2023
  `,
};
