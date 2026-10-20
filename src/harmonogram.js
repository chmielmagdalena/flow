// Harmonogram: co 20 sekund sprawdza, czy któryś scenariusz ma teraz swoją godzinę.
// Każdy scenariusz rusza najwyżej raz dziennie o swojej godzinie.
// Jeśli komputer był wyłączony o tej godzinie — tego dnia scenariusz nie ruszy (tak samo jak w Make).
import * as magazyn from './magazyn.js';
import { wykonaj } from './wykonawca.js';
import { godzinaTeraz, kluczDnia } from './czas.js';

export function startHarmonogramu(dziennik = console.log) {
  async function sprawdz() {
    const teraz = new Date();
    const godzina = godzinaTeraz(teraz);
    const dzien = kluczDnia(teraz);
    for (const s of magazyn.scenariusze()) {
      if (!s.wlaczony || s.harmonogram?.godzina !== godzina) continue;
      const st = magazyn.stan();
      if (st.ostatnieUruchomienie[s.id] === dzien) continue;
      st.ostatnieUruchomienie[s.id] = dzien; // zapisujemy PRZED startem — nie ruszy drugi raz nawet po błędzie
      magazyn.zapiszStan(st);
      dziennik(`[${godzina}] Uruchamiam z harmonogramu: ${s.nazwa}`);
      try {
        const r = await wykonaj(s.id, { zrodlo: 'harmonogram' });
        dziennik(`[${godzinaTeraz()}] ${s.nazwa}: ${r.komunikat}`);
      } catch (e) {
        dziennik(`[${godzinaTeraz()}] ${s.nazwa}: BŁĄD ${e.message}`);
      }
    }
  }
  sprawdz();
  return setInterval(sprawdz, 20000);
}
