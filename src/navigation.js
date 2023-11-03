import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Über uns',
      links: [
        {
          text: 'Leitbild',
          href: getPermalink('/homes/saas'),
        },
        {
          text: 'Unser Pfarrer',
          href: getPermalink('#pfarrer'),
        },
        {
          text: 'Das Presbyterium',
          href: getPermalink('/presbyterium'),
        },
        {
          text: 'Lektor_innen',
          href: getPermalink('/homes/personal'),
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
      text: 'Termine',
      href: getPermalink('/termine'),
      
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
  ],
  actions: [{ text: 'Mitarbeiten', href: 'https://github.com/onwidget/astrowind', target: '_blank' }],
};

export const footerData = {
  links: [
    {
      title: 'Product',
      links: [
        { text: 'Features', href: '#' },
        { text: 'Security', href: '#' },
        { text: 'Team', href: '#' },
        { text: 'Enterprise', href: '#' },
        { text: 'Customer stories', href: '#' },
        { text: 'Pricing', href: '#' },
        { text: 'Resources', href: '#' },
      ],
    },
    {
      title: 'Platform',
      links: [
        { text: 'Developer API', href: '#' },
        { text: 'Partners', href: '#' },
        { text: 'Atom', href: '#' },
        { text: 'Electron', href: '#' },
        { text: 'AstroWind Desktop', href: '#' },
      ],
    },
    {
      title: 'Support',
      links: [
        { text: 'Docs', href: '#' },
        { text: 'Community Forum', href: '#' },
        { text: 'Professional Services', href: '#' },
        { text: 'Skills', href: '#' },
        { text: 'Status', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { text: 'About', href: '#' },
        { text: 'Blog', href: '#' },
        { text: 'Careers', href: '#' },
        { text: 'Press', href: '#' },
        { text: 'Inclusion', href: '#' },
        { text: 'Social Impact', href: '#' },
        { text: 'Shop', href: '#' },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'X', icon: 'tabler:brand-x', href: '#' },
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: '#' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: '#' },
    { ariaLabel: 'RSS', icon: 'tabler:rss', href: getAsset('/rss.xml') },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/onwidget/astrowind' },
  ],
  footNote: `
    <span class="w-5 h-5 md:w-6 md:h-6 md:-mt-0.5 bg-cover mr-1.5 rtl:mr-0 rtl:ml-1.5 float-left rtl:float-right rounded-sm bg-[url(https://onwidget.com/favicon/favicon-32x32.png)]"></span>
    Made by <a class="text-blue-600 hover:underline dark:text-gray-200" href="https://onwidget.com/"> onWidget</a> · All rights reserved.
  `,
};
