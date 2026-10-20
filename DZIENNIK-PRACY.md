# Dziennik pracy — Automatyzator

## 20 października 2026 — decyzja i etap 1

### Jak doszło do decyzji
1. Pytanie: czy da się zbudować własne Make/n8n i ile to potrwa. AI: pełny klon — nie; wąskie narzędzie — tak.
2. Zakres ustalony: tylko dla Magdaleny; dwa procesy (przypomnienie o zatwierdzeniu dokumentów w Betterfly, kwoty do zapłaty); ma się dać klikać jak w Make; dane z arkusza Google.
3. AI szukało w historii rozmów „agenta przypominającego” — nie znalazło. Magdalena podała PR #33 w `kurs-mailing-platforma`; tam był gotowy plik przekazania `PRZEKAZANIE-PRZEPLYWY-BETTERFLY.md`.
4. AI zaproponowało serwer VPS z n8n na Hostingerze (ok. 25 zł/mies. w promocji).
5. **Magdalena: „bez sensu — mam płacić za serwer, a Make mam za darmo”.** Miała rację: darmowy Make (2 scenariusze, 1000 operacji) pokrywa jej dwa scenariusze.
6. Magdalena doprecyzowała: chce własny program, zbudowany na jej komputerze, przeniesiony na serwer dopiero, gdy zadziała. System: Windows. Repozytorium: `flow`.

### Własne pomyłki AI
- **Odpowiedź na pytanie, którego nie zadano.** Pytanie brzmiało „czy da się na Hostingerze”, a AI od razu przeszło do zakupu serwera i wyboru planu, nie porównując z tym, co już działa za darmo. Wniosek: przed propozycją wydatku porównać z obecnym kosztem (tu: zero).
- **„Zostajemy przy Make” zabrzmiało jak odmowa pomocy.** Magdalena zapytała: „czy mam rozumieć, że nie pomożesz mi zrobić takiego programu?”. AI wyciągnęło wniosek kosztowy („nie płać za serwer”) i potraktowało go jak wniosek o całym projekcie. Wniosek: oddzielać „to rozwiązanie jest za drogie” od „nie róbmy tego”.
- Szacunek zużycia operacji w Make (500–700/mies.) jest **wyliczony z głowy, niezmierzony** — trzeba sprawdzić licznik w Make.

### Etap 1 — co zbudowano
- Odczytano z arkusza **tylko wiersz nagłówków** zakładki `Klienci` (60 kolumn, A–BH), żeby mapować po nazwach. Danych klientów nie odczytywano.
- Silnik kroków: `arkusz.czytaj → filtr → grupuj → mail.wyslij → arkusz.zapisz`. Scenariusze A i B jako pliki JSON.
- Tryby: podgląd / test / na żywo. Domyślnie test.
- Panel w przeglądarce: scenariusze jako bloczki, przełącznik, godzina, podgląd, „uruchom teraz”, historia, ustawienia, połączenia.
- `URUCHOM.bat` — uruchomienie dwuklikiem; dane w `%USERPROFILE%\Automatyzator-dane`.
- 13 testów na zmyślonych danych — przechodzą.

### Różnica wobec Make wykryta przy przepisywaniu
W Make moduł 5 („Search Rows” po adresie i niepustej treści) odznaczał **wszystkie** wiersze klienta z treścią — także firmę, której Magdalena **nie zatwierdziła**. Taka pozycja zostawała oznaczona „wysłano”, choć nie poszła. Tu odznaczane są tylko wiersze z wysłanego maila (test: „na żywo: odznacza tylko wiersze, które poszły”). **Do potwierdzenia przez Magdalenę**, czy w praktyce zdarzało się mieć u jednego klienta firmę zatwierdzoną i niezatwierdzoną jednocześnie.

### Nieudane po drodze
- Test daty „przez koniec miesiąca” nie przeszedł. **Przyczyna: błąd w teście, nie w programie** — AI przyjęło przesunięcie UTC+2, a 25 października 2026 Polska przechodzi na czas zimowy (UTC+1). Naprawa: poprawiona godzina w teście. Wniosek: przy datach koło końca października/marca sprawdzać zmianę czasu.
- Repozytorium `flow`: dostęp do odczytu był od razu, zapis — dopiero po dodaniu repozytorium do aplikacji Claude na GitHubie.

### Do zrobienia
- Uruchomienie na komputerze Magdaleny według `INSTRUKCJA.md`.
- Tematu i podpisu maila B nie było w dokumentacji (w Make „ustawiony ręcznie”) — wpisano roboczy temat „Kwoty do zapłaty za ‹Za miesiąc›” i podpis z Ustawień. **Do porównania z Make.**
- Wygląd z Lovable (prompt przekazany w rozmowie), potem edytor bloczków.
