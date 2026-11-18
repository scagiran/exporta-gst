export type Lang = 'tr' | 'en' | 'fr';
export const LANGS: Lang[] = ['tr', 'en', 'fr'];
export const LOCALE: Record<Lang, string> = { tr: 'tr-TR', en: 'en-GB', fr: 'fr-FR' };

/** French typography: a no-break space before ? ! : ; and inside « ». */
export const NB = ' ';
