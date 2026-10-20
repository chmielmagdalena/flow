# Kontekst projektu: Automatyzator (repozytorium `flow`)

## Kim jest użytkowniczka
Magdalena — księgowa, właścicielka biura rachunkowego Tax Polonica sp. z o.o. **Nie programuje.**
Odpowiadaj po polsku, prostym językiem, krok po kroku.

## Co budujemy
Własny odpowiednik Make, na razie **tylko dla niej**, uruchamiany na jej komputerze z **Windows**,
później przeniesiony na serwer. Decyzja z 20 października 2026: zamiast płacić za serwer z n8n
(darmowy Make wystarczał na dwa scenariusze) — własny program, najpierw lokalnie.

Pierwsze zadanie: zastąpić scenariusze A i B z Make. Źródło prawdy o ich działaniu:
`kurs-mailing-platforma/PRZEKAZANIE-PRZEPLYWY-BETTERFLY.md` (gałąź
`claude/betterfly-invoice-reminder-agent-eueka4`, PR #33).

## Zasady, których nie wolno złamać
- **Logika zostaje w arkuszu Google.** Program czyta, filtruje, wysyła, odznacza.
- **Kolumny mapujemy po nazwie nagłówka**, nigdy po literze.
- **Odznaczamy tylko wiersze, które faktycznie były w wysłanym mailu**, zaraz po wysyłce.
- **Domyślny tryb to test.** Na żywo dopiero po wyłączeniu scenariuszy w Make — inaczej podwójne maile.
- **Nie budujemy serwera poczty** — wysyłka przez SMTP home.pl (`biuro@taxpolonica.pl`).
- **Hasła i klucze nigdy w repozytorium ani w czacie.** Wpisuje je w panelu; leżą w `%USERPROFILE%\Automatyzator-dane`.
- **Do repozytorium nie trafiają dane klientów.** Testy używają zmyślonych firm i adresów @example.com.

## Gałęzie i PR
Etap budowy albo większa zmiana → osobna gałąź + PR, opis po polsku: co i dlaczego.
Nie scalaj sama — decyzja należy do Magdaleny. Przy każdym odnośniku napisz, co z nim zrobić
(`.md` = DO PRZECZYTANIA). Podawaj bezpośredni link do pliku na gałęzi roboczej.

## Dziennik pracy — obowiązkowy
Każdą sesję dopisuj do `DZIENNIK-PRACY.md`: czynności po kolei, udane i nieudane, a osobno
**własne pomyłki AI** (objaw, przyczyna, naprawa, wniosek). Plik służy szkoleniu „jak budować
aplikacje z AI” i pracy doktorskiej.

## Stan
Etap 1 i wygląd FLOW z edytorem płótna gotowe w kodzie i testach (`npm test`),
**nieuruchomione jeszcze na jej komputerze**.

⚠️ `panel/` jest **zbudowany** z repozytorium `tax-polonica-automatyzator` (Lovable,
`npm run build:panel`). Nie edytuj go ręcznie — zmiany zrób tam i przebuduj.
Lovable ma swoją nazwę „FLOW” i limonkowy akcent — to decyzja Magdaleny, nie zmieniaj.
