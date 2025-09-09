const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,svelte,ts,tsx,vue}',
    './node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        page: "var(--aw-color-text-page)",       // text-page
        "page-bg": "var(--aw-color-bg-page)",    // bg-page
        "page-dark": "var(--aw-color-bg-page-dark)",
        "text-muted": "var(--aw-color-text-muted)",
        primary: "var(--aw-color-primary)",
        secondary: "var(--aw-color-secondary)",
        accent: 'var(--aw-color-accent)',
        default: 'var(--aw-color-text-default)',
        muted: 'var(--aw-color-text-muted)',
        'meka-blue': '#bcd0ed',
      },
      fontFamily: {
        sans: ['var(--aw-font-sans)', ...defaultTheme.fontFamily.sans],
        serif: ['var(--aw-font-serif)', ...defaultTheme.fontFamily.serif],
        heading: ['var(--aw-font-heading)', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require('@tailwindcss/typography'),
  require('flowbite/plugin')],
  darkMode: 'class',
};
