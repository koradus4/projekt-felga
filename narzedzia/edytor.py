# -*- coding: utf-8 -*-
"""
Edytor lokalny projektu Felga (http://localhost:8090)

Flow jest DETERMINISTYCZNY:
  prompt -> AI proponuje zmiany TYLKO z listy parametrow (JSON, walidacja zakresow)
        -> [Zastosuj] uzupelnia pola -> [Zapisz] zapisuje parametry.json
        -> [Eksportuj] przebudowa w FreeCAD (ten sam skrypt) + STL/STEP/rendery
        -> [Publikuj] nowa wersja na stronie (git push + deploy)

Uruchom:  python narzedzia/edytor.py     (wymaga DEEPSEEK_API_KEY w srodowisku)
"""
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJEKT = os.path.join(ROOT, 'projekt')
STAGING = os.path.join(ROOT, 'wersja_out')
PARAMS_JSON = os.path.join(PROJEKT, 'parametry.json')
PORT = int(os.environ.get('EDYTOR_PORT', '8090'))

FREECAD = os.environ.get('FREECAD_CMD', '')
if not FREECAD:
    for c in [
        r'C:\Users\klif\AppData\Local\Programs\FreeCAD 1.0\bin\freecadcmd.exe',
        r'C:\Program Files\FreeCAD 1.0\bin\freecadcmd.exe',
        'freecadcmd',
    ]:
        if c == 'freecadcmd' or os.path.exists(c):
            FREECAD = c
            break

DEF = {
    "CAL": 17.0, "SZER_J": 7.5, "PCD": 112.0, "N_SRUB": 5,
    "D_OTW_SRUB": 15.0, "CB": 57.1, "ET": 35.0, "N_RAMION": 7,
    "T_OBRECZY": 6.0, "RANT_DOD": 11.0, "RANT_H": 11.0,
    "R_PIASTY": 78.0, "T_PIASTY": 18.0,
    "RAMIE_R0": 66.0, "RAMIE_R1": 212.0, "RAMIE_W0": 38.0, "RAMIE_W1": 24.0,
    "RAMIE_H0": 18.0, "RAMIE_H1": 18.0, "R_OBLENIA": 8.0,
    "D_KIOSZENI": 26.0, "H_KIOSZENI": 10.0, "R_GNIAZDA": 14.0,
    "D_SRUBY": 14.0, "L_SRUBY": 30.0, "HEX_AF": 17.0, "H_HEX": 9.0,
    "D_NASADKI": 24.0, "L_NASADKI": 38.0, "H_NAS_HEX": 14.0, "SQ_NAPED": 12.7,
}

OPIS = {
    "CAL":     ("Średnica felgi (cale)", 13, 24, 0.5),
    "SZER_J":  ("Szerokość felgi (cale, J)", 4, 13, 0.5),
    "PCD":     ("Rozstaw śrub PCD (mm)", 90, 170, 0.5),
    "N_SRUB":  ("Liczba śrub", 4, 6, 1),
    "D_OTW_SRUB": ("Otwór na śrubę (mm)", 10, 20, 0.5),
    "CB":      ("Otwór centrujący CB (mm)", 50, 80, 0.1),
    "ET":      ("Odsadzenie ET (mm)", 0, 80, 1),
    "N_RAMION": ("Liczba ramion", 3, 12, 1),
    "T_OBRECZY": ("Ścianka obręczy (mm)", 3, 15, 0.5),
    "RANT_DOD": ("Wysokość rantu (mm)", 5, 20, 0.5),
    "RANT_H":  ("Szerokość rantu (mm)", 5, 20, 0.5),
    "R_PIASTY": ("Promień piasty (mm)", 50, 110, 1),
    "T_PIASTY": ("Grubość piasty (mm)", 10, 30, 1),
    "RAMIE_R0": ("Ramiona: start (mm)", 40, 90, 1),
    "RAMIE_R1": ("Ramiona: koniec (mm)", 190, 218, 1),
    "RAMIE_W0": ("Szerokość ramienia u piasty (mm)", 20, 60, 1),
    "RAMIE_W1": ("Szerokość ramienia przy obręczy (mm)", 12, 45, 1),
    "RAMIE_H0": ("Grubość ramienia u piasty (mm)", 10, 30, 1),
    "RAMIE_H1": ("Grubość ramienia przy obręczy (mm)", 10, 30, 1),
    "R_OBLENIA": ("Zaokrąglenie ramion/piasty R (mm)", 2, 12, 0.5),
    "D_KIOSZENI": ("Kieszeń śruby — średnica (mm)", 20, 34, 1),
    "H_KIOSZENI": ("Kieszeń śruby — głębokość (mm)", 5, 16, 0.5),
    "R_GNIAZDA": ("Gniazdo kuliste R (mm)", 10, 18, 0.5),
    "D_SRUBY": ("Śruba — trzpień (mm)", 10, 18, 0.5),
    "L_SRUBY": ("Śruba — długość (mm)", 16, 60, 1),
    "HEX_AF":  ("Śruba — łeb HEX (mm)", 13, 24, 1),
    "H_HEX":   ("Śruba — wysokość łba (mm)", 5, 15, 0.5),
    "D_NASADKI": ("Nasadka — średnica (mm)", 18, 32, 1),
    "L_NASADKI": ("Nasadka — długość (mm)", 25, 60, 1),
    "H_NAS_HEX": ("Nasadka — głębokość gniazda (mm)", 8, 24, 1),
    "SQ_NAPED": ("Nasadka — napęd kwadrat (mm)", 8, 20, 0.1),
}


def stan():
    p = dict(DEF)
    if os.path.exists(PARAMS_JSON):
        try:
            with open(PARAMS_JSON, encoding='utf-8') as f:
                for k, v in json.load(f).items():
                    if k in p:
                        p[k] = float(v)
        except Exception:
            pass
    lista = []
    for k, v in p.items():
        o = OPIS.get(k, (k, 0, 2000, 0.5))
        lista.append({'klucz': k, 'opis': o[0], 'min': o[1], 'max': o[2],
                      'krok': o[3], 'wartosc': v})
    return lista


def waliduj(zmiany):
    poprawne, odrzucone = [], []
    for z in zmiany:
        k = str(z.get('klucz', ''))
        if k not in DEF:
            odrzucone.append('%s (nieznany parametr)' % k)
            continue
        try:
            w = float(z.get('wartosc'))
        except (TypeError, ValueError):
            odrzucone.append('%s (zła wartość)' % k)
            continue
        o = OPIS.get(k, (k, 0, 2000, 0.5))
        if not (o[1] <= w <= o[2]):
            odrzucone.append('%s=%s (poza zakresem %s–%s)' % (k, w, o[1], o[2]))
            continue
        poprawne.append({'klucz': k, 'wartosc': w, 'dlaczego': str(z.get('dlaczego', ''))})
    return poprawne, odrzucone


def ai_propozycja(prompt, parametry):
    """Pyta DeepSeek o zmiany parametrow. Zwraca (poprawne, odrzucone, podsumowanie)."""
    key = os.environ.get('DEEPSEEK_API_KEY', '')
    if not key:
        raise RuntimeError('brak DEEPSEEK_API_KEY w środowisku')
    model = os.environ.get('DEEPSEEK_MODEL', 'deepseek-flash')
    opis = '\n'.join('%s = %s  (%s; zakres %s..%s)' % (p['klucz'], p['wartosc'], p['opis'], p['min'], p['max'])
                     for p in parametry)
    sys_msg = (
        'Jesteś asystentem konstruktora felg aluminiowych. Dostajesz listę parametrów modelu '
        'i prośbę użytkownika. Zmieniasz WYŁĄCZNIE wartości z tej listy — nie wymyślasz nowych '
        'parametrów. Odpowiadasz TYLKO poprawnym JSON (bez markdown) w formacie:\n'
        '{"zmiany":[{"klucz":"ET","wartosc":40,"dlaczego":"krótko po polsku"}],'
        '"podsumowanie":"1-2 zdania po polsku co i dlaczego"}\n'
        'Jeśli prośba jest niejasna — zwróć pustą listę i wyjaśnij w podsumowaniu.\n'
        'Wartości muszą mieścić się w podanych zakresach.'
    )
    user_msg = 'Parametry:\n%s\n\nProśba użytkownika: %s' % (opis, prompt)
    payload = json.dumps({
        'model': model,
        'messages': [{'role': 'system', 'content': sys_msg},
                     {'role': 'user', 'content': user_msg}],
        'max_tokens': 700, 'temperature': 0.2, 'stream': False,
        'thinking': {'type': 'disabled'}
    }).encode('utf-8')
    req = urllib.request.Request(
        'https://api.deepseek.com/chat/completions', data=payload, method='POST',
        headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.loads(r.read().decode('utf-8'))
    txt = d['choices'][0]['message']['content']
    m = re.search(r'\{[\s\S]*\}', txt)
    if not m:
        raise RuntimeError('AI nie zwrocilo JSON: ' + txt[:200])
    dane = json.loads(m.group(0))
    dobre, zle = waliduj(dane.get('zmiany', []))
    return dobre, zle, str(dane.get('podsumowanie', ''))


def run(cmd, cwd=None, timeout=900):
    p = subprocess.run(cmd, cwd=cwd or ROOT, capture_output=True, text=True,
                       encoding='utf-8', errors='replace', timeout=timeout)
    return (p.stdout or '') + (p.stderr or '')


HTML = r"""<!DOCTYPE html>
<html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Edytor — Warsztat</title>
<style>
:root{--g:#0f1216;--g2:#1a1f26;--a:#ffc400;--l:#e3e8ef;--t:#c9d1d9}
body{margin:0;background:var(--g);color:var(--t);font:15px/1.5 system-ui,Segoe UI,Roboto,Arial}
header{display:flex;gap:12px;align-items:center;padding:12px 16px;border-bottom:3px solid var(--a)}
header b{color:#fff}
header a{color:var(--a);text-decoration:none}
.tag{margin-left:auto;font-size:12px;background:var(--g2);border:1px solid #333b44;border-radius:20px;padding:3px 10px}
.wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;padding:16px;max-width:1400px;margin:0 auto}
.card{background:var(--g2);border:1px solid #2b3239;border-radius:14px;padding:14px 16px}
h2{margin:0 0 10px;font-size:17px;color:#fff}
table{width:100%;border-collapse:collapse;font-size:13.5px}
td{padding:4px 6px;border-bottom:1px solid #262d35}
td input{width:90px;background:#10141a;border:1px solid #333b44;color:#fff;border-radius:7px;padding:5px 7px;font:inherit}
td .rg{color:#7d868f;font-size:11.5px}
textarea{width:100%;min-height:90px;background:#10141a;border:1px solid #333b44;color:#fff;border-radius:10px;padding:9px;font:inherit}
button{border:1px solid #333b44;background:#10141a;color:#fff;border-radius:10px;padding:8px 13px;cursor:pointer;font:inherit;margin:6px 6px 0 0}
button:hover{border-color:var(--a);color:var(--a)}
button.acc{background:var(--a);color:var(--g);border-color:var(--a);font-weight:700}
button.acc:hover{background:#ffd23d;color:var(--g)}
pre{background:#0b0e12;border:1px solid #262d35;border-radius:10px;padding:10px;max-height:230px;overflow:auto;font-size:12.5px;white-space:pre-wrap}
.diff td{font-size:13px}
.diff .n{color:#fff;font-weight:700}
.ok{color:#4ade80}.bad{color:#f87171}
input[type=text]{background:#10141a;border:1px solid #333b44;color:#fff;border-radius:8px;padding:7px 9px;font:inherit;width:100%}
@media(max-width:980px){.wrap{grid-template-columns:1fr}}
</style></head><body>
<header>
  <b>🛠 Edytor — Warsztat</b>
  <a href="http://localhost:8000/warsztat.html" target="_blank">podgląd strony →</a>
  <span class="tag" id="tag">…</span>
</header>
<div class="wrap">
  <div class="card">
    <h2>1 · Poproś o zmianę (AI proponuje liczby)</h2>
    <textarea id="prompt" placeholder="np. zwiększ ET do 42 i pogrub ściankę obręczy do 8 mm"></textarea>
    <button class="acc" onclick="proponuj()">🤖 Zaproponuj zmiany</button>
    <button onclick="pokazStan()">↻ Odśwież parametry</button>
    <div id="prop"></div>
    <h2 style="margin-top:16px">2 · Parametry modelu</h2>
    <div style="max-height:420px;overflow:auto"><table id="tab"></table></div>
  </div>
  <div class="card">
    <h2>3 · Zapis / eksport / publikacja</h2>
    <div>
      <button class="acc" onclick="zapisz()">💾 Zapisz</button>
      <button class="acc" onclick="eksportuj()">📦 Eksportuj (STL/STEP)</button>
      <button class="acc" onclick="publikuj()">🚀 Publikuj wersję</button>
    </div>
    <p style="font-size:13px;color:#7d868f">Tytuł i opis nowej wersji (do publikacji):</p>
    <input type="text" id="tytul" placeholder="Tytuł wersji, np. Mechanizm napędu — etap 1">
    <div style="height:6px"></div>
    <textarea id="opis" placeholder="Krótki opis zmian (co i dlaczego)"></textarea>
    <h2 style="margin-top:16px">Log</h2>
    <pre id="log">gotowe.</pre>
  </div>
</div>
<script>
const $ = id => document.getElementById(id);
const log = t => { $('log').textContent = t; };
let parametry = [];

async function api(url, body) {
  const r = await fetch(url, body ? {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)} : undefined);
  return await r.json();
}

async function pokazStan() {
  const j = await api('/api/stan');
  parametry = j.parametry; $('tag').textContent = 'parametrów: ' + parametry.length;
  $('tab').innerHTML = parametry.map(p =>
    '<tr><td><b>' + p.klucz + '</b><br><span class="rg">' + p.opis + ' <i>' + p.min + '–' + p.max + '</i></span></td>' +
    '<td><input type="number" step="' + p.krok + '" min="' + p.min + '" max="' + p.max + '" data-k="' + p.klucz + '" value="' + p.wartosc + '"></td></tr>'
  ).join('');
}

function zbierz() {
  const o = {};
  document.querySelectorAll('#tab input').forEach(i => o[i.dataset.k] = parseFloat(i.value));
  return o;
}

async function proponuj() {
  log('pytam AI…');
  const j = await api('/api/prompt', {prompt: $('prompt').value});
  if (j.error) { log('BŁĄD: ' + j.error); return; }
  let h = '<h2 style="margin-top:14px">Propozycja AI</h2><p>' + (j.podsumowanie || '') + '</p>';
  if (j.zmiany.length) {
    h += '<table class="diff">' + j.zmiany.map(z =>
      '<tr><td>' + z.klucz + '</td><td class="n">' + z.wartosc + '</td><td>' + (z.dlaczego||'') + '</td></tr>').join('') + '</table>' +
      '<button class="acc" onclick="zastosuj(' + JSON.stringify(j.zmiany).replace(/"/g,'&quot;') + ')">✔ Zastosuj propozycję</button>';
  }
  if (j.odrzucone && j.odrzucone.length) h += '<p class="bad">Odrzucone: ' + j.odrzucone.join(', ') + '</p>';
  $('prop').innerHTML = h;
  log('propozycja gotowa.');
}

function zastosuj(zmiany) {
  zmiany.forEach(z => {
    const i = document.querySelector('#tab input[data-k="' + z.klucz + '"]');
    if (i) i.value = z.wartosc;
  });
  log('propozycja wpisana do pól — teraz kliknij 💾 Zapisz.');
}

async function zapisz() {
  const j = await api('/api/zapisz', {parametry: zbierz()});
  log(j.ok ? 'ZAPISANE: parametry.json ✔' : 'BŁĄD: ' + (j.error||'?'));
}

async function eksportuj() {
  log('eksport w FreeCAD… (może potrwać ~1 min)');
  const j = await api('/api/eksport');
  log(j.ok ? ('EKSPORT OK\n' + j.log) : ('BŁĄD EKSPORTU\n' + j.log));
}

async function publikuj() {
  log('publikacja: nowa wersja + git push + deploy…');
  const j = await api('/api/publikuj', {tytul: $('tytul').value, opis: $('opis').value});
  log(j.ok ? ('OPUBLIKOWANO\n' + j.log) : ('BŁĄD PUBLIKACJI\n' + j.log));
}

pokazStan();
</script></body></html>
"""


class H(BaseHTTPRequestHandler):
    def _send(self, code, obj=None, html=None):
        if html is not None:
            b = html.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
        else:
            b = json.dumps(obj, ensure_ascii=False).encode('utf-8')
            self.send_response(code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _body(self):
        n = int(self.headers.get('Content-Length', '0'))
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode('utf-8'))
        except Exception:
            return {}

    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path in ('/', '/index.html'):
            return self._send(200, html=HTML)
        if self.path == '/api/stan':
            return self._send(200, {'parametry': stan()})
        self._send(404, {'error': 'nie ma'})

    def do_POST(self):
        d = self._body()
        try:
            if self.path == '/api/prompt':
                dobre, zle, podsum = ai_propozycja(str(d.get('prompt', '')), stan())
                return self._send(200, {'zmiany': dobre, 'odrzucone': zle, 'podsumowanie': podsum})
            if self.path == '/api/zapisz':
                p = {k: float(v) for k, v in (d.get('parametry') or {}).items() if k in DEF}
                os.makedirs(PROJEKT, exist_ok=True)
                with open(PARAMS_JSON, 'w', encoding='utf-8') as f:
                    json.dump(p, f, ensure_ascii=False, indent=2)
                return self._send(200, {'ok': True, 'zapisano': len(p)})
            if self.path == '/api/eksport':
                if os.path.isdir(STAGING):
                    shutil.rmtree(STAGING)
                env = dict(os.environ, FELGA_OUT=STAGING)
                out = subprocess.run([FREECAD, os.path.join(ROOT, 'narzedzia', 'eksport.py')],
                                     capture_output=True, text=True, encoding='utf-8',
                                     errors='replace', timeout=900, env=env).stdout
                ok = os.path.exists(os.path.join(STAGING, 'czesci.json'))
                # rendery (GUI) — opcjonalnie, jesli dostepny freecad.exe
                return self._send(200, {'ok': ok, 'log': out[-1500:]})
            if self.path == '/api/publikuj':
                tytul = str(d.get('tytul') or '').strip() or 'Nowa wersja'
                opis = str(d.get('opis') or '').strip()
                if not os.path.exists(os.path.join(STAGING, 'czesci.json')):
                    return self._send(200, {'ok': False, 'log': 'Najpierw zrób 📦 Eksportuj.'})
                cmd = [sys.executable, os.path.join(ROOT, 'narzedzia', 'nowa_wersja.py'),
                       '--zrodlo', STAGING, '--tytul', tytul, '--opis', opis,
                       '--push', '--deploy']
                out = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8',
                                     errors='replace', timeout=900).stdout
                return self._send(200, {'ok': True, 'log': out[-1500:]})
        except Exception as e:
            return self._send(200, {'error': str(e)})
        self._send(404, {'error': 'nie ma'})


if __name__ == '__main__':
    print('Edytor: http://localhost:%d' % PORT)
    print('FreeCAD: %s' % FREECAD)
    print('Klucz DeepSeek: %s' % ('jest' if os.environ.get('DEEPSEEK_API_KEY') else 'BRAK'))
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
