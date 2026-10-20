// SILNIK — wykonuje scenariusz krok po kroku, tak jak Make wykonuje moduły.
//
// Kroki "zbiorcze" działają na całej liście wierszy:
//   arkusz.czytaj  — pobierz wiersze z zakładki
//   filtr          — zostaw tylko wiersze spełniające wszystkie warunki
//   grupuj         — połącz wiersze o tym samym adresie (jeden klient = jeden mail)
// Kroki "na element" wykonują się po kolei dla każdego maila:
//   mail.wyslij    — wyślij mail
//   arkusz.zapisz  — zaraz po udanej wysyłce odznacz w arkuszu, co poszło
//
// Trzy tryby:
//   podglad  — nic nie wysyła, nic nie zapisuje; pokazuje, co by poszło
//   test     — wysyła wszystko na adres testowy; NIE odznacza arkusza
//   na_zywo  — wysyła do klientów i odznacza arkusz
import { wypelnij, htmlNaTekst } from './szablon.js';

const KROKI_ZBIORCZE = new Set(['arkusz.czytaj', 'filtr', 'grupuj']);
const KROKI_NA_ELEMENT = new Set(['mail.wyslij', 'arkusz.zapisz']);

export const OPISY_KROKOW = {
  'arkusz.czytaj': 'Odczytaj arkusz',
  filtr: 'Filtr',
  grupuj: 'Grupuj',
  'mail.wyslij': 'Wyślij mail',
  'arkusz.zapisz': 'Zapisz w arkuszu'
};

const POPRAWNY_ADRES = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

function normalizuj(t) {
  return String(t ?? '').trim().toLowerCase();
}

function porownaj(a, b) {
  const x = String(a ?? '').trim().replace(',', '.');
  const y = String(b ?? '').trim().replace(',', '.');
  if (x !== '' && y !== '' && !isNaN(Number(x)) && !isNaN(Number(y))) return Number(x) === Number(y);
  return normalizuj(a) === normalizuj(b);
}

function spelnia(pola, warunek, teraz) {
  const v = pola[warunek.pole];
  const oczekiwane = wypelnij(warunek.wartosc ?? '', pola, { html: false, teraz });
  switch (warunek.op) {
    case 'niepuste': return String(v ?? '').trim() !== '';
    case 'puste': return String(v ?? '').trim() === '';
    case 'rowne': return porownaj(v, oczekiwane);
    case 'rozne': return !porownaj(v, oczekiwane);
    case 'zawiera': return normalizuj(v).includes(normalizuj(oczekiwane));
    default: throw new Error(`Nieznany warunek "${warunek.op}" w polu ${warunek.pole}`);
  }
}

/**
 * Sprawdza scenariusz zapisany z edytora, ZANIM trafi na dysk.
 * Zwraca listę problemów po polsku (pusta = w porządku).
 */
export function sprawdzKroki(kroki) {
  const bledy = [];
  if (!Array.isArray(kroki) || !kroki.length) return ['Scenariusz nie ma żadnego bloczka.'];
  const OPS = ['rowne', 'rozne', 'zawiera', 'niepuste', 'puste'];
  const pusty = (t) => typeof t !== 'string' || !t.trim();
  let bylaWysylka = false;
  kroki.forEach((k, i) => {
    const nr = `Bloczek ${i + 1} (${OPISY_KROKOW[k?.typ] || k?.typ || '?'})`;
    if (!k || typeof k !== 'object') { bledy.push(`Bloczek ${i + 1} jest uszkodzony.`); return; }
    if (KROKI_ZBIORCZE.has(k.typ) && bylaWysylka) bledy.push(`${nr}: musi stać przed „Wyślij mail”.`);
    switch (k.typ) {
      case 'arkusz.czytaj':
        if (i !== 0) bledy.push(`${nr}: „Odczytaj arkusz” musi być pierwszym bloczkiem.`);
        if (pusty(k.arkusz)) bledy.push(`${nr}: brak ID arkusza.`);
        if (pusty(k.zakladka)) bledy.push(`${nr}: brak nazwy zakładki.`);
        break;
      case 'filtr':
        if (!Array.isArray(k.warunki) || !k.warunki.length) bledy.push(`${nr}: brak warunków.`);
        else k.warunki.forEach((w, j) => {
          if (pusty(w?.pole)) bledy.push(`${nr}, warunek ${j + 1}: wpisz nazwę kolumny.`);
          if (!OPS.includes(w?.op)) bledy.push(`${nr}, warunek ${j + 1}: nieznany warunek.`);
        });
        break;
      case 'grupuj':
        if (pusty(k.pole)) bledy.push(`${nr}: wpisz kolumnę, po której grupować.`);
        break;
      case 'mail.wyslij':
        bylaWysylka = true;
        if (pusty(k.do)) bledy.push(`${nr}: brak adresata (np. {{Email}}).`);
        if (pusty(k.temat)) bledy.push(`${nr}: brak tematu.`);
        if (pusty(k.tresc)) bledy.push(`${nr}: brak treści.`);
        break;
      case 'arkusz.zapisz':
        if (!bylaWysylka) bledy.push(`${nr}: „Zapisz w arkuszu” musi stać za „Wyślij mail” — odznaczamy tylko to, co poszło.`);
        if (!k.pola || typeof k.pola !== 'object' || !Object.keys(k.pola).length) bledy.push(`${nr}: brak kolumn do zapisania.`);
        break;
      default:
        bledy.push(`${nr}: nieznany rodzaj bloczka.`);
    }
  });
  if (kroki[0]?.typ !== 'arkusz.czytaj') bledy.unshift('Pierwszym bloczkiem po harmonogramie musi być „Odczytaj arkusz”.');
  return [...new Set(bledy)];
}

/** Zbiera wszystkie nazwy kolumn, których scenariusz używa — żeby sprawdzić je ZANIM cokolwiek wyślemy. */
function uzywaneKolumny(kroki) {
  const nazwy = new Set();
  const zSzablonu = (t) => {
    for (const m of String(t ?? '').matchAll(/\{\{\{?\s*([^#/{}][^}]*?)\s*\}?\}\}/g)) {
      const n = m[1].trim();
      if (!/^(data|dzien)\(/.test(n) && !['klucz', 'podpis'].includes(n)) nazwy.add(n);
    }
  };
  for (const k of kroki) {
    if (k.typ === 'filtr') for (const w of k.warunki || []) { nazwy.add(w.pole); zSzablonu(w.wartosc); }
    if (k.typ === 'grupuj') nazwy.add(k.pole);
    if (k.typ === 'mail.wyslij') { zSzablonu(k.do); zSzablonu(k.temat); zSzablonu(k.tresc); if (k.etykieta) nazwy.add(k.etykieta); }
    if (k.typ === 'arkusz.zapisz') for (const [cel, wart] of Object.entries(k.pola || {})) { nazwy.add(cel); zSzablonu(wart); }
  }
  return [...nazwy];
}

/**
 * Uruchamia scenariusz.
 * @param {object} scenariusz
 * @param {object} o { tryb, zrodlo, ustawienia, arkusz (połączenie), poczta (połączenie), teraz }
 */
export async function uruchom(scenariusz, o) {
  const { tryb, ustawienia: u, teraz = new Date() } = o;
  const raport = {
    scenariusz: scenariusz.id,
    nazwa: scenariusz.nazwa,
    tryb,
    zrodlo: o.zrodlo || 'ręcznie',
    start: new Date().toISOString(),
    status: 'ok',
    komunikat: '',
    przeczytano: 0,
    poFiltrze: 0,
    maile: []
  };

  const kroki = scenariusz.kroki || [];
  const zbiorcze = [];
  const naElement = [];
  for (const k of kroki) {
    if (KROKI_ZBIORCZE.has(k.typ)) {
      if (naElement.length) throw new Error(`Krok "${k.typ}" musi stać przed wysyłką maili`);
      zbiorcze.push(k);
    } else if (KROKI_NA_ELEMENT.has(k.typ)) naElement.push(k);
    else throw new Error(`Nieznany krok "${k.typ}"`);
  }

  try {
    // ---------- kroki zbiorcze ----------
    let elementy = [];
    let tabela = null;
    for (const k of zbiorcze) {
      if (k.typ === 'arkusz.czytaj') {
        const dane = await o.arkusz.czytaj(k.arkusz, k.zakladka);
        tabela = { arkusz: k.arkusz, zakladka: k.zakladka, naglowki: dane.naglowki };
        elementy = dane.wiersze.map((w) => ({ pola: w.pola, wiersze: [w] }));
        raport.przeczytano = elementy.length;

        const brak = uzywaneKolumny(kroki).filter((n) => !dane.naglowki.includes(n));
        if (brak.length) {
          throw new Error(`W zakładce "${k.zakladka}" nie ma kolumn: ${brak.map((b) => `"${b}"`).join(', ')}. ` +
            'Sprawdź, czy ktoś nie zmienił nagłówka w wierszu 1. Nic nie zostało wysłane.');
        }
        const powtorzone = dane.naglowki.filter((n, i) => n && dane.naglowki.indexOf(n) !== i);
        if (powtorzone.length) throw new Error(`Powtórzone nagłówki w arkuszu: ${[...new Set(powtorzone)].join(', ')}. Nic nie zostało wysłane.`);
      } else if (k.typ === 'filtr') {
        elementy = elementy.filter((e) => (k.warunki || []).every((w) => spelnia(e.pola, w, teraz)));
        raport.poFiltrze = elementy.length;
      } else if (k.typ === 'grupuj') {
        const grupy = new Map();
        for (const e of elementy) {
          const klucz = normalizuj(e.pola[k.pole]);
          if (!grupy.has(klucz)) grupy.set(klucz, { pola: { ...e.pola, klucz: String(e.pola[k.pole]).trim() }, wiersze: [] });
          grupy.get(klucz).wiersze.push(...e.wiersze);
        }
        elementy = [...grupy.values()];
      }
    }

    // ---------- bezpiecznik ----------
    const ileMaili = naElement.some((k) => k.typ === 'mail.wyslij') ? elementy.length : 0;
    if (tryb !== 'podglad' && ileMaili > u.maksMailiNaPrzebieg) {
      throw new Error(`Ten przebieg wysłałby ${ileMaili} maili, a bezpiecznik pozwala na ${u.maksMailiNaPrzebieg}. ` +
        'Nic nie zostało wysłane. Sprawdź filtr albo podnieś limit w Ustawieniach.');
    }
    if (tryb === 'test' && !POPRAWNY_ADRES.test(u.adresTestowy || '')) {
      throw new Error('Tryb testowy: wpisz w Ustawieniach adres testowy, na który mają iść maile.');
    }

    // ---------- kroki na element ----------
    for (const e of elementy) {
      const mail = { do: '', temat: '', tresc: '', firmy: [], status: 'podglad', blad: '', zapisano: false };
      let wyslano = false;

      for (const k of naElement) {
        if (k.typ === 'mail.wyslij') {
          const kontekst = { ...e.pola, podpis: u.podpis };
          const brakujace = [];
          mail.do = wypelnij(k.do, kontekst, { html: false, teraz, brakujace }).trim();
          mail.temat = wypelnij(k.temat, kontekst, { html: false, teraz, brakujace });
          mail.tresc = wypelnij(k.tresc, kontekst, { wiersze: e.wiersze.map((w) => w.pola), teraz, brakujace });
          mail.firmy = e.wiersze.map((w) => w.pola[k.etykieta || 'Nazwa firmy'] || `wiersz ${w.wiersz}`);
          mail.wiersze = e.wiersze.map((w) => w.wiersz);

          if (!POPRAWNY_ADRES.test(mail.do)) {
            mail.status = 'blad';
            mail.blad = `Niepoprawny adres e-mail: "${mail.do}"`;
            break;
          }
          if (tryb === 'podglad') break; // w podglądzie dalej nie idziemy

          const adresat = tryb === 'test' ? u.adresTestowy : mail.do;
          const temat = tryb === 'test' ? `[TEST → ${mail.do}] ${mail.temat}` : mail.temat;
          try {
            await o.poczta.wyslij({ od: u.nadawca, do: adresat, temat, html: mail.tresc, tekst: htmlNaTekst(mail.tresc) });
            mail.status = 'wyslano';
            mail.wyslanoNa = adresat;
            wyslano = true;
          } catch (err) {
            mail.status = 'blad';
            mail.blad = 'Wysyłka nie powiodła się: ' + err.message;
            break;
          }
        }

        if (k.typ === 'arkusz.zapisz') {
          if (tryb !== 'na_zywo' || !wyslano) continue; // odznaczamy TYLKO to, co naprawdę poszło do klienta
          const zmiany = [];
          for (const w of e.wiersze) {
            for (const [cel, szablon] of Object.entries(k.pola || {})) {
              zmiany.push({
                wiersz: w.wiersz,
                kolumna: tabela.naglowki.indexOf(cel),
                wartosc: wypelnij(szablon, w.pola, { html: false, teraz })
              });
            }
          }
          try {
            await o.arkusz.zapisz(tabela.arkusz, tabela.zakladka, zmiany);
            mail.zapisano = true;
          } catch (err) {
            // Mail poszedł, ale arkusz nie został odznaczony — następny przebieg wysłałby go drugi raz.
            // Dlatego zatrzymujemy cały przebieg i głośno o tym mówimy.
            mail.blad = 'Mail wysłany, ale NIE udało się odznaczyć arkusza: ' + err.message;
            raport.maile.push(mail);
            throw new Error(`Mail do ${mail.do} wyszedł, ale arkusz nie został odznaczony. ` +
              `Przebieg zatrzymany. Zanim uruchomisz ponownie, wpisz ręcznie "nie" w kolumnie Zatwierdzone ` +
              `w wierszach: ${mail.wiersze.join(', ')}.`);
          }
        }
      }
      raport.maile.push(mail);
    }

    const bledy = raport.maile.filter((m) => m.status === 'blad').length;
    if (bledy) {
      raport.status = 'czesciowo';
      raport.komunikat = `${bledy} z ${raport.maile.length} maili nie wyszło — szczegóły poniżej.`;
    } else if (!raport.maile.length) {
      raport.komunikat = 'Nie było nic do wysłania.';
    } else {
      raport.komunikat = tryb === 'podglad'
        ? `Do wysłania: ${raport.maile.length}.`
        : `Wysłano: ${raport.maile.length}${tryb === 'test' ? ' (na adres testowy)' : ''}.`;
    }
  } catch (err) {
    raport.status = 'blad';
    raport.komunikat = err.message;
  }

  raport.koniec = new Date().toISOString();
  return raport;
}
