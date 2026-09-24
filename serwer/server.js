/* ============================================================
   Stacja Nauki — proxy do DeepSeek (bez zależności, Node.js)
   Klucz API TYLKO w zmiennych środowiskowych:
     DEEPSEEK_API_KEY  – klucz z platform.deepseek.com
     DEEPSEEK_MODEL    – opcjonalnie (domyślnie: deepseek-flash)
     ALLOWED_ORIGINS   – opcjonalnie, lista po przecinku
     MOCK_AI=1         – tryb testowy bez API (do podglądu UI)
   ============================================================ */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;
const KEY = process.env.DEEPSEEK_API_KEY || '';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash';
const VISION_MODEL = process.env.DEEPSEEK_VISION_MODEL || 'deepseek-flash';
const MOCK = process.env.MOCK_AI === '1';
const ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://projekt-felga.onrender.com,http://localhost:8000,http://127.0.0.1:8000')
  .split(',').map(s => s.trim()).filter(Boolean);

const noBom = s => s.replace(/^\uFEFF/, '');

const SUBJECTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'subjects.json'), 'utf8').replace(/^\uFEFF/, ''));

let PROFIL = { uczen: '', otoczenie: [], zasady_przykladow: [] };
try {
  PROFIL = JSON.parse(
    noBom(fs.readFileSync(path.join(__dirname, 'profil.json'), 'utf8')));
} catch (e) {
  console.log('profil.json: ' + e.message);
}

/* --- prosty limit: 40 zapytań / 5 min na IP --- */
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 5 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 40;
}

function cors(req, res) {
  const o = req.headers.origin || '';
  if (ORIGINS.includes(o)) res.setHeader('Access-Control-Allow-Origin', o);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function profilTxt() {
  const czesci = [];
  if (PROFIL.uczen) czesci.push('KIM JEST UCZEŃ: ' + PROFIL.uczen);
  if (Array.isArray(PROFIL.otoczenie) && PROFIL.otoczenie.length)
    czesci.push('JEGO ŚWIAT (używaj tego w przykładach):\n- ' + PROFIL.otoczenie.join('\n- '));
  if (Array.isArray(PROFIL.zasady_przykladow) && PROFIL.zasady_przykladow.length)
    czesci.push('ZASADY PRZYKŁADÓW:\n- ' + PROFIL.zasady_przykladow.join('\n- '));
  return czesci.join('\n\n');
}

function buildSystem(subjectKey, mode, level, withImage) {
  const s = SUBJECTS[subjectKey] || SUBJECTS.matematyka;
  const lvl = Math.max(0, Math.min(4, parseInt(level, 10) || 0));
  const topic = (s.levels && s.levels[lvl]) || '';
  const common = [
    'Jesteś cierpliwym korepetytorem dla chłopaka z 3 klasy szkoły branżowej (mechanik pojazdów samochodowych). Uczysz od zera.',
    'ZASADY:',
    '- Mów BARDZO prosto, jak dziecku. Krótkie zdania. Jedno pojęcie naraz.',
    '- Zawsze podawaj przykład z życia ucznia (patrz JEGO ŚWIAT poniżej).',
    '- Maksymalnie 150 słów na odpowiedź.',
    '- Po każdej porcji wiedzy zadaj JEDNO proste pytanie sprawdzające z odpowiedziami A) B) C) i POCZEKAJ na odpowiedź.',
    '- Jeśli odpowiedź jest błędna: pochwal za próbę, wyjaśnij inaczej i prościej, z inną analogią.',
    '- Przy zadaniach NIE podawaj gotowego wyniku — prowadź krok po kroku, pytając o kolejne kroki.',
    '- Jeśli uczeń prosi o fiszki: odpowiedz WYŁĄCZNIE liniami w formacie „FISZKA: pytanie | odpowiedź" (maks. 5 linii, bez numeracji, bez niczego więcej).',
    '- Pisz po polsku, bez moralizowania.'
  ].join('\n');
  let modeTxt;
  if (mode === 'quiz')
    modeTxt = 'TRYB ODPYTANKA: zadawaj po jednym pytaniu. Po każdej odpowiedzi napisz dobrze/źle + krótkie wyjaśnienie. Po 5 pytaniach podaj wynik x/5 i co warto powtórzyć.';
  else if (mode === 'photo')
    modeTxt = [
      'TRYB ZADANIE ZE ZDJĘCIA: uczeń przysłał zdjęcie zadania zeszytu/podręcznika.',
      '1) Najpierw PRZEPISZ treść zadania ze zdjęcia (jeśli coś niewyraźne — powiedz i poproś o lepsze zdjęcie).',
      '2) Powiedz krótko, jaki to dział i czego trzeba użyć.',
      '3) Poprowadź krok po kroku — po każdym kroku pytaj ucznia, co dalej. NIE podawaj wyniku od razu.',
      '4) Dopiero gdy uczeń sam policzy — potwierdź i pochwal.'
    ].join('\n');
  else
    modeTxt = 'TRYB LEKCJA: prowadź lekcję krok po kroku na podany temat.';

  return [common, modeTxt, profilTxt(),
    'PRZEDMIOT: ' + s.name + '.',
    'POZIOM: ' + lvl + ' — TEMAT: ' + topic,
    s.hint || ''].join('\n');
}

function callDeepSeek(messages, opts) {
  opts = opts || {};
  const model = opts.vision ? VISION_MODEL : MODEL;
  const body = {
    model: model,
    messages: messages,
    max_tokens: opts.maxTokens || 800,
    temperature: 0.6,
    stream: false
  };
  if (/flash|v4|reasoner/i.test(model)) body.thinking = { type: 'disabled' };
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.deepseek.com', path: '/chat/completions', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, r => {
      let buf = '';
      r.on('data', c => buf += c);
      r.on('end', () => {
        try {
          const j = JSON.parse(buf);
          if (j.choices && j.choices[0] && j.choices[0].message)
            return resolve(j.choices[0].message.content);
          reject(new Error(j.error ? (j.error.message || 'Błąd API') : 'Pusta odpowiedź AI'));
        } catch (e) { reject(new Error('Nieczytelna odpowiedź API: ' + buf.slice(0, 120))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy(new Error('Przekroczono czas oczekiwania')));
    req.write(payload);
    req.end();
  });
}

function mockReply(body) {
  const s = SUBJECTS[body.subject] || SUBJECTS.matematyka;
  const lvl = parseInt(body.level, 10) || 0;
  return '🧪 [TRYB TESTOWY — bez AI]\n\n' +
    'Przedmiot: ' + s.name + ', poziom ' + lvl + ' (' + (s.levels[lvl] || '') + ').\n\n' +
    'Prąd to jak woda w rurze. Napięcie = ciśnienie, przewód = rura, opór = zwężenie.\n\n' +
    'Pytanie sprawdzające: gdy w rurze dodasz zwężenie, wody popłynie:\n' +
    'A) więcej\nB) mniej\nC) tyle samo';
}

const server = http.createServer((req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = (req.url || '').split('?')[0];

  if (url === '/api/health') {
    return json(res, 200, {
      ok: true, mock: MOCK, hasKey: !!KEY, model: MODEL,
      subjects: Object.keys(SUBJECTS)
    });
  }

  if (url === '/api/subjects') {
    const list = Object.entries(SUBJECTS).map(([id, s]) => ({
      id, name: s.name, icon: s.icon, desc: s.desc, levels: s.levels
    }));
    return json(res, 200, { subjects: list });
  }

  if (url === '/api/chat' && req.method === 'POST') {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket.remoteAddress || 'x';
    if (rateLimited(ip)) return json(res, 429, { error: 'Za dużo zapytań — poczekaj chwilę.' });

    let body = '';
    req.on('data', c => {
      body += c;
      if (body.length > 200000) req.destroy();
    });
    req.on('end', async () => {
      let data;
      try { data = JSON.parse(body); } catch (e) { return json(res, 400, { error: 'Zły JSON' }); }
      const subject = SUBJECTS[data.subject] ? data.subject : 'matematyka';
      const mode = data.mode === 'quiz' ? 'quiz' : 'lesson';
      const level = data.level;
      const history = Array.isArray(data.messages) ? data.messages.slice(-14) : [];

      if (MOCK) return json(res, 200, { reply: mockReply({ subject, level }), mock: true });
      if (!KEY) return json(res, 503, { error: 'Serwer nie ma klucza DEEPSEEK_API_KEY.' });

      const images = Array.isArray(data.images) ? data.images.slice(0, 3) : [];

      try {
        const messages = [{ role: 'system', content: buildSystem(subject, mode, level, images.length > 0) }]
          .concat(history.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: String(m.text || '').slice(0, 4000)
          })));
        if (images.length && messages.length > 1) {
          const last = messages[messages.length - 1];
          if (last.role === 'user') {
            last.content = [{ type: 'text', text: last.content || '(zdjęcie zadania)' }]
              .concat(images.map(u => ({
                type: 'image_url',
                image_url: { url: String(u), detail: 'high' }
              })));
          }
        }
        const reply = await callDeepSeek(messages, {
          vision: images.length > 0,
          maxTokens: images.length ? 1000 : 800
        });
        return json(res, 200, { reply });
      } catch (e) {
        return json(res, 502, { error: 'Błąd AI: ' + e.message });
      }
    });
    return;
  }

  json(res, 404, { error: 'Nie znaleziono' });
});

server.listen(PORT, () => {
  console.log('Stacja Nauki API na porcie ' + PORT +
    ' | mock=' + MOCK + ' | klucz=' + (KEY ? 'jest' : 'BRAK') + ' | model=' + MODEL);
});
