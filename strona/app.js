/* ===== Projekt „Felga" — logika strony ===== */

/* ---------- pasek postępu ---------- */
const bar = document.getElementById('progressBar');
addEventListener('scroll', () => {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
});

/* ---------- menu mobilne ---------- */
document.getElementById('menuBtn').onclick = () =>
  document.getElementById('sidebar').classList.toggle('open');
document.querySelectorAll('#sidebar a').forEach(a =>
  a.addEventListener('click', () => document.getElementById('sidebar').classList.remove('open')));

/* ---------- 3D: felga do obracania ---------- */
(async function init3D() {
  const host = document.getElementById('viewer');
  if (!host) return;
  let THREE, OrbitControls, STLLoader;
  try {
    THREE = await import('three');
    ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
    ({ STLLoader } = await import('three/addons/loaders/STLLoader.js'));
  } catch (e) {
    host.innerHTML = '<p style="padding:20px;color:#5c6570">Nie udało się wczytać biblioteki 3D.</p>';
    return;
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (e) {
    host.innerHTML = '<p style="padding:20px;color:#5c6570">Brak obsługi WebGL w tej przeglądarce.</p>';
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeef1f4);

  const camera = new THREE.PerspectiveCamera(38, 1, 1, 6000);
  const HOME = new THREE.Vector3(520, 430, 520);
  camera.position.copy(HOME);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f46, 1.15));
  const l1 = new THREE.DirectionalLight(0xffffff, 1.35); l1.position.set(600, 900, 700); scene.add(l1);
  const l2 = new THREE.DirectionalLight(0xffffff, 0.55); l2.position.set(-700, -400, -600); scene.add(l2);

  const outer = new THREE.Group();
  outer.rotation.x = -Math.PI / 2;            // felga leży płasko (oś = pion)
  scene.add(outer);
  const spin = new THREE.Group();             // obrót wokół osi felgi
  outer.add(spin);

  const loader = new STLLoader();
  const parts = [
    ['model/obrecz.stl', 0x14161a, 0.55, 0.42],
    ['model/srodek.stl', 0x9aa0a6, 0.80, 0.32]
  ];
  parts.forEach(([src, col, met, rou]) => {
    loader.load(src, geo => {
      geo.computeVertexNormals();
      spin.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: col, metalness: met, roughness: rou
      })));
    }, undefined, () => {
      host.insertAdjacentHTML('beforeend',
        '<p style="padding:10px 14px;color:#5c6570">Nie udało się wczytać pliku modelu.</p>');
    });
  });

  function resize() {
    const w = host.clientWidth || 600;
    const h = host.clientHeight || 460;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  let wire = false, auto = true;
  document.getElementById('btnReset').onclick = () => {
    camera.position.copy(HOME); controls.target.set(0, 0, 0);
  };
  document.getElementById('btnWire').onclick = () => {
    wire = !wire;
    spin.traverse(o => { if (o.isMesh) o.material.wireframe = wire; });
  };
  const spinBtn = document.getElementById('btnSpin');
  spinBtn.onclick = () => {
    auto = !auto;
    spinBtn.textContent = 'Obrót: ' + (auto ? 'ON' : 'OFF');
  };

  (function loop() {
    requestAnimationFrame(loop);
    if (auto) spin.rotation.z += 0.0045;
    controls.update();
    renderer.render(scene, camera);
  })();
})();

/* ---------- QUIZ ---------- */
const QUIZ = [
  ['Co oznacza „7.5J" na feldze?',
   ['Szerokość felgi 7,5 cala (rant typu J)', 'Średnica felgi 7,5 cala', 'Nośność 7,5 tony'], 0,
   '7.5J = 7,5 cala szerokości między rantami; litera J opisuje profil rantu.'],
  ['Parametr ET35 to:',
   ['Odsadzenie — płaszczyzna montażu 35 mm od środka felgi', 'Średnica otworu centrującego', 'Rozstaw śrub 35 mm'], 0,
   'ET (offset) mówi, jak głęboko felga wchodzi w nadkole.'],
  ['Oznaczenie 5×112 opisuje:',
   ['5 otworów na okręgu o średnicy 112 mm', '5 cali szerokości, 112 mm ET', 'Średnicę felgi 112 mm'], 0,
   'PCD — rozstaw śrub: liczba otworów × średnica okręgu.'],
  ['CB Ø57,1 mm to:',
   ['Otwór centrujący dopasowany do piasty', 'Średnica rantu', 'Grubość tarczy felgi'], 0,
   'CB centruje felgę na piaście — kluczowe dla bicia i wyważenia.'],
  ['Stop aluminium typowy na felgi odlewane to:',
   ['A356.0 (T6)', '6061-T6', 'PA6', 'St3'], 0,
   'A356.0-T6 — odlewniczy stop Al-Si-Mg. 6061-T6 stosuje się do felg kutych.'],
  ['Technologia „flow forming" polega na:',
   ['Formowaniu materiału przez płynięcie na obracającym się trzpieniu', 'Odlaniu felgi w formie', 'Frezowaniu z bloku'], 0,
   'Daje cienkie i mocne ścianki — pośrednie między odlewem a kuciem.']
];
(function initQuiz() {
  const box = document.getElementById('quiz');
  const scoreEl = document.getElementById('quizScore');
  if (!box) return;
  let done = 0, ok = 0;
  QUIZ.forEach(([q, answers, correct, why], i) => {
    const d = document.createElement('div');
    d.className = 'q';
    d.innerHTML = '<p>' + (i + 1) + '. ' + q + '</p>';
    answers.forEach((a, j) => {
      const b = document.createElement('button');
      b.textContent = a;
      b.onclick = () => {
        if (d.dataset.done) return;
        d.dataset.done = '1';
        done++;
        if (j === correct) { b.classList.add('ok'); ok++; }
        else {
          b.classList.add('bad');
          d.querySelectorAll('button')[correct].classList.add('ok');
        }
        d.insertAdjacentHTML('beforeend', '<p class="why">' + why + '</p>');
        scoreEl.textContent = ok + '/' + QUIZ.length;
      };
      d.appendChild(b);
    });
    box.appendChild(d);
  });
})();

/* ---------- BOM + kalkulator ---------- */
const BOM = [
  ['Elektronika', 'Silnik krokowy NEMA 17 (17HS4401, 0,4 Nm)', 45, false],
  ['Elektronika', 'Sterownik DRV8825 / TMC2209', 10, false],
  ['Elektronika', 'Moduł ESP32 (Feather / DevKit)', 45, true],
  ['Elektronika', 'Zasilacz 12 V 3 A lub 24 V 2 A', 45, false],
  ['Elektronika', 'Przetwornica step-down (24→5 V)', 7, false],
  ['Elektronika', 'Kondensator 220 µF, przewody, płytka', 20, false],
  ['Mechanika', 'Łożyska 608 × 2 (22×8×7)', 10, false],
  ['Mechanika', 'Wał Ø8 × 150 mm', 15, false],
  ['Mechanika', 'Koła GT2 20T + 40T i pasek 220 mm', 45, false],
  ['Mechanika', 'Śruby i nakrętki M3–M6', 20, false],
  ['Materiały', 'Filament PETG 1 kg', 75, false],
  ['Czujniki', 'Czujnik Hall A3144 (obroty)', 5, false],
  ['Czujniki', 'MPU6050 (drgania / wyważenie)', 12, false],
  ['Czujniki', 'INA219 (pomiar prądu)', 15, false],
  ['Czujniki', 'OLED 0,96" (wskaźnik obrotów)', 15, false],
  ['Czujniki', 'Enkoder obrotowy (regulacja)', 8, false]
];
(function initBOM() {
  const host = document.getElementById('bomTable');
  const sumEl = document.getElementById('bomSum');
  if (!host) return;
  let group = '';
  BOM.forEach(([g, name, price, mam], i) => {
    if (g !== group) {
      group = g;
      host.insertAdjacentHTML('beforeend', '<div class="bom-group">' + g + '</div>');
    }
    const row = document.createElement('label');
    row.className = 'bom-row' + (mam ? ' mam' : '');
    row.innerHTML = '<input type="checkbox" ' + (mam ? 'checked' : '') + '>'
      + '<span class="name">' + name + '</span>'
      + '<span class="price">' + price + ' zł</span>';
    const cb = row.querySelector('input');
    cb.onchange = () => {
      BOM[i][3] = cb.checked;
      row.classList.toggle('mam', cb.checked);
      recount();
    };
    host.appendChild(row);
  });
  function recount() {
    const left = BOM.filter(r => !r[3]).reduce((s, r) => s + r[2], 0);
    sumEl.textContent = left + ' zł';
  }
  recount();
})();

/* ---------- roadmapa ---------- */
const ROAD = [
  ['done', 'Etap 0 — Plan i organizacja', 'tytuł, struktura pracy, repozytorium, strona projektu, lista części'],
  ['now', 'Etap 1 — Model CAD + analiza FEM', 'parametryczny model felgi (gotowy) + obliczenia naprężeń w FreeCAD'],
  ['todo', 'Etap 2 — Stanowisko mechaniczne', 'tarcza montażowa, wał Ø8, łożyska 608, podstawa, mocowanie NEMA 17'],
  ['todo', 'Etap 3 — Elektronika i firmware', 'ESP32 + sterownik + czujniki, strona z regulacją obrotów, log danych'],
  ['todo', 'Etap 4 — Wydruk i montaż', 'wydruk 45% (OrcaSlicer), składanie felgi, pasowanie na stanowisku'],
  ['todo', 'Etap 5 — Badania i wnioski', 'pomiary RPM/drgań/bicia, próba wyważania, porównanie wariantów'],
  ['todo', 'Etap 6 — Redakcja i obrona', 'tekst pracy, rysunki, prezentacja, arkusz wyników']
];
(function initRoad() {
  const el = document.getElementById('roadmap');
  if (!el) return;
  el.innerHTML = ROAD.map(([st, t, d]) =>
    '<li class="' + st + '"><b>' + t + '</b><small>' + d + '</small></li>').join('');
})();

/* ---------- STACJA NAUKI (korepetytor AI) ---------- */
(function initNauka() {
  const tilesEl = document.getElementById('naukaTiles');
  const panel = document.getElementById('naukaPanel');
  if (!tilesEl || !panel) return;

  const API = (window.FELGA_API || '').replace(/\/$/, '');
  const LS = 'felga_nauka_v1';
  let store = {};
  try { store = JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { store = {}; }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(store)); } catch (e) {} };

  let subs = [
    { id: 'matematyka', name: 'Matematyka', icon: '🔢', desc: 'Od liczb do funkcji',
      levels: ['Liczby, ułamki, procenty', 'Potęgi i jednostki', 'Równania i wzory', 'Geometria', 'Trygonometria i warsztat'] },
    { id: 'fizyka', name: 'Fizyka', icon: '⚙️', desc: 'Siły, ruch, energia',
      levels: ['Siła i masa', 'Ruch', 'Energia, moc, tarcie', 'Ciśnienie i ciepło', 'Prąd i magnetyzm'] },
    { id: 'elektrotechnika', name: 'Elektrotechnika', icon: '⚡', desc: 'Prąd, obwody, czujniki',
      levels: ['Prąd, napięcie, opór', 'Obwody i bezpieczniki', 'Akumulator i alternator', 'Czujniki', 'Elektronika i mikrokontroler'] },
    { id: 'angielski', name: 'Angielski techniczny', icon: '🔤', desc: 'Słowa z warsztatu i katalogów',
      levels: ['Narzędzia i części', 'Instrukcje', 'Bezpieczeństwo (BHP)', 'Dane techniczne', 'Katalogi i dokumentacja'] }
  ];
  let cur = null, mode = 'lesson';

  const statusEl = document.getElementById('naukaStatus');
  const logEl = document.getElementById('naukaLog');
  const txtEl = document.getElementById('naukaText');
  const sendBtn = document.getElementById('naukaSend');
  const levelSel = document.getElementById('naukaLevel');

  const setStatus = (t, cls) => { statusEl.textContent = t; statusEl.className = 'badge ' + (cls || ''); };
  const data = id => { if (!store[id]) store[id] = { level: 0, log: [] }; return store[id]; };

  function fmt(t) {
    return String(t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>');
  }
  function addBubble(role, text) {
    const d = document.createElement('div');
    d.className = 'm ' + role;
    d.innerHTML = fmt(text);
    logEl.appendChild(d);
    logEl.scrollTop = logEl.scrollHeight;
    return d;
  }
  function renderLog() {
    logEl.innerHTML = '';
    const log = data(cur).log;
    if (!log.length) {
      addBubble('ai', 'Cześć! Jestem Twoim korepetytorem. 🤖\nWybierz poziom i kliknij **▶ Start tematu** — albo od razu pytaj.');
    } else {
      log.forEach(m => addBubble(m.role === 'user' ? 'user' : 'ai', m.text));
    }
  }

  /* --- zdjęcia zadania (telefon: aparat) --- */
  const fotoInput = document.getElementById('naukaFoto');
  const prevEl = document.getElementById('naukaPreview');
  let pending = [];

  function renderPrev() {
    if (!prevEl) return;
    prevEl.innerHTML = '';
    prevEl.hidden = pending.length === 0;
    pending.forEach((u, i) => {
      const d = document.createElement('div');
      d.className = 'thumb';
      d.innerHTML = '<img src="' + u + '" alt="zdjęcie"><span title="usuń">×</span>';
      d.querySelector('span').onclick = () => { pending.splice(i, 1); renderPrev(); };
      prevEl.appendChild(d);
    });
  }

  function downscale(dataUrl, cb) {
    const img = new Image();
    img.onload = () => {
      const MAX = 1280;
      const s = Math.min(1, MAX / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      try { cb(c.toDataURL('image/jpeg', 0.85)); } catch (e) { cb(dataUrl); }
    };
    img.onerror = () => cb(dataUrl);
    img.src = dataUrl;
  }

  function pickPhoto() { if (fotoInput) fotoInput.click(); }
  const fotoBtn = document.getElementById('naukaFotoBtn');
  const fotoQuick = document.getElementById('naukaFotoQuick');
  if (fotoBtn) fotoBtn.onclick = pickPhoto;
  if (fotoQuick) fotoQuick.onclick = pickPhoto;
  if (fotoInput) fotoInput.onchange = () => {
    const f = fotoInput.files && fotoInput.files[0];
    fotoInput.value = '';
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => downscale(fr.result, u => { pending.push(u); renderPrev(); });
    fr.readAsDataURL(f);
  };

  async function send(text) {
    text = (text || '').trim();
    if ((!text && !pending.length) || !cur) return;
    const imgs = pending.slice();
    const tryb = imgs.length ? 'photo' : mode;
    if (imgs.length && !text) text = 'Zadanie ze zdjęcia — przeczytaj i poprowadź mnie krok po kroku.';
    const d = data(cur);
    const shown = text + (imgs.length ? '  📷(' + imgs.length + ')' : '');
    d.log.push({ role: 'user', text: shown });
    addBubble('user', shown);
    if (imgs.length) { pending = []; renderPrev(); }
    save();
    txtEl.value = '';
    sendBtn.disabled = true;
    const wait = addBubble('ai', imgs.length
      ? '…czytam zdjęcie i myślę… (po dłuższej przerwie AI budzi się do ~30 s)'
      : '…myślę… (po dłuższej przerwie AI budzi się do ~30 s)');
    try {
      const r = await fetch(API + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: cur, mode: tryb, level: d.level,
          messages: d.log, images: imgs
        })
      });
      const j = await r.json();
      wait.remove();
      const reply = j.reply || ('⚠️ ' + (j.error || 'Błąd AI'));
      d.log.push({ role: 'ai', text: reply });
      addBubble('ai', reply);
      save();
    } catch (e) {
      wait.remove();
      addBubble('ai', '⚠️ Nie mogę połączyć się z AI.\nLokalnie: uruchom serwer (`cd serwer` → `node server.js`).\nOnline: sprawdź usługę na Renderze (patrz START.md).');
    }
    sendBtn.disabled = false;
  }

  function renderTiles() {
    tilesEl.innerHTML = '';
    subs.forEach(s => {
      const b = document.createElement('button');
      b.className = 'tile';
      b.innerHTML = '<span class="ic">' + (s.icon || '📘') + '</span><b>' + s.name +
        '</b><small>' + (s.desc || '') + '</small>';
      b.onclick = () => openSubject(s.id);
      tilesEl.appendChild(b);
    });
  }

  function openSubject(id) {
    cur = id;
    mode = 'lesson';
    const s = subs.find(x => x.id === id) || { id: id, name: id, levels: [] };
    document.getElementById('naukaTitle').textContent = (s.icon || '') + ' ' + s.name;
    levelSel.innerHTML = '';
    (s.levels || []).forEach((t, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = 'Poziom ' + i + ' — ' + t;
      levelSel.appendChild(o);
    });
    levelSel.value = String(data(id).level || 0);
    document.getElementById('modeLesson').classList.add('on');
    document.getElementById('modeQuiz').classList.remove('on');
    tilesEl.hidden = true;
    panel.hidden = false;
    renderLog();
    txtEl.focus();
  }

  document.getElementById('naukaBack').onclick = () => { panel.hidden = true; tilesEl.hidden = false; };
  document.getElementById('modeLesson').onclick = () => {
    mode = 'lesson';
    document.getElementById('modeLesson').classList.add('on');
    document.getElementById('modeQuiz').classList.remove('on');
  };
  document.getElementById('modeQuiz').onclick = () => {
    mode = 'quiz';
    document.getElementById('modeQuiz').classList.add('on');
    document.getElementById('modeLesson').classList.remove('on');
  };
  levelSel.onchange = () => { data(cur).level = parseInt(levelSel.value, 10) || 0; save(); };
  sendBtn.onclick = () => send(txtEl.value);
  txtEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(txtEl.value); }
  });
  document.getElementById('naukaClear').onclick = () => {
    if (!cur) return;
    data(cur).log = [];
    save();
    renderLog();
  };
  document.querySelectorAll('.quick button[data-q]').forEach(b => {
    b.onclick = () => send(b.getAttribute('data-q'));
  });

  renderTiles();

  fetch(API + '/api/subjects').then(r => r.json()).then(j => {
    if (j.subjects && j.subjects.length) { subs = j.subjects; renderTiles(); }
  }).catch(() => {});

  fetch(API + '/api/health').then(r => r.json()).then(j => {
    if (j.mock) setStatus('AI: tryb testowy', 'warn');
    else if (j.hasKey) setStatus('AI: gotowe', 'ok');
    else setStatus('AI: brak klucza', 'warn');
  }).catch(() => setStatus('AI offline', 'bad'));
})();

/* ---------- lightbox ---------- */
(function initLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const img = lb.querySelector('img');
  document.querySelectorAll('.gal img').forEach(i => i.onclick = () => {
    img.src = i.src;
    lb.hidden = false;
  });
  lb.onclick = () => { lb.hidden = true; img.src = ''; };
})();
