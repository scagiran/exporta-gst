import React from 'react';

/** Copy strings mark their accent words with *asterisks*. */
export function accentParts(text: string): { text: string; em: boolean }[] {
  return text
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((part) => (part.startsWith('*') && part.endsWith('*') ? { text: part.slice(1, -1), em: true } : { text: part, em: false }));
}

/** The words of an accented string, each flagged when it sits inside the accent. */
export function accentWords(text: string): { w: string; em: boolean }[] {
  return accentParts(text).flatMap(({ text: t, em }) =>
    t
      .split(' ')
      .filter(Boolean)
      .map((w) => ({ w, em }))
  );
}

/** Plain text with the accent wrapped in the given element (a span by default). */
export function accent(text: string, Tag: 'span' | 'em' = 'span'): React.ReactNode {
  return accentParts(text).map((p, i) => (p.em ? <Tag key={i}>{p.text}</Tag> : <React.Fragment key={i}>{p.text}</React.Fragment>));
}

/** Without the markers, for screen readers and attributes. */
export const plain = (text: string) => text.replace(/\*/g, '');
