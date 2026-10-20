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
      const status = e.response?.status;
      if (status === 403 || status === 404) {
        throw new Error(`Google nie wpuszcza do arkusza (błąd ${status}). Udostępnij arkusz kontu ${klucz.client_email} jako Edytor.`);
      }
      throw new Error('Błąd Google Sheets: ' + (e.response?.data?.error?.message || e.message));
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
