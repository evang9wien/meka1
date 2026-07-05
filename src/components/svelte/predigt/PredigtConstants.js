const namenMap = new Map();

namenMap.set('GH', 'Pfarrer i.R. Harald Geschl');
namenMap.set('SFJ', 'Pfarrer Stefan Fleischner-Janits');
namenMap.set('WW', 'Lektor Wolfgang Waldschütz');
namenMap.set('TDH', 'Lektorin Tanja Dietrich-Hübner');
namenMap.set('MRH', 'Lektor Mark Ruiz-Hellin');
namenMap.set('COM', 'Comboprobe');

/**
 * Static fallback list of prediger.
 * This is the seed data for Firebase (combo/prediger) and a build-time fallback.
 * The live data is managed in Firebase — use predigerStore.js for runtime access.
 */
export const PREDIGER = [
  { kuerzel: 'SFJ', vornamen: ['Stefan'],   langname: 'Pfarrer Stefan Fleischner-Janits',  varianten: ['Stefan FLEISCHNER-JANITS', 'Stefan Fleischner-Janits'] },
  { kuerzel: 'GH',  vornamen: ['Harald'],   langname: 'Pfarrer i.R. Harald Geschl',        varianten: ['Harald GESCHL', 'Harald Geschl'] },
  { kuerzel: 'WW',  vornamen: ['Wolfgang'], langname: 'Lektor Wolfgang Waldschütz',         varianten: ['Wolfgang WALDSCHÜTZ', 'Wolfgang Waldschütz'] },
  { kuerzel: 'MRH', vornamen: ['Mark'],     langname: 'Lektor Mark Ruiz-Hellin',            varianten: ['Mark RUIZ HELLÍN', 'Mark RUIZ HELLIN', 'Mark RUIZ-HELLIN', 'Mark Ruiz-Hellin'] },
  { kuerzel: 'TDH', vornamen: ['Tanja'],    langname: 'Lektorin Tanja Dietrich-Hübner',    varianten: ['Tanja DIETRICH HÜBNER', 'Tanja DIETRICH-HÜBNER', 'Tanja Dietrich-Hübner'] },
];

/**
 * Returns the Kürzel for a prediger found anywhere in `text`, or '' if none found.
 */
export function getPredigerKuerzel(text) {
  if (!text) return '';
  const upper = text.toUpperCase();
  for (const p of PREDIGER) {
    for (const v of p.varianten) {
      if (upper.includes(v.toUpperCase())) return p.kuerzel;
    }
  }
  return '';
}

export function getLongName(name) {
  return namenMap.get(name) ? namenMap.get(name) : '';
}

const imgMap = new Map();

imgMap.set('GH', 'Harald-Geschl.png');
imgMap.set('SFJ', 'stefan.png');
imgMap.set('WW', 'Wolfgang.png');
imgMap.set('TDH', 'Tanja.png');
imgMap.set('MRH', 'Mark-Ruiz-Hellin.png');

export function getImage(name) {
  return imgMap.get(name);
}

const avatarImgMap = new Map();

avatarImgMap.set('GH', 'Harald-Geschl-Avatar.png');
avatarImgMap.set('SFJ', 'stefan-Avatar.png');
avatarImgMap.set('WW', 'Wolfgang-Avatar.png');
avatarImgMap.set('TDH', 'Tanja-Avatar.png');
avatarImgMap.set('MRH', 'Mark-Ruiz-Hellin-Avatar.png');

export function getImageAvatar(name) {
  return avatarImgMap.get(name);
}

const imgMapCal = new Map();

imgMapCal.set('Harald', 'Harald-Geschl.png');
imgMapCal.set('Stefan', 'stefan.png');
imgMapCal.set('Wolfgang', 'Wolfgang.png');
imgMapCal.set('Tanja', 'Tanja.png');
imgMapCal.set('Mark', 'Mark-Ruiz-Hellin.png');

export function getImageCal(name) {
  return imgMapCal.get(name);
}

const avatarImgMapCal = new Map();

avatarImgMapCal.set('Harald', 'Harald-Geschl-Avatar.png');
avatarImgMapCal.set('Stefan', 'stefan-Avatar.png');
avatarImgMapCal.set('Wolfgang', 'Wolfgang-Avatar.png');
avatarImgMapCal.set('Tanja', 'Tanja-Avatar.png');
avatarImgMapCal.set('Mark', 'Mark-Ruiz-Hellin-Avatar.png');

export function getImageCalAvatar(name) {
  return avatarImgMapCal.get(name);
}
