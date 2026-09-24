# START — przewodnik po projekcie „Felga"

**Praca końcowa** · Kamil Borkowski · klasa 3 mechanik pojazdów samochodowych
CosinusYoung 15+ · Szkoła Branżowa I stopnia, Częstochowa · opiekun: Konrad Borkowski

## Najważniejsze linki

| Co | Adres |
|---|---|
| Książka projektu (praca końcowa) | https://projekt-felga.onrender.com |
| **Stacja Nauki — tryb aplikacji (telefon)** | https://projekt-felga.onrender.com/nauka.html |
| Repozytorium | https://github.com/koradus4/projekt-felga |
| Panel Render | https://dashboard.render.com |

**Na telefon:** zeskanuj kod QR ze strony (rozdz. 9) albo wpisz adres `projekt-felga.onrender.com/nauka.html`.
Chrome → ⋮ → „Dodaj do ekranu głównego" → ikona jak aplikacja (dzięki `manifest.json` + `img/ikona-*.png`).
Zdjęcia zadań: 📷 aparat · 🖼 galeria (do 3) · na komputerze przeciągnij myszką na okno czatu.

## Gdzie co jest (struktura folderu)

```
C:\Projekt_Felga\
├─ START.md              ← ten plik (przewodnik)
├─ README.md             ← opis dla GitHub/Render
├─ render.yaml           ← konfiguracja hostingu (Render czyta automatycznie)
├─ projekt\              ← ŹRÓDŁA CAD
│   ├─ Felga.FCStd       ← model felgi w FreeCAD (+ arkusz „Parametry")
│   └─ Felga_parametryczna.py ← skrypt przebudowujący model
└─ strona\               ← INTERAKTYWNA KSIĄŻKA (to trafia na internet)
    ├─ index.html        ← treść: okładka, teoria, projekt 3D, BOM, plan pracy
    ├─ style.css         ← wygląd
    ├─ app.js            ← logika: model 3D, quiz, kalkulator budżetu
    ├─ model\            ← pliki STL do podglądu 3D w przeglądarce
    ├─ img\              ← rendery (FreeCAD/Blender)
    ├─ download\         ← pliki STL do druku (skala 45%)
    └─ vendor\           ← biblioteka three.js (lokalnie, bez internetu)
```

## Co jest zrobione (stan na 24.09.2026)

- [x] **Model felgi** 17×7.5J 5×112 ET35 CB57,1 — 7 ramion, zaokrąglone R8, wpuszczane śruby
      (kieszenie Ø26 + gniazdo kuliste R14), śruba M14 i nasadka 17 mm
- [x] **Pliki do druku** w skali 45% (Ø204 mm): obręcz, środek, śruba, nasadka
- [x] **Stanowisko testowe** — plan: NEMA 17 + ESP32 + czujniki (lista części w rozdz. 5 strony)
- [x] **Strona-książka** — opublikowana, z modelem 3D do obracania i kalkulatorem budżetu
- [x] **Repozytorium + auto-publikacja** (git push = strona sama się aktualizuje)
- [ ] Analiza FEM felgi (naprężenia) — **następny krok**
- [ ] Projekt stanowiska (tarcza montażowa, wał, łożyska, podstawa)
- [ ] Elektronika + firmware ESP32
- [ ] Wydruk, montaż, badania i wnioski

## Stacja Nauki (korepetytor AI) — jak uruchomić

**Lokalnie** (dwa okna):
```powershell
cd C:\Projekt_Felga\serwer
$env:DEEPSEEK_API_KEY = "sk-..."     # klucz z platform.deepseek.com
node server.js                       # proxy na http://localhost:8787
```
drugie okno:
```powershell
cd C:\Projekt_Felga\strona
python -m http.server 8000           # strona na http://localhost:8000
```
Test bez AI (podgląd interfejsu): `$env:MOCK_AI = "1"` przed uruchomieniem serwera.

**Online:** usługa `stacja-nauki-api` na Renderze (klucz w Environment → `DEEPSEEK_API_KEY`).

## Jak otworzyć podgląd lokalnie

W folderze `strona` uruchom serwer i wejdź na http://localhost:8000 :

```powershell
cd C:\Projekt_Felga\strona
python -m http.server 8000
```

(otwieranie `index.html` bezpośrednio z dysku nie pokaże modelu 3D — przeglądarka blokuje pliki lokalne)

## Jak opublikować zmiany

```powershell
cd C:\Projekt_Felga
git add -A
git commit -m "opis zmiany"
git push
```

Render sam wykryje push i opublikuje nową wersję (~1 minuta).

## Zmiana wymiarów felgi

Edytuj wartości w `projekt\Felga_parametryczna.py` (sekcja `DEF` na górze) i uruchom skrypt
w FreeCAD — przebuduje model od nowa. Lub edytuj arkusz „Parametry" w zapisanym pliku.

## Bezpieczeństwo

Klucz API Render nie jest zapisany w tym folderze i nie może trafić do repozytorium.
Po zakończeniu prac zrób **Revoke** klucza: Render → Account Settings → API Keys.
