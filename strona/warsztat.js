/* ===== Warsztat — historia wersji projektu ===== */
(function initWarsztat() {
  const osEl = document.getElementById('os');
  if (!osEl) return;

  const badge = document.getElementById('wersjaBadge');
  const tytul = document.getElementById('wTytul');
  const dataEl = document.getElementById('wData');
  const opisEl = document.getElementById('wOpis');
  const paramsEl = document.getElementById('wParams');
  const plikiEl = document.getElementById('wPliki');
  const galEl = document.getElementById('wGal');

  let wersje = [], cur = 0, trzy = null;

  /* --- kolory części --- */
  function kolor(nazwa) {
    const n = nazwa.toLowerCase();
    if (n.includes('obrecz') || n.includes('obręcz')) return 0x14161a;
    if (n.includes('srodek') || n.includes('środek')) return 0x9aa1a8;
    if (n.includes('sruba') || n.includes('śruba')) return 0x7d838a;
    if (n.includes('nasadka')) return 0xb9bec3;
    if (n.includes('tarcza')) return 0xffc400;
    if (n.includes('wal') || n.includes('wał')) return 0xc9ced4;
    if (n.includes('lozysk') || n.includes('łożysk')) return 0x6b7280;
    if (n.includes('podstawa')) return 0x3b4450;
    return 0x8f979f;
  }
  function metal(name) {
    const n = name.toLowerCase();
    if (n.includes('obrecz')) return { m: 0.55, r: 0.42 };
    if (n.includes('srodek')) return { m: 0.8, r: 0.32 };
    return { m: 0.7, r: 0.38 };
  }

  /* --- 3D --- */
  async function init3D() {
    let THREE, OrbitControls, STLLoader;
    try {
      THREE = await import('three');
      ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
      ({ STLLoader } = await import('three/addons/loaders/STLLoader.js'));
    } catch (e) {
      document.getElementById('wviewer').innerHTML =
        '<p style="padding:20px;color:#9aa1a8">Nie udało się wczytać biblioteki 3D.</p>';
      return;
    }
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

    const outer = new THREE.Group();
    outer.rotation.x = -Math.PI / 2;
    scene.add(outer);
    const spin = new THREE.Group();
    outer.add(spin);
    const ghost = new THREE.Group();
    outer.add(ghost);

    function resize() {
      const w = host.clientWidth || 600, h = host.clientHeight || 440;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    addEventListener('resize', resize);

    (function loop() {
      requestAnimationFrame(loop);
      if (trzy && trzy.auto) spin.rotation.z += 0.0045;
      controls.update();
      renderer.render(scene, camera);
    })();

    trzy = { THREE, OrbitControls, STLLoader, scene, camera, controls, renderer,
             spin, ghost, home: HOME, auto: true, wire: false, porownaj: false };
  }

  function wyczysc(grupa) {
    while (grupa.children.length) {
      const o = grupa.children.pop();
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    }
  }

  function wczytaj(meta, grupa, ghostMode) {
    const loader = new trzy.STLLoader();
    (meta.model || []).forEach(fn => {
      loader.load('wersje/' + meta.id + '/' + fn, geo => {
        geo.computeVertexNormals();
        const mat = ghostMode
          ? new three_part_material(false)
          : new three_part_material(true, kolor(fn), fn);
        const mesh = new trzy.THREE.Mesh(geo, mat);
        grupa.add(mesh);
      }, undefined, () => {});
    });
  }
  function three_part_material(solid, col, fn) {
    const THREE = trzy.THREE;
    if (!solid) return new THREE.MeshStandardMaterial({
      color: 0xffc400, transparent: true, opacity: 0.18, wireframe: true
    });
    const mm = metal(fn || '');
    return new THREE.MeshStandardMaterial({ color: col, metalness: mm.m, roughness: mm.r });
  }

  function pokazWersje(i) {
    if (!wersje.length || !trzy) return;
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
    (w.model || []).forEach(fn => {
      plikiEl.insertAdjacentHTML('beforeend',
        '<a href="wersje/' + w.id + '/' + fn + '" download>⬇ ' + fn + '</a>');
    });
    if (w.zrodlo) {
      plikiEl.insertAdjacentHTML('beforeend',
        '<a href="wersje/' + w.id + '/' + w.zrodlo + '" download>⬇ źródło (FreeCAD)</a>');
    }

    galEl.innerHTML = '';
    (w.img || []).forEach(fn => {
      galEl.insertAdjacentHTML('beforeend',
        '<figure><a href="wersje/' + w.id + '/' + fn + '" target="_blank">' +
        '<img src="wersje/' + w.id + '/' + fn + '" alt="' + w.id + '"></a></figure>');
    });

    wyczysc(trzy.spin);
    wyczysc(trzy.ghost);
    wczytaj(w, trzy.spin, false);
    if (trzy.porownaj && wersje[cur + 1]) wczytaj(wersje[cur + 1], trzy.ghost, true);
  }

  /* --- os czasu --- */
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
    if (badge) badge.textContent = wersje.length + ' wersje';
  }

  fetch('wersje/index.json').then(r => r.json()).then(j => {
    wersje = (j.wersje || []);
    renderOs();
  }).catch(() => {
    osEl.innerHTML = '<p class="hint">Nie udało się wczytać historii wersji.</p>';
  });

  init3D().then(() => {
    const wait = setInterval(() => {
      if (wersje.length && trzy) { pokazWersje(0); clearInterval(wait); }
    }, 200);
  });

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
    if (trzy.porownaj && wersje[cur + 1]) wczytaj(wersje[cur + 1], trzy.ghost, true);
  };
})();
