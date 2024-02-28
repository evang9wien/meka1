const namenMap = new Map();

namenMap.set('GH', 'Pfarrer i.R. Harald Geschl');
namenMap.set('SFJ', 'Pfarrer Stefan Fleischner-Janits');
namenMap.set('WW', 'Lektor Wolfgang Waldschütz');
namenMap.set('TDH', 'Lektorin Tanja Dietrich-Hübner');
namenMap.set('MRH', 'Lektor Mark Ruiz-Hellin');

export function getLongName(name) {
  return namenMap.get(name);
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

const imgMapCal = new Map();

imgMapCal.set('Harald', 'Harald-Geschl.png');
imgMapCal.set('Stefan', 'stefan.png');
imgMapCal.set('Wolfgang', 'Wolfgang.png');
imgMapCal.set('Tanja', 'Tanja.png');
imgMapCal.set('Mark', 'Mark-Ruiz-Hellin.png');

export function getImageCal(name) {
  return imgMapCal.get(name);
}
