const getUrl = (): string => {
  const url = new URL(window.location.href);
  if (!url.origin.includes('www.evang9.wien')) return 'https://www.evang9.wien';
  return '';
};

export { getUrl };
