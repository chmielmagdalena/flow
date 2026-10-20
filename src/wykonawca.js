// Spina silnik z magazynem i połączeniami: uruchom scenariusz, zapisz w historii.
import * as magazyn from './magazyn.js';
import { uruchom } from './silnik.js';
import { polaczenieGoogle } from './arkusz.js';
import { polaczeniePoczty } from './poczta.js';

const trwa = new Set(); // żeby ten sam scenariusz nie ruszył dwa razy jednocześnie

export async function wykonaj(id, { tryb, zrodlo }) {
  const s = magazyn.scenariusz(id);
  if (!s) throw new Error(`Nie ma scenariusza ${id}`);
  if (trwa.has(id)) throw new Error(`Scenariusz ${id} właśnie się wykonuje — poczekaj chwilę.`);
  trwa.add(id);
  try {
    const u = magazyn.ustawienia();
    const sek = magazyn.sekrety();
    const trybFaktyczny = tryb || u.tryb;
    let raport;
    try {
      const arkusz = polaczenieGoogle(sek.kluczGoogle);
      const poczta = trybFaktyczny === 'podglad'
        ? { wyslij: async () => { throw new Error('podgląd nie wysyła'); } }
        : polaczeniePoczty(u.smtp, sek.hasloSmtp);
      raport = await uruchom(s, { tryb: trybFaktyczny, zrodlo, ustawienia: u, arkusz, poczta });
    } catch (err) {
      raport = {
        scenariusz: s.id, nazwa: s.nazwa, tryb: trybFaktyczny, zrodlo,
        start: new Date().toISOString(), koniec: new Date().toISOString(),
        status: 'blad', komunikat: err.message, maile: []
      };
    }
    if (trybFaktyczny !== 'podglad') magazyn.dopiszHistorie(raport);
    return raport;
  } finally {
    trwa.delete(id);
  }
}
