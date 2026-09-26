/* ===== Warsztat — historia wersji + czesci ===== */
(async function () {
  const osEl = document.getElementById('os');
  if (!osEl) return;

  const badge = document.getElementById('wersjaBadge');
  const tytul = document.getElementById('wTytul');
  const dataEl = document.getElementById('wData');
  const opisEl = document.getElementById('wOpis');
  const paramsEl = document.getElementById('wParams');
  const plikiEl = document.getElementById('wPliki');
  const galEl = document.getElementById('wGal');
  const czesciEl = document.getElementById('wCzesci');
  const eksportEl = document.getElementById('wEksport');
  const osobnoA = document.getElementById('wOsobno');

  let wersje = [], cur = 0, trzy = null, czesci = [], meshById = {};

  const HEX = c => parseInt(String(c).replace('#', ''), 16) || 0x8f979f;

  /* --- 3D --- */
  let THREE, OrbitControls, STLLoader;
  try {
    THREE = await import('three');
    ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
    ({ STLLoader } = await import('three/addons/loaders/STLLoader.js'));
  } catch (e) {
    document.getElementById('wviewer').innerHTML =
      '<p style="padding:20px;color:#9aa1a8">Nie udało się wczytać biblioteki 3D.</p>';
  }

  if (THREE) {
    const host = document.getElementById('wviewer');
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12161b);
    const camera = new THREE.PerspectiveCamera(38, 1, 1, 8000);
    const HOME = new THREE.Vector3(520, 430, 520);
    camera.position.copy(HOME);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3037, 1.15));
    const l1 = new THREE.DirectionalLight(0xffffff, 1.35); l1.position.set(600, 900, 700); scene.add(l1);
    const l2 = new THREE.DirectionalLight(0xffffff, 0.55); l2.position.set(-700, -400, -600); scene.add(l2);
    const outer = new THREE.Group(); outer.rotation.x = -Math.PI / 2; scene.add(outer);
    const spin = new THREE.Group(); outer.add(spin);
    const ghost = new THREE.Group(); outer.add(ghost);

    function resize() {
      const w = host.clientWidth || 600, h = host.clientHeight || 440;
      renderer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    resize(); addEventListener('resize', resize);
    (function loop() {
      requestAnimationFrame(loop);
      if (trzy && trzy.auto) spin.rotation.z += 0.0045;
      controls.update();
      renderer.render(scene, camera);
    })();
    trzy = { scene, camera, controls, spin, ghost, home: HOME, auto: true, wire: false, porownaj: false };
  }

  const wyczysc = g => { while (g.children.length) { const o = g.children.pop(); if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); } };

  function matCzesci(c) {
    return new THREE.MeshStandardMaterial({ color: HEX(c.kolor), metalness: 0.7, roughness: 0.38 });
  }

  function wczytajCzesci(meta, lista, grupa, ghostMode) {
    const loader = new STLLoader();
    lista.forEach(c => {
      loader.load('wersje/' + meta.id + '/' + c.plik, geo => {
        geo.computeVertexNormals();
        const mat = ghostMode
          ? new THREE.MeshStandardMaterial({ color: 0xffc400, transparent: true, opacity: 0.16, wireframe: true })
          : matCzesci(c);
        const m = new THREE.Mesh(geo, mat);
        m.visible = ghostMode ? true : (c.widoczna !== false);
        grupa.add(m);
        if (!ghostMode) meshById[c.id] = m;
      }, undefined, () => {});
    });
  }

  /* --- zakładki części --- */
  function renderCzesci() {
    if (!czesciEl) return;
    czesciEl.innerHTML = '';
    const grupy = {};
    czesci.forEach(c => { (grupy[c.grupa || 'projekt'] = grupy[c.grupa || 'projekt'] || []).push(c); });
    Object.keys(grupy).forEach(g => {
      czesciEl.insertAdjacentHTML('beforeend', '<span class="grp">' + g + '</span>');
      grupy[g].forEach(c => {
        const b = document.createElement('button');
        b.className = 'chip' + (c.widoczna !== false ? ' on' : '');
        b.innerHTML = '<i style="background:' + (c.kolor || '#8f979f') + '"></i>' + c.nazwa;
        b.onclick = () => {
          c.widoczna = c.widoczna === false;
          b.classList.toggle('on', c.widoczna !== false);
          if (meshById[c.id]) meshById[c.id].visible = c.widoczna !== false;
          updateEksport();
        };
        czesciEl.appendChild(b);
      });
    });
    const all = document.createElement('button');
    all.className = 'chip all';
    all.textContent = 'Wszystkie';
    all.onclick = () => {
      czesci.forEach(c => c.widoczna = true);
      Object.values(meshById).forEach(m => m.visible = true);
      renderCzesci();
    };
    czesciEl.appendChild(all);
  }

  function updateEksport() {
    if (!eksportEl) return;
    const w = wersje[cur];
    const sel = czesci.filter(c => c.widoczna !== false);
    if (!sel.length) { eksportEl.innerHTML = 'Nic nie zaznaczono.'; return; }
    eksportEl.innerHTML = '<b>Pobierz zaznaczone:</b> ' + sel.map(c =>
      '<a href="wersje/' + w.id + '/' + c.plik + '" download>⬇ ' + c.id + '.stl</a>' +
      (c.step ? '<a href="wersje/' + w.id + '/' + c.step + '" download>STEP</a>' : '')
    ).join(' ') + ' <a href="wersje/' + w.id + '/projekt.zip" download>📦 cała wersja (ZIP)</a>';
    if (osobnoA) {
      osobnoA.href = 'podglad.html?wersja=' + w.id + '&czesci=' + sel.map(c => c.id).join(',');
    }
  }

  /* --- wersja --- */
  async function pokazWersje(i) {
    if (!wersje.length) return;
    cur = Math.max(0, Math.min(wersje.length - 1, i));
    const w = wersje[cur];

    document.querySelectorAll('.os .wv').forEach((b, k) => b.classList.toggle('on', k === cur));
    tytul.textContent = w.id.toUpperCase() + ' · ' + w.tytul;
    dataEl.textContent = 'opublikowano: ' + (w.data || '—');
    opisEl.textContent = w.opis || '';

    paramsEl.innerHTML = '';
    Object.entries(w.parametry || {}).forEach(([k, v]) => {
      paramsEl.insertAdjacentHTML('beforeend', '<tr><td>' + k + '</td><td>' + v + '</td></tr>');
    });

    plikiEl.innerHTML = '';
    (w.model || []).forEach(fn => plikiEl.insertAdjacentHTML('beforeend',
      '<a href="wersje/' + w.id + '/' + fn + '" download>⬇ ' + fn + '</a>'));
    if (w.zrodlo) plikiEl.insertAdjacentHTML('beforeend',
      '<a href="wersje/' + w.id + '/' + w.zrodlo + '" download>⬇ źródło (FreeCAD)</a>');

    galEl.innerHTML = '';
    (w.img || []).forEach(fn => galEl.insertAdjacentHTML('beforeend',
      '<figure><a href="wersje/' + w.id + '/' + fn + '" target="_blank">' +
      '<img src="wersje/' + w.id + '/' + fn + '" alt=""></a></figure>'));

    if (!trzy) return;
    wyczysc(trzy.spin); wyczysc(trzy.ghost);
    meshById = {};
    try {
      const r = await fetch('wersje/' + w.id + '/czesci.json');
      czesci = await r.json();
      if (!Array.isArray(czesci)) throw new Error('zly format');
    } catch (e) {
      czesci = (w.model || []).map(fn => ({
        id: fn.replace('.stl', ''), nazwa: fn, plik: fn,
        grupa: 'projekt', kolor: '#8f979f', widoczna: true
      }));
    }
    renderCzesci();
    wczytajCzesci(w, czesci, trzy.spin, false);
    if (trzy.porownaj && wersje[cur + 1]) wczytajCzesci(wersje[cur + 1], czesci, trzy.ghost, true);
    updateEksport();
  }

  function renderOs() {
    osEl.innerHTML = '';
    wersje.forEach((w, i) => {
      const b = document.createElement('button');
      b.className = 'wv' + (i === 0 ? ' on' : '');
      const thumb = (w.img && w.img[0]) ? 'wersje/' + w.id + '/' + w.img[0] : '';
      b.innerHTML = (thumb ? '<img src="' + thumb + '" alt="">' : '') +
        '<span class="t"><b>' + w.id.toUpperCase() + '</b>' + (w.tytul || '') +
        '<small>' + (w.data || '') + '</small></span>';
      b.onclick = () => pokazWersje(i);
      osEl.appendChild(b);
    });
    if (badge) badge.textContent = wersje.length + ' wersji';
  }

  try {
    const j = await (await fetch('wersje/index.json')).json();
    wersje = j.wersje || [];
    renderOs();
  } catch (e) {
    osEl.innerHTML = '<p class="hint">Nie udało się wczytać historii wersji.</p>';
  }

  if (trzy && wersje.length) pokazWersje(0);

  document.getElementById('wReset').onclick = () => {
    if (!trzy) return;
    trzy.camera.position.copy(trzy.home);
    trzy.controls.target.set(0, 0, 0);
  };
  document.getElementById('wWire').onclick = () => {
    if (!trzy) return;
    trzy.wire = !trzy.wire;
    trzy.spin.traverse(o => { if (o.isMesh) o.material.wireframe = trzy.wire; });
  };
  const spinBtn = document.getElementById('wSpin');
  spinBtn.onclick = () => {
    if (!trzy) return;
    trzy.auto = !trzy.auto;
    spinBtn.textContent = 'Obrót: ' + (trzy.auto ? 'ON' : 'OFF');
  };
  const porBtn = document.getElementById('wPorownaj');
  porBtn.onclick = () => {
    if (!trzy || !wersje.length) return;
    trzy.porownaj = !trzy.porownaj;
    porBtn.textContent = trzy.porownaj ? 'Porównanie: ON' : 'Porównaj z poprzednią';
    wyczysc(trzy.ghost);
    if (trzy.porownaj && wersje[cur + 1]) wczytajCzesci(wersje[cur + 1], czesci, trzy.ghost, true);
  };
})();
