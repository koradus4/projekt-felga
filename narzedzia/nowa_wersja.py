#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Publikacja nowej wersji projektu na stronie "Warsztat".

Uzycie:
  python narzedzia/nowa_wersja.py --zrodlo FOLDER --tytul "..." [--opis "..."] \
         [--parametry parametry.json] [--limit 5] [--push] [--deploy]

Co robi:
  1. tworzy folder strona/wersje/vN/
  2. kopiuje z --zrodlo pliki: *.stl (bez *_druk45*), *.png, *.FCStd
  3. zapisuje meta.json + aktualizuje index.json (najnowsze pierwsze)
  4. jesli wersji > limit: najstarsza jest usuwana Z WITRYNY (w Git zostaje)
  5. --push => git add/commit/push ; --deploy => deploy przez Render API
     (klucz czytany ze zmiennej srodowiskowej RENDER_API_KEY — nie zapisujemy go nigdzie)
"""
import argparse
import datetime
import json
import os
import shutil
import subprocess
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WERSJE = os.path.join(ROOT, 'strona', 'wersje')
INDEX = os.path.join(WERSJE, 'index.json')
RENDER_SERVICE = 'srv-daqni48u01pc73fbomk0'


def load_index():
    if os.path.exists(INDEX):
        with open(INDEX, encoding='utf-8') as f:
            return json.load(f)
    return {'limit': 5, 'wersje': []}


def save_index(idx):
    with open(INDEX, 'w', encoding='utf-8') as f:
        json.dump(idx, f, ensure_ascii=False, indent=2)


def next_id(wersje):
    n = 0
    for w in wersje:
        try:
            n = max(n, int(str(w.get('id', 'v0')).lstrip('v')))
        except ValueError:
            pass
    return 'v%d' % (n + 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--zrodlo', required=True, help='folder ze STL/PNG/FCStd')
    ap.add_argument('--tytul', required=True)
    ap.add_argument('--opis', default='')
    ap.add_argument('--parametry', default='', help='plik JSON z parametrami (slownik)')
    ap.add_argument('--data', default=datetime.date.today().isoformat())
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--push', action='store_true')
    ap.add_argument('--deploy', action='store_true')
    a = ap.parse_args()

    idx = load_index()
    limit = a.limit or int(idx.get('limit', 5))
    vid = next_id(idx.get('wersje', []))
    vdir = os.path.join(WERSJE, vid)
    os.makedirs(vdir, exist_ok=True)

    model, img, zrodlo = [], [], ''
    for fn in sorted(os.listdir(a.zrodlo)):
        src = os.path.join(a.zrodlo, fn)
        if not os.path.isfile(src):
            continue
        low = fn.lower()
        if low.endswith('.stl') and 'druk45' not in low:
            shutil.copy2(src, os.path.join(vdir, fn))
            model.append(fn)
        elif low.endswith('.png'):
            shutil.copy2(src, os.path.join(vdir, fn))
            img.append(fn)
        elif low.endswith('.fcstd'):
            shutil.copy2(src, os.path.join(vdir, 'zrodlo.FCStd'))
            zrodlo = 'zrodlo.FCStd'

    parametry = {}
    if a.parametry:
        with open(a.parametry, encoding='utf-8') as f:
            parametry = json.load(f)

    meta = {
        'id': vid, 'data': a.data, 'tytul': a.tytul, 'opis': a.opis,
        'parametry': parametry, 'model': model, 'img': img, 'zrodlo': zrodlo
    }
    with open(os.path.join(vdir, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    idx['limit'] = limit
    idx['wersje'] = [meta] + idx.get('wersje', [])

    usuniete = []
    while len(idx['wersje']) > limit:
        old = idx['wersje'].pop()
        odir = os.path.join(WERSJE, old['id'])
        if os.path.isdir(odir):
            shutil.rmtree(odir)
        usuniete.append(old['id'])

    save_index(idx)

    print('NOWA WERSJA: %s — %s' % (vid, a.tytul))
    print('  model:  %s' % (', '.join(model) or '-'))
    print('  obrazy: %s' % (', '.join(img) or '-'))
    if usuniete:
        print('  usuniete z witryny (w Git zostaja): %s' % ', '.join(usuniete))
    print('  limit=%d, wersji na stronie=%d' % (limit, len(idx['wersje'])))

    if a.push:
        def run(*cmd):
            print('  > ' + ' '.join(cmd))
            subprocess.run(cmd, cwd=ROOT, check=False)
        run('git', 'add', '-A')
        run('git', '-c', 'user.name=koradus4',
            '-c', 'user.email=konradborkowski25@gmail.com',
            'commit', '-m', 'Wersja %s: %s' % (vid, a.tytul))
        run('git', 'push')

    if a.deploy:
        key = os.environ.get('RENDER_API_KEY', '')
        if not key:
            print('  ! brak RENDER_API_KEY w srodowisku — deploy pominiety')
        else:
            req = urllib.request.Request(
                'https://api.render.com/v1/services/%s/deploys' % RENDER_SERVICE,
                data=b'{"clearCache":"clear"}', method='POST',
                headers={'Authorization': 'Bearer ' + key,
                         'Content-Type': 'application/json',
                         'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=60) as r:
                print('  deploy: HTTP %d' % r.status)


if __name__ == '__main__':
    main()
