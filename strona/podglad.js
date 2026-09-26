/* ===== Podgląd wybranych części (osobna strona, do wysłania/QR) ===== */
(async function () {
  const q = new URLSearchParams(location.search);
  const wersja = q.get('wersja') || 'v1';
  const wybrane = (q.get('czesci') || '').split(',').map(s => s.trim()).filter(Boolean);

  const info = document.getElementById('pInfo');
  const title = document.getElementById('pTitle');
  const lista = document.getElementById('pLista');
  document.getElementById('pZip').href = 'wersje/' + wersja + '/projekt.zip';

  let THREE, OrbitControls, STLLoader;
  try {
    THREE = await import('three');
    ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
    ({ STLLoader } = await import('three/addons/loaders/STLLoader.js'));
  } catch (e) {
    document.getElementById('pviewer').innerHTML =
      '<p style="padding:20px;color:#9aa1a8">Nie udało się wczytać biblioteki 3D.</p>';
    return;
  }

  let czesci = [];
  try {
    const meta = await (await fetch('wersje/index.json')).json();
    const w = (meta.wersje || []).find(x => x.id === wersja);
    title.textContent = w ? (w.id.toUpperCase() + ' · ' + w.tytul) : wersja.toUpperCase();

    const r = await fetch('wersje/' + wersja + '/czesci.json');
    czesci = await r.json();
    if (!Array.isArray(czesci)) throw new Error('zly format');
  } catch (e) {
    czesci = [];
  }
  if (wybrane.length) czesci = czesci.filter(c => wybrane.includes(c.id));
  if (!czesci.length) {
    document.getElementById('pviewer').innerHTML =
      '<p style="padding:20px;color:#9aa1a8">Nie znaleziono części do pokazania.</p>';
    return;
  }
  info.textContent = czesci.length + ' ' + (czesci.length === 1 ? 'część' : 'części');
  lista.innerHTML = '<b>Pokazane części:</b> ' + czesci.map(c =>
    '<a href="wersje/' + wersja + '/' + c.plik + '" download>⬇ ' + c.nazwa + ' (STL)</a>' +
    (c.step ? '<a href="wersje/' + wersja + '/' + c.step + '" download>STEP — otwórz w FreeCAD</a>' : '')
  ).join(' ');

  /* --- viewer --- */
  const host = document.getElementById('pviewer');
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

  const HEX = c => parseInt(String(c).replace('#', ''), 16) || 0x8f979f;
  const loader = new STLLoader();
  czesci.forEach(c => {
    loader.load('wersje/' + wersja + '/' + c.plik, geo => {
      geo.computeVertexNormals();
      spin.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: HEX(c.kolor), metalness: 0.7, roughness: 0.38
      })));
    }, undefined, () => {});
  });

  function resize() {
    const w = host.clientWidth || 600, h = host.clientHeight || 520;
    renderer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  let auto = true;
  (function loop() {
    requestAnimationFrame(loop);
    if (auto) spin.rotation.z += 0.0045;
    controls.update();
    renderer.render(scene, camera);
  })();

  document.getElementById('pReset').onclick = () => {
    camera.position.copy(HOME); controls.target.set(0, 0, 0);
  };
  document.getElementById('pWire').onclick = () => {
    spin.traverse(o => { if (o.isMesh) o.material.wireframe = !o.material.wireframe; });
  };
  const sb = document.getElementById('pSpin');
  sb.onclick = () => { auto = !auto; sb.textContent = 'Obrót: ' + (auto ? 'ON' : 'OFF'); };
})();
