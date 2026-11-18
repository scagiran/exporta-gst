import type { Lang } from './lang';

/**
 * Units are stored as their Turkish names (the values the app has always saved)
 * and shown in the reader's language, on screen and on documents. Anything not
 * in this list was typed by the user and is shown as it is.
 */
export const UNIT_VALUES = ['Adet', 'Kg', 'Set', 'Takım', 'Metre', 'Kutu', 'Palet'] as const;

const UNIT_LABELS: Record<Lang, Record<string, string>> = {
  tr: { Adet: 'Adet', Kg: 'Kg', Set: 'Set', Takım: 'Takım', Metre: 'Metre', Kutu: 'Kutu', Palet: 'Palet' },
  en: { Adet: 'Pcs', Kg: 'Kg', Set: 'Set', Takım: 'Kit', Metre: 'Metre', Kutu: 'Box', Palet: 'Pallet' },
  fr: { Adet: 'Pièce', Kg: 'Kg', Set: 'Jeu', Takım: 'Ensemble', Metre: 'Mètre', Kutu: 'Boîte', Palet: 'Palette' },
};

/** Plural forms where the language needs them (Turkish keeps the singular after a number). */
const UNIT_PLURALS: Partial<Record<Lang, Record<string, string>>> = {
  en: { Set: 'Sets', Takım: 'Kits', Metre: 'Metres', Kutu: 'Boxes', Palet: 'Pallets' },
  fr: { Adet: 'Pièces', Set: 'Jeux', Takım: 'Ensembles', Metre: 'Mètres', Kutu: 'Boîtes', Palet: 'Palettes' },
};

/**
 * The unit in the reader's language. With a quantity it agrees in number:
 * French is singular below 2 (1,5 kg, 1 pièce), English only for exactly 1.
 */
export const unitLabel = (unit: string | undefined, lang: Lang, qty?: number): string => {
  if (!unit) return '';
  if (qty !== undefined) {
    const plural = lang === 'fr' ? Math.abs(qty) >= 2 : lang === 'en' ? Math.abs(qty) !== 1 : false;
    const form = plural ? UNIT_PLURALS[lang]?.[unit] : undefined;
    if (form) return form;
  }
  return UNIT_LABELS[lang][unit] ?? unit;
};

/** The stored value for a unit typed in any of the three languages (Pcs, Pièce → Adet). */
export const unitValue = (input: string | undefined): string | undefined => {
  if (!input) return input;
  const needle = input.trim().toLocaleLowerCase('tr-TR');
  for (const lang of Object.keys(UNIT_LABELS) as Lang[]) {
    for (const [value, label] of Object.entries(UNIT_LABELS[lang])) {
      if (label.toLocaleLowerCase('tr-TR') === needle || value.toLocaleLowerCase('tr-TR') === needle) return value;
    }
  }
  return input.trim();
};
