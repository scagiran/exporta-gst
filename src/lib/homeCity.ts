/**
 * The company's home city, remembered in this browser so the public landing
 * map can mark it on the visitor's next visit. Nothing leaves the browser:
 * the city comes from the company settings the user typed in, and is matched
 * against the 81 provinces below.
 */

const KEY = 'exporta.homeCity';

/** Province centres: [display name, latitude, longitude]. */
const PROVINCES: [string, number, number][] = [
  ['Adana', 37.0, 35.32], ['Adıyaman', 37.76, 38.28], ['Afyonkarahisar', 38.76, 30.54], ['Ağrı', 39.72, 43.05],
  ['Amasya', 40.65, 35.83], ['Ankara', 39.93, 32.86], ['Antalya', 36.89, 30.71], ['Artvin', 41.18, 41.82],
  ['Aydın', 37.85, 27.85], ['Balıkesir', 39.65, 27.88], ['Bilecik', 40.14, 29.98], ['Bingöl', 38.88, 40.5],
  ['Bitlis', 38.4, 42.11], ['Bolu', 40.74, 31.61], ['Burdur', 37.72, 30.29], ['Bursa', 40.19, 29.06],
  ['Çanakkale', 40.15, 26.41], ['Çankırı', 40.6, 33.62], ['Çorum', 40.55, 34.95], ['Denizli', 37.78, 29.09],
  ['Diyarbakır', 37.91, 40.24], ['Edirne', 41.68, 26.56], ['Elazığ', 38.67, 39.22], ['Erzincan', 39.75, 39.49],
  ['Erzurum', 39.9, 41.27], ['Eskişehir', 39.78, 30.52], ['Gaziantep', 37.07, 37.38], ['Giresun', 40.91, 38.39],
  ['Gümüşhane', 40.46, 39.48], ['Hakkari', 37.58, 43.74], ['Hatay', 36.2, 36.16], ['Isparta', 37.76, 30.55],
  ['Mersin', 36.81, 34.64], ['İstanbul', 41.01, 28.98], ['İzmir', 38.42, 27.14], ['Kars', 40.6, 43.1],
  ['Kastamonu', 41.38, 33.78], ['Kayseri', 38.73, 35.48], ['Kırklareli', 41.73, 27.22], ['Kırşehir', 39.15, 34.16],
  ['Kocaeli', 40.77, 29.94], ['Konya', 37.87, 32.48], ['Kütahya', 39.42, 29.98], ['Malatya', 38.35, 38.31],
  ['Manisa', 38.61, 27.43], ['Kahramanmaraş', 37.58, 36.94], ['Mardin', 37.31, 40.74], ['Muğla', 37.22, 28.36],
  ['Muş', 38.74, 41.49], ['Nevşehir', 38.62, 34.71], ['Niğde', 37.97, 34.68], ['Ordu', 40.98, 37.88],
  ['Rize', 41.02, 40.52], ['Sakarya', 40.78, 30.4], ['Samsun', 41.29, 36.33], ['Siirt', 37.93, 41.94],
  ['Sinop', 42.03, 35.15], ['Sivas', 39.75, 37.02], ['Tekirdağ', 40.98, 27.51], ['Tokat', 40.31, 36.55],
  ['Trabzon', 41.0, 39.72], ['Tunceli', 39.11, 39.55], ['Şanlıurfa', 37.17, 38.79], ['Uşak', 38.68, 29.41],
  ['Van', 38.5, 43.38], ['Yozgat', 39.82, 34.81], ['Zonguldak', 41.45, 31.79], ['Aksaray', 38.37, 34.03],
  ['Bayburt', 40.26, 40.23], ['Karaman', 37.18, 33.22], ['Kırıkkale', 39.85, 33.51], ['Batman', 37.88, 41.13],
  ['Şırnak', 37.52, 42.46], ['Bartın', 41.63, 32.34], ['Ardahan', 41.11, 42.7], ['Iğdır', 39.92, 44.04],
  ['Yalova', 40.66, 29.27], ['Karabük', 41.2, 32.62], ['Kilis', 36.72, 37.12], ['Osmaniye', 37.07, 36.25],
  ['Düzce', 40.84, 31.16],
];

/** Everyday names people type instead of the province name. */
const ALIASES: Record<string, string> = {
  antakya: 'Hatay',
  iskenderun: 'Hatay',
  izmit: 'Kocaeli',
  gebze: 'Kocaeli',
  adapazari: 'Sakarya',
  urfa: 'Şanlıurfa',
  maras: 'Kahramanmaraş',
  afyon: 'Afyonkarahisar',
  icel: 'Mersin',
  antep: 'Gaziantep',
};

export type HomeCity = { name: string; lat: number; lon: number };

const fold = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const INDEX: [string, string][] = [
  ...PROVINCES.map(([name]) => [fold(name), name] as [string, string]),
  ...Object.entries(ALIASES),
].sort((a, b) => b[0].length - a[0].length); // longest first: "kahramanmaras" before "maras"

/** Finds the province in free text such as "Tuzla / İstanbul" or "Ostim OSB, Ankara". */
export function resolveCity(text: string | null | undefined): HomeCity | null {
  if (!text || !text.trim()) return null;
  const words = fold(text).split(/[^a-z]+/).filter(Boolean);
  for (const [key, name] of INDEX) {
    if (words.includes(key)) {
      const hit = PROVINCES.find(([n]) => n === name);
      if (hit) return { name: hit[0], lat: hit[1], lon: hit[2] };
    }
  }
  return null;
}

/** Called whenever real (not demo) company settings are loaded or saved. */
export function rememberHomeCity(text: string | null | undefined) {
  try {
    const city = resolveCity(text);
    if (city) window.localStorage.setItem(KEY, city.name);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage can be blocked; the map simply shows Turkey */
  }
}

export function readHomeCity(): HomeCity | null {
  try {
    return resolveCity(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}
