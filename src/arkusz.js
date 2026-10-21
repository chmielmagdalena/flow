// Połączenie z arkuszem Google (Google Sheets API) przez konto techniczne Google.
// Klucz konta technicznego wkleja się w panelu; arkusz trzeba temu kontu udostępnić.
import { JWT } from 'google-auth-library';

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

export function literaKolumny(indeks) { // 0 -> A, 27 -> AB
  let n = indeks + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function zakres(zakladka, a1) {
  return `'${zakladka.replace(/'/g, "''")}'!${a1}`;
}

/**
 * Tłumaczy błąd z Google na polski komunikat, który mówi, CO zrobić.
 * Google zwraca ten sam numer 403 w dwóch różnych sytuacjach: gdy w projekcie
 * nie włączono Google Sheets API i gdy arkusz nie jest udostępniony kontu technicznemu.
 */
export function opiszBladGoogle(e, kontoTechniczne) {
  const status = e.response?.status;
  const blad = e.response?.data?.error;
  const tresc = String(blad?.message || e.message || '');
  const powody = (blad?.details || []).map((d) => d.reason).filter(Boolean);
  if (powody.includes('SERVICE_DISABLED') || /has not been used|is disabled/i.test(tresc)) {
    const projekt = tresc.match(/project (\S+?)(?: before|\b)/)?.[1];
    return `W projekcie Google${projekt ? ' „' + projekt + '”' : ''} nie jest włączone Google Sheets API. `
      + 'Wejdź na console.cloud.google.com, wybierz ten projekt, wpisz w wyszukiwarce „Google Sheets API” i kliknij Włącz '
      + '(krok 3, punkt 3 instrukcji). Potem odczekaj minutę i sprawdź połączenie ponownie.';
  }
  if (status === 403) {
    return `Google nie wpuszcza do arkusza (błąd 403). Udostępnij arkusz kontu ${kontoTechniczne} jako Edytor (krok 3, punkt 9 instrukcji).`;
  }
  if (status === 404) {
    return 'Google nie znajduje takiego arkusza (błąd 404). Sprawdź identyfikator arkusza w scenariuszu: to długi ciąg znaków z adresu arkusza, między /d/ a /edit.';
  }
  if (status === 401 || /invalid_grant|invalid_client|unauthorized_client/i.test(tresc)) {
    return 'Google odrzuca klucz konta technicznego. Klucz mógł zostać usunięty w konsoli Google albo wklejono niepełny plik. Utwórz nowy klucz i wklej go w Połączeniach.';
  }
  return 'Błąd Google Sheets: ' + tresc;
}

export function polaczenieGoogle(kluczJson) {
  if (!kluczJson) throw new Error('Brak klucza Google. Wklej go w panelu: Połączenia → Google.');
  let klucz;
  try { klucz = JSON.parse(kluczJson); } catch { throw new Error('Klucz Google jest uszkodzony (to nie jest poprawny plik JSON).'); }
  const klient = new JWT({
    email: klucz.client_email,
    key: klucz.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  async function zapytanie(opcje) {
    try {
      const odp = await klient.request(opcje);
      return odp.data;
    } catch (e) {
      throw new Error(opiszBladGoogle(e, klucz.client_email));
    }
  }

  return {
    konto: klucz.client_email,

    /** Czyta zakładkę: { naglowki: [...], wiersze: [{ wiersz: 2, pola: {...} }] } */
    async czytaj(arkuszId, zakladka) {
      const dane = await zapytanie({
        url: `${API}/${arkuszId}/values/${encodeURIComponent(zakres(zakladka, 'A1:ZZ'))}`,
        params: { valueRenderOption: 'FORMATTED_VALUE' }
      });
      const wartosci = dane.values || [];
      const naglowki = (wartosci[0] || []).map((n) => String(n).trim());
      const wiersze = [];
      for (let i = 1; i < wartosci.length; i++) {
        const w = wartosci[i] || [];
        if (w.every((x) => String(x ?? '').trim() === '')) continue;
        const pola = {};
        naglowki.forEach((n, k) => { if (n) pola[n] = String(w[k] ?? ''); });
        wiersze.push({ wiersz: i + 1, pola });
      }
      return { naglowki, wiersze };
    },

    /** Zapisuje komórki: zmiany = [{ wiersz: 5, kolumna: 28, wartosc: 'nie' }] (kolumna liczona od 0) */
    async zapisz(arkuszId, zakladka, zmiany) {
      if (!zmiany.length) return;
      await zapytanie({
        url: `${API}/${arkuszId}/values:batchUpdate`,
        method: 'POST',
        data: {
          // RAW: wpisujemy dokładnie tekst, np. "wrzesień 2026", bez zamiany na datę
          valueInputOption: 'RAW',
          data: zmiany.map((z) => ({
            range: zakres(zakladka, `${literaKolumny(z.kolumna)}${z.wiersz}`),
            values: [[z.wartosc]]
          }))
        }
      });
    }
  };
}
