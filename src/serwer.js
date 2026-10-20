// Serwer panelu: otwierasz http://localhost:3030 w przeglądarce.
// Działa tylko na Twoim komputerze (127.0.0.1) — nikt z internetu się do niego nie dostanie.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as magazyn from './magazyn.js';
import { wykonaj } from './wykonawca.js';
import { startHarmonogramu } from './harmonogram.js';
import { polaczenieGoogle } from './arkusz.js';
import { polaczeniePoczty } from './poczta.js';
import { OPISY_KROKOW, sprawdzKroki } from './silnik.js';
import { godzinaTeraz } from './czas.js';

const PORT = Number(process.env.PORT) || 3030;
const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

magazyn.przygotuj();
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(KORZEN, 'panel')));

const obsluz = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (e) {
    res.status(400).json({ blad: e.message });
  }
};

// ---------- stan ogólny ----------
app.get('/api/stan', obsluz(() => ({
  ustawienia: magazyn.ustawienia(),
  sekrety: magazyn.stanSekretow(),
  godzina: godzinaTeraz(),
  opisyKrokow: OPISY_KROKOW
})));

// ---------- scenariusze ----------
app.get('/api/scenariusze', obsluz(() => {
  // Ostatnie uruchomienie = najnowszy wpis w historii (z godziną); gdy brak — dzień z harmonogramu.
  const st = magazyn.stan();
  const hist = magazyn.historia(500);
  return magazyn.scenariusze().map((s) => ({
    ...s,
    ostatnieUruchomienie: hist.find((h) => h.scenariusz === s.id)?.start || st.ostatnieUruchomienie[s.id] || null
  }));
}));

app.put('/api/scenariusze/:id', obsluz((req) => {
  const obecny = magazyn.scenariusz(req.params.id);
  if (!obecny) throw new Error('Nie ma takiego scenariusza');
  const { wlaczony, godzina, kroki } = req.body;
  const nowy = { ...obecny };
  if (typeof wlaczony === 'boolean') nowy.wlaczony = wlaczony;
  if (godzina !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(godzina)) throw new Error('Godzina w formacie GG:MM, np. 08:00');
    nowy.harmonogram = { ...nowy.harmonogram, godzina };
  }
  if (kroki !== undefined) {
    const bledy = sprawdzKroki(kroki);
    if (bledy.length) throw new Error('Nie zapisano. ' + bledy.join(' '));
    nowy.kroki = kroki;
  }
  magazyn.zapiszScenariusz(nowy);
  return nowy;
}));

app.post('/api/scenariusze/:id/uruchom', obsluz((req) => {
  const tryb = req.body?.tryb; // 'podglad' albo brak (= tryb z ustawień)
  if (tryb && tryb !== 'podglad') throw new Error('Z panelu można wymusić tylko podgląd');
  return wykonaj(req.params.id, { tryb, zrodlo: 'ręcznie' });
}));

// ---------- ustawienia ----------
app.put('/api/ustawienia', obsluz((req) => {
  const { tryb, adresTestowy, nadawca, podpis, maksMailiNaPrzebieg, smtp } = req.body;
  return magazyn.zapiszUstawienia({ tryb, adresTestowy, nadawca, podpis, maksMailiNaPrzebieg, smtp });
}));

// ---------- połączenia ----------
app.put('/api/polaczenia/google', obsluz((req) => {
  const klucz = String(req.body.klucz || '').trim();
  let json;
  try { json = JSON.parse(klucz); } catch { throw new Error('To nie jest poprawny klucz — wklej całą zawartość pliku .json (od { do }).'); }
  if (!json.client_email || !json.private_key) throw new Error('To nie wygląda na klucz konta technicznego Google (brak client_email / private_key).');
  magazyn.zapiszSekret('kluczGoogle', klucz);
  return magazyn.stanSekretow();
}));

app.post('/api/polaczenia/google/sprawdz', obsluz(async (req) => {
  const s = magazyn.scenariusze().flatMap((x) => x.kroki).find((k) => k.typ === 'arkusz.czytaj');
  if (!s) throw new Error('Żaden scenariusz nie czyta arkusza');
  const g = polaczenieGoogle(magazyn.sekrety().kluczGoogle);
  const dane = await g.czytaj(s.arkusz, s.zakladka);
  return { komunikat: `Działa. Zakładka „${s.zakladka}”: ${dane.wiersze.length} wierszy, ${dane.naglowki.filter(Boolean).length} kolumn.` };
}));

app.put('/api/polaczenia/poczta', obsluz((req) => {
  const haslo = String(req.body.haslo || '');
  if (!haslo) throw new Error('Wpisz hasło');
  magazyn.zapiszSekret('hasloSmtp', haslo);
  return magazyn.stanSekretow();
}));

app.post('/api/polaczenia/poczta/sprawdz', obsluz(async () => {
  const u = magazyn.ustawienia();
  if (!u.adresTestowy) throw new Error('Najpierw wpisz adres testowy w Ustawieniach — tam wyślę mail próbny.');
  const p = polaczeniePoczty(u.smtp, magazyn.sekrety().hasloSmtp);
  await p.sprawdz();
  await p.wyslij({
    od: u.nadawca, do: u.adresTestowy, temat: 'Automatyzator — mail próbny',
    html: 'To jest mail próbny z Automatyzatora. Jeśli go widzisz, poczta działa.<br><br>' + u.podpis,
    tekst: 'To jest mail próbny z Automatyzatora. Jeśli go widzisz, poczta działa.'
  });
  return { komunikat: `Działa. Mail próbny wysłany na ${u.adresTestowy}.` };
}));

// ---------- historia ----------
app.get('/api/historia', obsluz(() => magazyn.historia(200)));

app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  Automatyzator działa.');
  console.log(`  Otwórz w przeglądarce:  http://localhost:${PORT}`);
  console.log('  Nie zamykaj tego okna — zamknięcie wyłącza program.');
  console.log('');
  startHarmonogramu();
});
