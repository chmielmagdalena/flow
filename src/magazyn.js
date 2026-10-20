// Magazyn: wszystko, co program pamięta, leży w folderze "dane" jako zwykłe pliki.
// Ustawienia, scenariusze, hasła i historia. Folder nie trafia do GitHuba.
// Leży POZA folderem programu (domyślnie C:\\Users\\<Ty>\\Automatyzator-dane), więc nową wersję
// programu można po prostu rozpakować w miejsce starej — dane zostają.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FOLDER_DANYCH = process.env.AUTOMATYZATOR_DANE || path.join(os.homedir(), 'Automatyzator-dane');
const FOLDER_SCENARIUSZY = path.join(FOLDER_DANYCH, 'scenariusze');
const DOMYSLNE_SCENARIUSZE = path.join(KORZEN, 'scenariusze-domyslne');

const PLIK_USTAWIEN = path.join(FOLDER_DANYCH, 'ustawienia.json');
const PLIK_SEKRETOW = path.join(FOLDER_DANYCH, 'sekrety.json');
const PLIK_HISTORII = path.join(FOLDER_DANYCH, 'historia.jsonl');
const PLIK_STANU = path.join(FOLDER_DANYCH, 'stan.json');

const DOMYSLNE_USTAWIENIA = {
  // "test" = wszystkie maile idą na adres testowy, nic nie jest odznaczane w arkuszu.
  // "na_zywo" = maile idą do klientów, arkusz jest odznaczany.
  tryb: 'test',
  adresTestowy: '',
  nadawca: 'Tax Polonica <biuro@taxpolonica.pl>',
  podpis: 'Z poważaniem<br>Biuro Rachunkowe Tax Polonica<br>biuro@taxpolonica.pl',
  // Bezpiecznik: jeśli jeden przebieg miałby wysłać więcej maili, program przerywa.
  maksMailiNaPrzebieg: 60,
  smtp: {
    host: 'clickweb1622315.home.pl',
    port: 587,
    uzytkownik: 'biuro@taxpolonica.pl'
  }
};

function czytajJson(plik, domyslne) {
  try {
    return JSON.parse(fs.readFileSync(plik, 'utf8'));
  } catch {
    return domyslne;
  }
}

function zapiszJson(plik, dane) {
  const tymczasowy = plik + '.tmp';
  fs.writeFileSync(tymczasowy, JSON.stringify(dane, null, 2), 'utf8');
  fs.renameSync(tymczasowy, plik); // zapis "wszystko albo nic"
}

export function przygotuj() {
  fs.mkdirSync(FOLDER_SCENARIUSZY, { recursive: true });
  // Przy pierwszym uruchomieniu kopiujemy scenariusze A i B.
  if (fs.readdirSync(FOLDER_SCENARIUSZY).length === 0) {
    for (const plik of fs.readdirSync(DOMYSLNE_SCENARIUSZE)) {
      fs.copyFileSync(path.join(DOMYSLNE_SCENARIUSZE, plik), path.join(FOLDER_SCENARIUSZY, plik));
    }
  }
  if (!fs.existsSync(PLIK_USTAWIEN)) zapiszJson(PLIK_USTAWIEN, DOMYSLNE_USTAWIENIA);
}

// ---------- ustawienia ----------
export function ustawienia() {
  const u = czytajJson(PLIK_USTAWIEN, {});
  return { ...DOMYSLNE_USTAWIENIA, ...u, smtp: { ...DOMYSLNE_USTAWIENIA.smtp, ...(u.smtp || {}) } };
}
export function zapiszUstawienia(nowe) {
  const obecne = ustawienia();
  const wynik = { ...obecne, ...nowe, smtp: { ...obecne.smtp, ...(nowe.smtp || {}) } };
  if (!['test', 'na_zywo'].includes(wynik.tryb)) wynik.tryb = 'test';
  wynik.smtp.port = Number(wynik.smtp.port) || 587;
  wynik.maksMailiNaPrzebieg = Number(wynik.maksMailiNaPrzebieg) || 60;
  zapiszJson(PLIK_USTAWIEN, wynik);
  return wynik;
}

// ---------- sekrety (hasło SMTP, klucz Google) — nigdy nie wracają do przeglądarki ----------
export function sekrety() {
  return czytajJson(PLIK_SEKRETOW, {});
}
export function zapiszSekret(nazwa, wartosc) {
  const s = sekrety();
  s[nazwa] = wartosc;
  zapiszJson(PLIK_SEKRETOW, s);
}
export function stanSekretow() {
  const s = sekrety();
  let kontoGoogle = null;
  try {
    kontoGoogle = s.kluczGoogle ? JSON.parse(s.kluczGoogle).client_email : null;
  } catch { /* zły klucz */ }
  return { hasloSmtp: Boolean(s.hasloSmtp), kluczGoogle: Boolean(s.kluczGoogle), kontoGoogle };
}

// ---------- scenariusze ----------
export function scenariusze() {
  return fs.readdirSync(FOLDER_SCENARIUSZY)
    .filter((p) => p.endsWith('.json'))
    .map((p) => czytajJson(path.join(FOLDER_SCENARIUSZY, p), null))
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));
}
export function scenariusz(id) {
  return scenariusze().find((s) => s.id === id) || null;
}
export function zapiszScenariusz(s) {
  if (!/^[A-Za-z0-9_-]+$/.test(s.id)) throw new Error('Niedozwolony identyfikator scenariusza');
  zapiszJson(path.join(FOLDER_SCENARIUSZY, s.id + '.json'), s);
}

// ---------- stan harmonogramu (kiedy co ostatnio ruszyło) ----------
export function stan() {
  return czytajJson(PLIK_STANU, { ostatnieUruchomienie: {} });
}
export function zapiszStan(s) {
  zapiszJson(PLIK_STANU, s);
}

// ---------- historia ----------
export function dopiszHistorie(wpis) {
  fs.appendFileSync(PLIK_HISTORII, JSON.stringify(wpis) + '\n', 'utf8');
}
export function historia(limit = 200) {
  if (!fs.existsSync(PLIK_HISTORII)) return [];
  const linie = fs.readFileSync(PLIK_HISTORII, 'utf8').split('\n').filter(Boolean);
  return linie.slice(-limit).reverse().map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}
