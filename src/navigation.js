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
          href: getPermalink('/about'),
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
          href: getPermalink('/landing/sales'),
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
          href: getPermalink('/#features'),
        },
        {
          text: 'Konfirmation',
          href: getPermalink('/services'),
        },
        {
          text: 'Hochzeit',
          href: getPermalink('/pricing'),
        },
        {
          text: 'Eintritt',
          href: getPermalink('/about'),
        },
        {
          text: 'Gemeindewechsel',
          href: getPermalink('/about'),
        },
        {
          text: 'Todesfall',
          href: getPermalink('/about'),
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
          href: getPermalink('/combo/combotestpage'),
        },
        {
          text: 'Lieder',
          href: getPermalink('/combo/comboliederauswahlpage'),
        },
      ],
      
    },
  ],
  actions: [{ text: 'Termine', href: getPermalink('/termine') }],
};

export const footerData = {
  links: [
    
  ],
  secondaryLinks: [
    { text: 'Kontakt', href: getPermalink('/terms') },
    { text: 'Impressum', href: getPermalink('/privacy') },
    { text: 'DSGVO', href: getPermalink('/privacy') },
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
