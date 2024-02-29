const getUrl = () => {
  const url = new URL(window.location.href);

  console.log('URL: ', url);
  if (!url.origin.includes('evang9.wien')) return 'https://www.evang9.wien';
  return '';
};

export { getUrl };
