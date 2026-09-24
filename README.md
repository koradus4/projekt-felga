# Projekt „Felga" — praca końcowa

**Modelowanie, wykonanie i badania prototypu felgi aluminiowej do samochodu sportowego**
17×7.5J · 5×112 · ET35 · CB 57,1 · 7 ramion · skala wydruku 45% (Ø204 mm)

## Struktura

```
projekt/            źródła CAD (FreeCAD) i skrypt parametryczny
strona/             interaktywna książka projektu (strona www)
  index.html        treść: okładka, teoria, projekt 3D, BOM, plan pracy, galeria
  style.css, app.js
  model/            pliki STL do podglądu 3D w przeglądarce
  img/              rendery (FreeCAD / Blender)
  download/         pliki STL do druku (45%)
render.yaml         konfiguracja hostingu Render (Static Site)
```

## Podgląd lokalnie

Otwórz `strona/index.html` w przeglądarce (podgląd 3D wymaga internetu — three.js z CDN).

## Publikacja na Render (render.com)

1. Wypchnij repozytorium na GitHub.
2. Render → **New** → **Blueprint** (albo Static Site) → wskaż repozytorium.
3. Render odczyta `render.yaml` (publish dir: `./strona`, build: brak).
4. Po deployu strona działa pod adresem `*.onrender.com`.

## Aktualizacja

Każdy `git push` na gałąź `main` = automatyczny redeploy.

## Technologie

FreeCAD 1.0 (model + FEM) · OrcaSlicer (druk) · Blender (rendery) · KiCad (płytka) ·
ESP32 + NEMA 17 (stanowisko) · three.js (podgląd 3D) · Git/GitHub · Render (hosting).
