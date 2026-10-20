// Szablony treści — to samo, co "pigułki" w Make.
//   {{Nazwa firmy}}        wartość kolumny (znaki specjalne zabezpieczone)
//   {{{Treść maila}}}      wartość kolumny bez zabezpieczania (gdy zawiera <br>)
//   {{data(+2)}}           data za 2 dni, np. 22.10.2026
//   {{dzien(+2)}}          sam dzień miesiąca za 2 dni, np. 22
//   {{#wiersze}}…{{/wiersze}}  powtórz fragment dla każdej firmy w grupie
import { dataZaDni, formatujDate } from './czas.js';

function zabezpiecz(t) {
  return String(t ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wartosc(wyrazenie, kontekst, teraz) {
  const w = wyrazenie.trim();
  let m = w.match(/^data\(\s*([+-]?\d+)?\s*\)$/);
  if (m) return formatujDate(dataZaDni(Number(m[1] || 0), teraz));
  m = w.match(/^dzien\(\s*([+-]?\d+)?\s*\)$/);
  if (m) return String(dataZaDni(Number(m[1] || 0), teraz).dzien);
  if (Object.prototype.hasOwnProperty.call(kontekst, w)) return kontekst[w] ?? '';
  return null; // nieznane pole
}

/**
 * @param {string} tekst szablon
 * @param {object} kontekst pola wiersza + dodatki (np. podpis, klucz)
 * @param {object} [opcje] { html: true — czy zabezpieczać {{ }}, wiersze: [...], teraz, brakujace: [] }
 */
export function wypelnij(tekst, kontekst, opcje = {}) {
  const { html = true, wiersze = [], teraz = new Date(), brakujace = [] } = opcje;
  let wynik = String(tekst ?? '');

  wynik = wynik.replace(/\{\{#wiersze\}\}([\s\S]*?)\{\{\/wiersze\}\}/g, (_, srodek) =>
    wiersze.map((w) => wypelnij(srodek, { ...kontekst, ...w }, { html, teraz, brakujace })).join('')
  );

  wynik = wynik.replace(/\{\{\{([^}]+)\}\}\}/g, (_, wyr) => {
    const v = wartosc(wyr, kontekst, teraz);
    if (v === null) { brakujace.push(wyr.trim()); return ''; }
    return String(v);
  });

  wynik = wynik.replace(/\{\{([^#/{][^}]*)\}\}/g, (_, wyr) => {
    const v = wartosc(wyr, kontekst, teraz);
    if (v === null) { brakujace.push(wyr.trim()); return ''; }
    return html ? zabezpiecz(v) : String(v);
  });

  return wynik;
}

/** Wersja tekstowa maila HTML (dla programów pocztowych bez HTML). */
export function htmlNaTekst(html) {
  return String(html)
    .replace(/<br\s*\/?>\s*\n?/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
