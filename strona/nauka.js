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
    { id: 'zadania', name: 'Zadania domowe', icon: '📚', desc: 'Zdjęcie z zeszytu → wytłumaczenie',
      levels: ['Matematyka', 'Fizyka', 'Zawodowe', 'Chemia', 'Mieszane'] },
    { id: 'matematyka', name: 'Matematyka', icon: '🔢', desc: 'Od liczb do funkcji',
      levels: ['Liczby, ułamki, procenty', 'Potęgi i jednostki', 'Równania i wzory', 'Geometria', 'Trygonometria i warsztat'] },
    { id: 'fizyka', name: 'Fizyka', icon: '⚙️', desc: 'Siły, ruch, energia',
      levels: ['Siła i masa', 'Ruch', 'Energia, moc, tarcie', 'Ciśnienie i ciepło', 'Prąd i magnetyzm'] },
    { id: 'elektrotechnika', name: 'Elektrotechnika', icon: '⚡', desc: 'Prąd, obwody, czujniki',
      levels: ['Prąd, napięcie, opór', 'Obwody i bezpieczniki', 'Akumulator i alternator', 'Czujniki', 'Elektronika i mikrokontroler'] },
    { id: 'chemia', name: 'Chemia', icon: '🧪', desc: 'Rdza, akumulator, paliwo',
      levels: ['Atom i mieszaniny', 'Spalanie', 'Kwasy i rdza', 'Paliwa i oleje', 'Metale i stopy'] },
    { id: 'materialoznawstwo', name: 'Materiałoznawstwo', icon: '🔩', desc: 'Stal, aluminium, twardość',
      levels: ['Metale w garażu', 'Żelazo i stal', 'Aluminium i felgi', 'Wytrzymałość', 'Obróbka'] },
    { id: 'rysunek', name: 'Rysunek techniczny', icon: '📐', desc: 'Rzuty, wymiary, tolerancje',
      levels: ['Linie i rzuty', 'Wymiarowanie', 'Przekroje', 'Tolerancje', 'Rysunek felgi'] },
    { id: 'miernictwo', name: 'Miernictwo', icon: '📏', desc: 'Suwmiarka i pomiary',
      levels: ['Jednostki', 'Suwmiarka', 'Mikrometr', 'Błędy pomiaru', 'Pomiary w praktyce'] },
    { id: 'angielski', name: 'Angielski techniczny', icon: '🔤', desc: 'Słowa z warsztatu i katalogów',
      levels: ['Narzędzia i części', 'Instrukcje', 'Bezpieczeństwo (BHP)', 'Dane techniczne', 'Katalogi i dokumentacja'] },
    { id: 'chinski', name: 'Chiński techniczny', icon: '🀄', desc: 'Karty części i aukcje',
      levels: ['Liczby i wymiary', 'Części auta', 'Materiały', 'Narzędzia', 'Zamawianie'] }
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
  const galBtn = document.getElementById('naukaGalBtn');
  const galInput = document.getElementById('naukaGal');
  if (fotoBtn) fotoBtn.onclick = pickPhoto;
  if (fotoQuick) fotoQuick.onclick = pickPhoto;
  if (galBtn) galBtn.onclick = () => { if (galInput) galInput.click(); };

  function dodajPliki(fileList) {
    const pliki = Array.prototype.slice.call(fileList || []).slice(0, 3 - pending.length);
    pliki.forEach(f => {
      const fr = new FileReader();
      fr.onload = () => downscale(fr.result, u => { if (pending.length < 3) { pending.push(u); renderPrev(); } });
      fr.readAsDataURL(f);
    });
  }
  if (fotoInput) fotoInput.onchange = () => { dodajPliki(fotoInput.files); fotoInput.value = ''; };
  if (galInput) galInput.onchange = () => { dodajPliki(galInput.files); galInput.value = ''; };

  /* --- fiszki z błędów --- */
  const fiszkiAll = () => (store.fiszki = store.fiszki || []);
  function updateFiszkiBtn() {
    const b = document.getElementById('naukaFiszki');
    if (b) b.textContent = '🎴 Fiszki (' + fiszkiAll().length + ')';
  }
  function parseFiszki(reply) {
    const lines = String(reply).split('\n');
    const inne = [];
    let dodane = 0;
    lines.forEach(l => {
      const m = l.match(/^\s*(?:[-*•]\s*)?FISZKA\s*:\s*(.+?)\s*\|\s*(.+?)\s*$/i);
      if (m) { fiszkiAll().push({ p: m[1], o: m[2] }); dodane++; }
      else inne.push(l);
    });
    if (!dodane) return reply;
    save();
    updateFiszkiBtn();
    const reszta = inne.join('\n').trim();
    return (reszta ? reszta + '\n\n' : '') +
      '🎴 Zapisano ' + dodane + ' fiszek (razem ' + fiszkiAll().length +
      '). Kliknij „Fiszki", żeby je powtarzać.';
  }

  let fIdx = 0;
  const fOv = document.getElementById('fiszkiOverlay');
  function pokazFiszke() {
    const arr = fiszkiAll();
    if (!arr.length) return;
    if (fIdx >= arr.length) fIdx = 0;
    if (fIdx < 0) fIdx = arr.length - 1;
    document.getElementById('fiszkiPytanie').textContent = arr[fIdx].p;
    const o = document.getElementById('fiszkiOdpowiedz');
    o.textContent = arr[fIdx].o;
    o.hidden = true;
    document.getElementById('fiszkiLicznik').textContent = (fIdx + 1) + '/' + arr.length;
  }
  const fBtn = document.getElementById('naukaFiszki');
  if (fBtn) fBtn.onclick = () => {
    if (!fiszkiAll().length) {
      send('Zrób mi proszę 4 fiszki z tego, co ostatnio mylę. Format: FISZKA: pytanie | odpowiedź');
      return;
    }
    fIdx = 0;
    pokazFiszke();
    fOv.hidden = false;
  };
  if (fOv) {
    document.getElementById('fiszkiPokaz').onclick = () => {
      document.getElementById('fiszkiOdpowiedz').hidden = false;
    };
    document.getElementById('fiszkiNastepna').onclick = () => { fIdx++; pokazFiszke(); };
    document.getElementById('fiszkiZamknij').onclick = () => { fOv.hidden = true; };
  }
  updateFiszkiBtn();

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
      let reply = j.reply || ('⚠️ ' + (j.error || 'Błąd AI'));
      reply = parseFiszki(reply);
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

  /* --- przeciągnij i upuść zdjęcie (komputer) --- */
  ['dragenter', 'dragover'].forEach(ev => panel.addEventListener(ev, e => {
    e.preventDefault();
    panel.classList.add('drag');
  }));
  ['dragleave', 'drop'].forEach(ev => panel.addEventListener(ev, () => panel.classList.remove('drag')));
  panel.addEventListener('drop', e => {
    e.preventDefault();
    panel.classList.remove('drag');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length)
      dodajPliki(e.dataTransfer.files);
  });
  ['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => e.preventDefault()));

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

