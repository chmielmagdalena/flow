// Testy silnika na zmyślonych danych — bez internetu, bez prawdziwego arkusza i poczty.
// Uruchom: npm test
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { uruchom, sprawdzKroki } from '../src/silnik.js';
import { wypelnij, htmlNaTekst } from '../src/szablon.js';
import { literaKolumny, opiszBladGoogle } from '../src/arkusz.js';
import { dataZaDni, formatujDate } from '../src/czas.js';

const A = JSON.parse(fs.readFileSync(new URL('../scenariusze-domyslne/A.json', import.meta.url)));
const B = JSON.parse(fs.readFileSync(new URL('../scenariusze-domyslne/B.json', import.meta.url)));

const NAGLOWKI = ['L.p.', 'IMIĘ I NAZWISKO', 'Nazwa firmy', 'Nr telefonu', 'NIP', 'Email', 'Comarch Betterfly', 'Forma działalności',
  'termin zatwierdzenia dokumentow', 'Forma rozliczenia', 'ma ZUS', 'ma VAT', 'ma VAT-UE', 'ma PIT-4', 'ma PIT-36', 'ma PIT-36L',
  'ma PIT-28', 'ma CIT-8', 'kwota PIT lub CIT', 'kwota ZUS', 'kwota PIT-4', 'kwota VAT', 'Za miesiąc', 'Termin PIT/CIT',
  'Termin ZUS', 'Termin PIT-4', 'Termin VAT', 'Treść maila', 'Wysłano', '(pomocnicza) PIT/CIT', '(pomocnicza) ZUS',
  '(pomocnicza) PIT-4', '(pomocnicza) VAT', '(pomocnicza) data PIT/CIT', '(pomocnicza) data ZUS', '(pomocnicza) data PIT-4',
  '(pomocnicza) data VAT', 'Zatwierdzone', 'Wysłano PIT/CIT', 'Wysłano ZUS', 'Wysłano PIT-4', 'Wysłano VAT',
  '(pomocnicza) po wysyłce PIT/CIT', '(pomocnicza) po wysyłce ZUS', '(pomocnicza) po wysyłce PIT-4', '(pomocnicza) po wysyłce VAT',
  'Okres PIT/CIT', 'Okres VAT', 'ma PPK', 'kwota PPK', 'Termin PPK', 'Wysłano PPK', '(pomocnicza) PPK', '(pomocnicza) data PPK',
  '(pomocnicza) po wysyłce PPK', 'ZUS rozbicie (pracodawca)', '(pomocnicza) ZUS społeczna', '(pomocnicza) ZUS zdrowotna',
  '(pomocnicza) ZUS FP', '(pomocnicza) ZUS w tym'];

const TERAZ = new Date('2026-10-08T06:00:00Z'); // 08.10.2026, 08:00 w Warszawie → za 2 dni: 10.

function wiersz(nr, p) {
  return { wiersz: nr, pola: Object.fromEntries(NAGLOWKI.map((n) => [n, p[n] ?? ''])) };
}
const DANE = () => ({
  naglowki: [...NAGLOWKI],
  wiersze: [
    wiersz(2, { 'Nazwa firmy': 'Piekarnia Złoty Kłos', Email: 'kłos@example.com'.replace('ł', 'l'), 'Comarch Betterfly': 'tak',
      'termin zatwierdzenia dokumentow': '10', 'Za miesiąc': 'wrzesień 2026',
      'Treść maila': 'ZUS za wrzesień 2026 — do zapłaty 1926,76 zł — termin 20.10.2026<br>\n', Zatwierdzone: 'tak',
      '(pomocnicza) po wysyłce ZUS': 'wrzesień 2026', '(pomocnicza) po wysyłce PIT/CIT': 'sierpień 2026' }),
    // ten sam klient, druga firma, też zatwierdzona → jeden mail
    wiersz(3, { 'Nazwa firmy': 'Kłos & Syn s.c.', Email: ' KLOS@example.com ', 'Comarch Betterfly': 'nie',
      'termin zatwierdzenia dokumentow': '10', 'Za miesiąc': 'wrzesień 2026',
      'Treść maila': 'VAT za wrzesień 2026 — do zapłaty 812,00 zł — termin 27.10.2026<br>\n', Zatwierdzone: 'tak',
      '(pomocnicza) po wysyłce VAT': 'wrzesień 2026' }),
    // ten sam klient, trzecia firma, NIEzatwierdzona → nie może trafić do maila ani zostać odznaczona
    wiersz(4, { 'Nazwa firmy': 'Kłos Najem', Email: 'klos@example.com', 'Za miesiąc': 'wrzesień 2026',
      'Treść maila': 'PIT-28 za wrzesień 2026 — do zapłaty 300,00 zł — termin 20.10.2026<br>\n', Zatwierdzone: 'nie' }),
    wiersz(5, { 'Nazwa firmy': 'Studio <Ola>', Email: 'ola@example.com', 'Comarch Betterfly': 'tak',
      'termin zatwierdzenia dokumentow': '15', 'Za miesiąc': 'wrzesień 2026', 'Treść maila': '', Zatwierdzone: 'tak' }),
    wiersz(6, { 'Nazwa firmy': 'Bez Maila', Email: 'brak-adresu', 'Comarch Betterfly': 'tak',
      'termin zatwierdzenia dokumentow': '10', 'Za miesiąc': 'wrzesień 2026',
      'Treść maila': 'PPK za wrzesień 2026 — do zapłaty 50,00 zł — termin 15.10.2026<br>\n', Zatwierdzone: 'tak' })
  ]
});

function sztuczneZrodla({ zapisBlad = false, wysylkaBladDla = null } = {}) {
  const wyslane = [];
  const zapisy = [];
  return {
    wyslane, zapisy,
    arkusz: {
      async czytaj() { return DANE(); },
      async zapisz(arkusz, zakladka, zmiany) { if (zapisBlad) throw new Error('brak sieci'); zapisy.push(...zmiany); }
    },
    poczta: {
      async wyslij(m) { if (m.do === wysylkaBladDla) throw new Error('odmowa serwera'); wyslane.push(m); }
    }
  };
}
const U = { tryb: 'test', adresTestowy: 'test@example.com', nadawca: 'Biuro <biuro@example.com>', podpis: 'Podpis<br>Biuro', maksMailiNaPrzebieg: 60 };

let zaliczone = 0;
async function test(nazwa, fn) {
  try { await fn(); zaliczone++; console.log('  ✓ ' + nazwa); }
  catch (e) { console.log('  ✗ ' + nazwa + '\n    ' + e.message); process.exitCode = 1; }
}

console.log('Narzędzia');
await test('litery kolumn', () => {
  assert.equal(literaKolumny(0), 'A'); assert.equal(literaKolumny(27), 'AB'); assert.equal(literaKolumny(59), 'BH');
});
await test('błędy Google: nie włączone API, nie udostępniony arkusz, zły identyfikator', () => {
  const konto = 'flow@przyklad.iam.gserviceaccount.com';
  const odp = (status, message, reason) => ({ response: { status, data: { error: { message, details: reason ? [{ reason }] : [] } } } });
  const api = opiszBladGoogle(odp(403, 'Google Sheets API has not been used in project 512305 before or it is disabled. Enable it by visiting https://console.developers.google.com/', 'SERVICE_DISABLED'), konto);
  assert.ok(api.includes('nie jest włączone Google Sheets API') && api.includes('512305'), api);
  assert.ok(!api.includes('Udostępnij'), 'przy wyłączonym API nie każemy udostępniać arkusza');
  const udost = opiszBladGoogle(odp(403, 'The caller does not have permission'), konto);
  assert.ok(udost.includes('Udostępnij arkusz kontu ' + konto), udost);
  const brak = opiszBladGoogle(odp(404, 'Requested entity was not found.'), konto);
  assert.ok(brak.includes('nie znajduje takiego arkusza'), brak);
  const klucz = opiszBladGoogle({ message: 'invalid_grant: Invalid JWT Signature.' }, konto);
  assert.ok(klucz.includes('odrzuca klucz'), klucz);
  assert.equal(opiszBladGoogle({ message: 'ECONNRESET' }, konto), 'Błąd Google Sheets: ECONNRESET');
});
await test('daty w strefie Warszawy, przez koniec miesiąca', () => {
  assert.equal(formatujDate(dataZaDni(2, new Date('2026-10-30T23:30:00Z'))), '02.11.2026'); // 31.10 00:30 w Warszawie (po zmianie czasu UTC+1)
});
await test('szablon zabezpiecza {{ }} i nie zabezpiecza {{{ }}}', () => {
  assert.equal(wypelnij('{{a}}|{{{a}}}', { a: '<b>' }), '&lt;b&gt;|<b>');
});
await test('wersja tekstowa maila', () => {
  assert.equal(htmlNaTekst('Dzień dobry,<br><br>kwota &amp; termin'), 'Dzień dobry,\n\nkwota & termin');
});

console.log('Scenariusz A — termin zatwierdzenia');
await test('podgląd: tylko Betterfly=tak z dniem za 2 dni; zły adres zgłoszony', async () => {
  const z = sztuczneZrodla();
  const r = await uruchom(A, { tryb: 'podglad', ustawienia: U, ...z, teraz: TERAZ });
  assert.deepEqual(r.maile.map((m) => m.firmy[0]), ['Piekarnia Złoty Kłos', 'Bez Maila']);
  assert.equal(r.maile[0].status, 'podglad');
  assert.match(r.maile[0].tresc, /w dniu 10\.10\.2026 mija termin/);
  assert.equal(r.maile[1].status, 'blad');
  assert.equal(z.wyslane.length, 0);
});
await test('test: mail idzie na adres testowy z oryginalnym adresatem w temacie', async () => {
  const z = sztuczneZrodla();
  const r = await uruchom(A, { tryb: 'test', ustawienia: U, ...z, teraz: TERAZ });
  assert.equal(z.wyslane.length, 1);
  assert.equal(z.wyslane[0].do, 'test@example.com');
  assert.match(z.wyslane[0].temat, /^\[TEST → klos@example\.com\]/);
  assert.equal(r.status, 'czesciowo');
});

console.log('Scenariusz B — kwoty do zapłaty');
await test('grupowanie: dwie zatwierdzone firmy klienta w jednym mailu, niezatwierdzona pominięta', async () => {
  const z = sztuczneZrodla();
  const r = await uruchom(B, { tryb: 'podglad', ustawienia: U, ...z, teraz: TERAZ });
  const kłos = r.maile.find((m) => m.do.toLowerCase() === 'klos@example.com');
  assert.deepEqual(kłos.firmy, ['Piekarnia Złoty Kłos', 'Kłos & Syn s.c.']);
  assert.match(kłos.tresc, /<b>Kłos &amp; Syn s\.c\.<\/b><br>VAT za wrzesień/);
  assert.doesNotMatch(kłos.tresc, /PIT-28/);
  assert.equal(kłos.temat, 'Kwoty do zapłaty za wrzesień 2026');
  assert.ok(!r.maile.some((m) => m.firmy.includes('Studio <Ola>')), 'pusta treść nie idzie');
});
await test('tryb test NIE odznacza arkusza', async () => {
  const z = sztuczneZrodla();
  await uruchom(B, { tryb: 'test', ustawienia: U, ...z, teraz: TERAZ });
  assert.equal(z.zapisy.length, 0);
  assert.ok(z.wyslane.length >= 1);
});
await test('na żywo: odznacza tylko wiersze, które poszły (2 i 3), nie 4', async () => {
  const z = sztuczneZrodla();
  const r = await uruchom(B, { tryb: 'na_zywo', ustawienia: U, ...z, teraz: TERAZ });
  const wiersze = [...new Set(z.zapisy.map((x) => x.wiersz))].sort();
  assert.deepEqual(wiersze, [2, 3]);
  const kol = (n) => NAGLOWKI.indexOf(n);
  const w2 = Object.fromEntries(z.zapisy.filter((x) => x.wiersz === 2).map((x) => [NAGLOWKI[x.kolumna], x.wartosc]));
  assert.equal(w2.Zatwierdzone, 'nie');
  assert.equal(w2['Wysłano'], 'wrzesień 2026');
  assert.equal(w2['Wysłano ZUS'], 'wrzesień 2026');
  assert.equal(w2['Wysłano PIT/CIT'], 'sierpień 2026');
  assert.ok(z.zapisy.every((x) => x.kolumna >= 0), 'każda kolumna znaleziona');
  assert.equal(kol('Wysłano'), 28); // AC
  assert.equal(r.maile.find((m) => m.do === 'brak-adresu').status, 'blad');
});
await test('błąd wysyłki: nic nie odznaczone dla tego klienta', async () => {
  const z = sztuczneZrodla({ wysylkaBladDla: 'klos@example.com' });
  const r = await uruchom(B, { tryb: 'na_zywo', ustawienia: U, ...z, teraz: TERAZ });
  assert.equal(z.zapisy.length, 0);
  assert.equal(r.status, 'czesciowo');
});
await test('mail poszedł, zapis nie — przebieg zatrzymany z instrukcją', async () => {
  const z = sztuczneZrodla({ zapisBlad: true });
  const r = await uruchom(B, { tryb: 'na_zywo', ustawienia: U, ...z, teraz: TERAZ });
  assert.equal(r.status, 'blad');
  assert.match(r.komunikat, /wierszach: 2, 3/);
  assert.equal(z.wyslane.length, 1, 'po błędzie zapisu nie wysyła kolejnych');
});
await test('bezpiecznik: za dużo maili → nic nie wysłane', async () => {
  const z = sztuczneZrodla();
  const r = await uruchom(B, { tryb: 'na_zywo', ustawienia: { ...U, maksMailiNaPrzebieg: 1 }, ...z, teraz: TERAZ });
  assert.equal(r.status, 'blad');
  assert.equal(z.wyslane.length, 0);
});
await test('zmieniony nagłówek w arkuszu → nic nie wysłane, jasny komunikat', async () => {
  const z = sztuczneZrodla();
  z.arkusz.czytaj = async () => { const d = DANE(); d.naglowki[d.naglowki.indexOf('Zatwierdzone')] = 'Zatwierdzono'; return d; };
  const r = await uruchom(B, { tryb: 'na_zywo', ustawienia: U, ...z, teraz: TERAZ });
  assert.equal(r.status, 'blad');
  assert.match(r.komunikat, /"Zatwierdzone"/);
  assert.equal(z.wyslane.length, 0);
});

console.log('Sprawdzanie scenariuszy z edytora');
await test('scenariusze A i B są poprawne', () => {
  assert.deepEqual(sprawdzKroki(A.kroki), []);
  assert.deepEqual(sprawdzKroki(B.kroki), []);
});
await test('zapis w arkuszu przed wysyłką jest odrzucany', () => {
  const zle = [B.kroki[0], B.kroki[4], B.kroki[3]];
  assert.ok(sprawdzKroki(zle).some((b) => b.includes('musi stać za „Wyślij mail”')));
});
await test('pusty filtr i nieznany bloczek są odrzucane', () => {
  const b = sprawdzKroki([A.kroki[0], { typ: 'filtr', warunki: [{ pole: '', op: 'rowne' }] }, { typ: 'cos' }]);
  assert.ok(b.some((x) => x.includes('nazwę kolumny')));
  assert.ok(b.some((x) => x.includes('nieznany rodzaj')));
});

console.log(`\nZaliczone: ${zaliczone}`);
