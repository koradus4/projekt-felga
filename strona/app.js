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
