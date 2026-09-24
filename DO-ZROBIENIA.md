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
- Klucz **DeepSeek** — w Render: usługa `stacja-nauki-api` → Environment → `DEEPSEEK_API_KEY`
- Klucz **Render API** (`rnd_...`) — po zakończeniu prac zrobić **Revoke** (Account Settings → API Keys)
- Konto Render: `klif_kryspin` · usługi: `projekt-felga` (static) + `stacja-nauki-api` (node, free)
- Podgląd lokalny: `strona\serve.py` (port 8000) + `serwer\server.js` (port 8787, wymaga klucza w zmiennej)

## 📌 JAK WRÓCIĆ DO PRACY
1. `git -C C:\Projekt_Felga status` — co się zmieniło
2. Zmiana wymiarów felgi: `projekt\Felga_parametryczna.py` (sekcja `DEF`) → uruchom w FreeCAD
3. Publikacja zmian: `git push` + deploy przez API Render (albo „Manual Deploy" w panelu)
4. Test lokalny: `python strona\serve.py` + `node serwer\server.js`
