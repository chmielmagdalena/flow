# Automatyzator

Własny odpowiednik Make dla biura rachunkowego Tax Polonica. Działa na komputerze
z Windows, otwiera się w przeglądarce (http://localhost:3030). Później można go
przenieść na serwer w chmurze bez przepisywania.

> **Jak uruchomić:** przeczytaj [`INSTRUKCJA.md`](INSTRUKCJA.md) (**DO PRZECZYTANIA**).

## Co robi dziś (etap 1)

Zastępuje dwa scenariusze z Make, opisane w repozytorium `kurs-mailing-platforma`,
plik `PRZEKAZANIE-PRZEPLYWY-BETTERFLY.md`:

| Scenariusz | Kiedy | Co |
|---|---|---|
| **A – termin zatwierdzenia w Betterfly** | codziennie 08:00 | klienci z `Comarch Betterfly = tak`, którym za 2 dni mija dzień z umowy, dostają przypomnienie |
| **B – kwoty do zapłaty** | codziennie 18:00 | wiersze z `Treść maila` i `Zatwierdzone = tak`, zgrupowane po adresie e-mail → jeden mail na klienta → odznaczenie w arkuszu |

Zasada bez zmian: **cała logika jest w arkuszu Google, program jest posłańcem.**

## Czym różni się od Make

- **Trzy tryby:** podgląd (nic nie wysyła), test (wszystko na adres testowy, arkusz nietknięty), na żywo.
- **Kolumny po nazwach, nie po literach.** Dodanie kolumny w środku arkusza niczego nie psuje. Zmiana nagłówka zatrzymuje program, zanim cokolwiek wyśle.
- **Odznacza tylko to, co naprawdę poszło.** W Make moduł 5 odznaczał wszystkie wiersze z danym adresem i treścią — także niezatwierdzone firmy tego samego klienta. Tu odznaczane są wyłącznie wiersze, które były w wysłanym mailu.
- **Odznacza zaraz po każdym mailu.** Jeśli mail wyjdzie, a zapis do arkusza się nie uda, program zatrzymuje cały przebieg i mówi, które wiersze odznaczyć ręcznie.
- **Bezpiecznik:** limit maili na jeden przebieg (domyślnie 60).
- **Historia:** każda wysyłka zapisana z treścią — kto, kiedy, co.
- Bez limitu scenariuszy i operacji.

## Budowa (dla AI i programisty)

```
src/
  silnik.js       wykonuje scenariusz krok po kroku (arkusz.czytaj, filtr, grupuj, mail.wyslij, arkusz.zapisz)
  szablon.js      {{Kolumna}}, {{{Kolumna bez zabezpieczania}}}, {{data(+2)}}, {{dzien(+2)}}, {{#wiersze}}…{{/wiersze}}
  arkusz.js       Google Sheets API (konto techniczne, FORMATTED_VALUE do odczytu, RAW do zapisu)
  poczta.js       SMTP home.pl (587, STARTTLS) przez nodemailer
  harmonogram.js  co 20 s sprawdza godziny; każdy scenariusz najwyżej raz dziennie
  wykonawca.js    łączy silnik z magazynem i zapisuje historię
  magazyn.js      pliki JSON w %USERPROFILE%\Automatyzator-dane
  serwer.js       panel + API, tylko 127.0.0.1:3030
panel/            ZBUDOWANY panel FLOW (React, wygląd z Lovable) — nie edytować ręcznie, patrz niżej
scenariusze-domyslne/  A.json, B.json — kopiowane do danych przy pierwszym uruchomieniu
test/test.js      testy na zmyślonych danych: npm test
```

Scenariusz to plik JSON z listą kroków — ten sam format będzie zapisywał edytor bloczków (etap 2).

## Panel (wygląd)

Wygląd powstaje w Lovable, w repozytorium **`tax-polonica-automatyzator`**. W Lovable działa
na danych przykładowych; tu — na prawdziwym programie. Po zmianach w Lovable:

```
# w repozytorium tax-polonica-automatyzator
npm run build:panel          # → folder dist-panel
# zawartość dist-panel skopiować do flow/panel (zastąpić całość)
```

Edytor bloczków zapisuje scenariusz przez `PUT /api/scenariusze/:id`. Serwer sprawdza go
(`sprawdzKroki` w `silnik.js`) i odrzuca z polskim komunikatem, jeśli np. „Zapisz w arkuszu”
stoi przed „Wyślij mail”.

## Etapy

1. ✅ Silnik, scenariusze A i B, panel, tryby, historia — **na komputerze**
2. ✅ Wygląd FLOW z Lovable + edytor bloczków na płótnie (przeciąganie, panel ustawień)
3. ⬜ Przeniesienie na serwer w chmurze (wtedy działa przy wyłączonym komputerze)
