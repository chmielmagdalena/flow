// Czas zawsze liczymy w strefie Europe/Warsaw, niezależnie od ustawień komputera.
const STREFA = 'Europe/Warsaw';

function czesci(data = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: STREFA, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const p = Object.fromEntries(f.formatToParts(data).map((x) => [x.type, x.value]));
  return { rok: Number(p.year), miesiac: Number(p.month), dzien: Number(p.day), godzina: `${p.hour}:${p.minute}` };
}

/** Data w Warszawie przesunięta o `dni` dni: { rok, miesiac, dzien } */
export function dataZaDni(dni = 0, teraz = new Date()) {
  const c = czesci(teraz);
  const d = new Date(Date.UTC(c.rok, c.miesiac - 1, c.dzien + Number(dni)));
  return { rok: d.getUTCFullYear(), miesiac: d.getUTCMonth() + 1, dzien: d.getUTCDate() };
}

export function formatujDate({ rok, miesiac, dzien }) {
  return `${String(dzien).padStart(2, '0')}.${String(miesiac).padStart(2, '0')}.${rok}`;
}

/** "2026-10-20" — klucz dnia do pilnowania, żeby scenariusz nie ruszył dwa razy tego samego dnia */
export function kluczDnia(teraz = new Date()) {
  const c = czesci(teraz);
  return `${c.rok}-${String(c.miesiac).padStart(2, '0')}-${String(c.dzien).padStart(2, '0')}`;
}

/** "18:00" */
export function godzinaTeraz(teraz = new Date()) {
  return czesci(teraz).godzina;
}
