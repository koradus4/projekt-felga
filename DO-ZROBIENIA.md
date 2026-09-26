# DO ZROBIENIA — pamięć projektu „Felga"

_Ostatnia aktualizacja: 24.09.2026 · autor: Kamil Borkowski · opiekun: Konrad Borkowski_

## ✅ ZROBIONE
- **Model felgi** 17×7.5J 5×112 ET35 CB57,1 · 7 ramion (R8) · wpuszczane śruby (kieszenie Ø26 + gniazdo R14) · śruba M14 + nasadka 17 mm
- **Pliki do druku** 45%: obręcz, środek, śruba, nasadka (STL na stronie + Desktop + `C:\Felga_17x7.5J_5x112_ET35`)
- **Strona-książka** (praca końcowa): teoria felg, opis projektu, model 3D w przeglądarce, galeria, plan pracy, BOM
- **Stacja Nauki (AI)**: 10 przedmiotów × 5 poziomów · tryby Lekcja/Odpytanka · fiszki z błędów · zdjęcia zadań (📷 aparat, 🖼 galeria do 3, przeciągnij na PC) · profil życia (przykłady z garażu, domu, drogi do szkoły) · korepetytor „jak dziecku" z pytaniami A/B/C
- **Aplikacja na telefon**: `projekt-felga.onrender.com/nauka.html` + ikona do ekranu głównego + kod QR
- **Hosting**: Render (static site + API proxy), klucz DeepSeek w zmiennych środowiskowych, auto-deploy przez API
- **Repozytorium**: github.com/koradus4/projekt-felga · przewodnik `START.md`

## ⏳ DO ZROBIENIA — najbliższe (Etap 3)
- [ ] **Dziennik postępów**: liczba lekcji/fiszek, seria dni nauki 🔥, najsłabsze tematy
- [ ] **Eksport do PDF/MD** (dowód do pracy końcowej: „AI jako narzędzie nauki — wyniki")
- [ ] **Plan powtórek**: AI układa tygodniowy plan z błędów
- [ ] **Rozmowa głosem (🎤 + 🔊)**: Web Speech API (słuchanie po polsku) + speechSynthesis (czytanie odpowiedzi); tryb hands-free. Działa w Chrome/Android — bez dodatkowych kosztów i usług

## 🔧 DO DOPRACOWANIA — Warsztat / wersja v2 (mechanizm)
- [ ] **Rendery v2** — lepsze kadry (teraz pod dziwnymi kątami; ustawić ładny izometryczny + profil + zbliżenie na tarczę)
- [ ] **Mechanizm — detale**: pasek GT2 (zaznaczyć linią/pętlą), napinacz paska, fazki/zaokrąglenia podstawy, ładniejsze oprawy (żebra)
- [ ] **Viewer**: domyślna kamera dopasowana do całej sceny (auto-fit po wczytaniu), lepsze światło
- [ ] **Karta wersji**: skrócona lista części (12 pozycji to dużo) — np. tylko grupy + licznik
- [ ] **Edytor**: dodać eksport renderów z GUI (żeby nowe wersje z edytora miały obrazki)
- [ ] **v2 opis**: dopracować tekst w meta.json (krótszy, „co i dlaczego")

## ⏳ DO ZROBIENIA — dalsze
- [ ] **Kafel „Praca końcowa"** — egzamin próbny z rozdziałów pracy
- [ ] **Analiza FEM felgi** w FreeCAD (naprężenia, odkształcenia) + wykresy na stronę
- [ ] **Projekt stanowiska testowego**: tarcza montażowa (PCD 50,4 w skali), wał Ø8, 2× łożysko 608, podstawa, mocowanie NEMA 17 + pasek GT2
- [ ] **Elektronika + firmware ESP32**: sterownik DRV8825/TMC2209, pomiar RPM (Hall), drgań (MPU6050), bicia, prądu (INA219), strona z regulacją + log CSV
- [ ] **Wydruk felgi 45%** + montaż i pasowanie na stanowisku
- [ ] **Badania i wnioski**: tabele (RPM vs drgania), próba wyważania, porównanie wariantów
- [ ] **Redakcja pracy** + prezentacja na obronę
- [ ] (opcja) tryb egzaminu z zapisem wyników, eksport rozmów do PDF

## 🔑 WAŻNE (bezpieczeństwo / dostępy)
- Klucz **DeepSeek** — w Render: usługa `stacja-nauki-api` → Environment → `DEEPSEEK_API_KEY` (sprawny: 25.09.2026 ✓)
- Klucz **Render API** (`rnd_...`) — nowy z 25.09.2026 ✓; po zakończeniu prac zrobić **Revoke** (Account Settings → API Keys)
- **Auto-deploy: WŁĄCZONY** dla obu usług ✓ (`projekt-felga` + `stacja-nauki-api`) — po `git push` publikują się same
- Konto Render: `klif_kryspin` · usługi: `projekt-felga` (static) + `stacja-nauki-api` (node, free)
- Podgląd lokalny: `strona\serve.py` (port 8000) + `serwer\server.js` (port 8787, wymaga klucza w zmiennej)

## 📌 JAK WRÓCIĆ DO PRACY
1. `git -C C:\Projekt_Felga status` — co się zmieniło
2. Zmiana wymiarów felgi: `projekt\Felga_parametryczna.py` (sekcja `DEF`) → uruchom w FreeCAD
3. Publikacja zmian: `git push` + deploy przez API Render (albo „Manual Deploy" w panelu)
4. Test lokalny: `python strona\serve.py` + `node serwer\server.js`
