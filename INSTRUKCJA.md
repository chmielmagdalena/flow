# Instrukcja — uruchomienie Automatyzatora na Windows

> **DO PRZECZYTANIA** — tego pliku nie wklejaj nigdzie.

Całość robi się raz. Zajmie ok. 30–40 minut, z czego najdłużej trwa krok 3 (klucz Google).

---

## Krok 1. Zainstaluj Node.js (raz na zawsze)

1. Wejdź na **https://nodejs.org**.
2. Kliknij duży przycisk z napisem **LTS**.
3. Uruchom pobrany plik i klikaj **Dalej** aż do końca. Niczego nie zmieniaj.

Node.js to „silnik”, na którym działa program — tak jak Word potrzebuje Windowsa.

## Krok 2. Pobierz program

1. Wejdź na **https://github.com/chmielmagdalena/flow**.
2. Zielony przycisk **Code** → **Download ZIP**.
3. Kliknij pobrany plik prawym przyciskiem → **Wyodrębnij wszystkie…** → wybierz np. `Dokumenty\Automatyzator`.
4. W rozpakowanym folderze kliknij dwukrotnie **`URUCHOM.bat`**.
   - Za pierwszym razem Windows może pokazać niebieskie okno „System Windows ochronił komputer” → **Więcej informacji** → **Uruchom mimo to**.
   - Za pierwszym razem program przez ok. minutę instaluje swoje części.
5. Otworzy się przeglądarka z panelem: **http://localhost:3030**.

⚠️ **Czarnego okna nie zamykaj** — to jest działający program. Zamknięcie okna = wyłączenie programu (można je zminimalizować).

Twoje dane (hasło, klucz, historia) program trzyma w folderze
`C:\Users\<Twoja nazwa>\Automatyzator-dane` — **poza** folderem programu.
Dzięki temu nową wersję programu po prostu rozpakowujesz w miejsce starej, a dane zostają.

## Krok 3. Dostęp do arkusza Google (klucz konta technicznego)

Program musi mieć własne „konto techniczne” Google, któremu udostępnisz arkusz — tak jak udostępniasz arkusz współpracownikowi.

1. Wejdź na **https://console.cloud.google.com** i zaloguj się kontem, na którym jest arkusz.
2. Na górze kliknij wybór projektu → **Nowy projekt** → nazwa `Automatyzator` → **Utwórz**. Upewnij się, że ten projekt jest wybrany.
3. W wyszukiwarce na górze wpisz **Google Sheets API** → kliknij wynik → **Włącz**.
4. Menu po lewej: **Interfejsy API i usługi** → **Dane logowania** → **Utwórz dane logowania** → **Konto usługi**.
5. Nazwa: `automatyzator` → **Utwórz i kontynuuj** → **Gotowe** (role pomiń).
6. Kliknij nowo utworzone konto na liście → zakładka **Klucze** → **Dodaj klucz** → **Utwórz nowy klucz** → **JSON** → **Utwórz**. Pobierze się plik `.json`.
7. Otwórz ten plik w Notatniku, zaznacz wszystko (Ctrl+A), skopiuj (Ctrl+C).
8. W panelu: zakładka **Połączenia** → wklej do pola **Klucz konta technicznego** → **Zapisz klucz**.
9. Panel pokaże adres konta technicznego (kończy się na `iam.gserviceaccount.com`). Otwórz arkusz **LISTA KLIENTOW v6** → **Udostępnij** → wklej ten adres → uprawnienia **Edytor** → odznacz „Powiadom” → **Udostępnij**.
10. W panelu kliknij **Sprawdź połączenie**. Ma się pokazać „Działa. Zakładka „Klienci”: … wierszy”.

⚠️ Plik `.json` to klucz do arkusza. Po wklejeniu do panelu **usuń go z Pobranych**, nie wysyłaj nikomu i nie wklejaj w czacie.

Jeśli w kroku 6 Google pokaże komunikat **„Tworzenie klucza konta usługi jest wyłączone”** (zasada
`iam.disableServiceAccountKeyCreation`), to projekt powstał wewnątrz „organizacji” Google, a Google
od 2024 r. blokuje w nich klucze z góry. Zdarza się to nawet na prywatnym koncie. Rozwiązanie:

1. Kliknij u góry nazwę projektu → **Nowy projekt**.
2. Nazwa dowolna (np. `flow-automatyzator`). W polu **Lokalizacja** kliknij **Przeglądaj** i wybierz **Brak organizacji**.
3. W tym nowym projekcie wykonaj punkty 3–8 jeszcze raz. **Punkt 3 (włączenie Google Sheets API) trzeba zrobić
   osobno w każdym projekcie** — inaczej panel pokaże „nie jest włączone Google Sheets API”.

## Krok 4. Poczta

1. Panel → **Połączenia** → karta **Poczta**. Serwer i port są już wpisane (te same co w Make).
2. Wpisz **hasło do skrzynki biuro@taxpolonica.pl** → **Zapisz**.
3. Panel → **Ustawienia** → wpisz **adres testowy** (np. swój prywatny Gmail) → **Zapisz ustawienia**.
4. Wróć do **Połączenia** → **Wyślij mail próbny**. Sprawdź skrzynkę testową.

Hasło jest zapisane tylko na Twoim komputerze i nigdy nie jest wyświetlane w panelu.

## Krok 5. Sprawdzenie bez ryzyka

Make cały czas działa. Program jest w **trybie testowym** — nic nie trafi do klientów i nic nie zmieni się w arkuszu.

1. Panel → **Scenariusze** → przy A i B kliknij **Podgląd — co by poszło**. Zobaczysz listę maili, które poszłyby dziś. **Nic nie jest wysyłane.**
2. Porównaj z tym, co wysyła Make.
3. Kliknij **Uruchom teraz** — maile przyjdą na Twój adres testowy, w temacie z dopiskiem `[TEST → adres klienta]`.

## Krok 6. Przejście z Make (dopiero gdy testy się zgadzają)

Kolejność ma znaczenie — inaczej klienci dostaną maile podwójnie:

1. **W Make wyłącz** scenariusze A i B (przełącznik ON/OFF).
2. W panelu → **Ustawienia** → tryb **Na żywo** → **Zapisz**.
3. W panelu → **Scenariusze** → włącz przełączniki przy A i B.

Od teraz program sam wysyła o 08:00 (A) i 18:00 (B) — **pod warunkiem, że komputer jest włączony, a czarne okno otwarte**. Jeśli o tej godzinie komputer był wyłączony, tego dnia scenariusz nie ruszy (tak samo jak w Make) — wtedy kliknij **Uruchom teraz**.

---

## Co zrobić, gdy…

| Objaw | Co zrobić |
|---|---|
| Panel się nie otwiera | Sprawdź, czy czarne okno jest otwarte. Jeśli nie — `URUCHOM.bat`. |
| Czarne okno pokazuje błąd i się zatrzymuje | Zrób zrzut ekranu okna i pokaż Claude. |
| „W projekcie Google … nie jest włączone Google Sheets API” | Klucz jest dobry, ale w tym projekcie nie włączono Sheets API (krok 3, punkt 3). Włącz i po minucie sprawdź ponownie. |
| „Google nie wpuszcza do arkusza (błąd 403)” | Arkusz nie jest udostępniony kontu technicznemu (krok 3, punkt 9). Adres konta jest w komunikacie. |
| „Google nie znajduje takiego arkusza (błąd 404)” | W scenariuszu jest zły identyfikator arkusza (ciąg znaków z adresu między `/d/` a `/edit`). |
| „Google odrzuca klucz konta technicznego” | Klucz usunięty w konsoli Google albo wklejony niepełny plik. Utwórz nowy klucz. |
| „W zakładce Klienci nie ma kolumn …” | Ktoś zmienił nagłówek w wierszu 1 arkusza. Przywróć dokładną nazwę. **Nic nie zostało wysłane.** |
| „Mail wysłany, ale NIE udało się odznaczyć arkusza” | Wpisz ręcznie `nie` w kolumnie **Zatwierdzone** we wskazanych wierszach, zanim uruchomisz B ponownie. |
| „Bezpiecznik…” | Przebieg wysłałby więcej maili niż limit. Sprawdź arkusz; jeśli wszystko jest dobrze — podnieś limit w Ustawieniach. |
