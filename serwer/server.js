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
const MOCK = process.env.MOCK_AI === '1';
const ORIGINS = (process.env.ALLOWED_ORIGINS ||
  'https://projekt-felga.onrender.com,http://localhost:8000,http://127.0.0.1:8000')
  .split(',').map(s => s.trim()).filter(Boolean);

const SUBJECTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'subjects.json'), 'utf8')
    .replace(/^\uFEFF/, ''));

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

function buildSystem(subjectKey, mode, level) {
  const s = SUBJECTS[subjectKey] || SUBJECTS.matematyka;
  const lvl = Math.max(0, Math.min(4, parseInt(level, 10) || 0));
  const topic = (s.levels && s.levels[lvl]) || '';
  const common = [
    'Jesteś cierpliwym korepetytorem dla chłopaka z 3 klasy szkoły branżowej (mechanik pojazdów samochodowych). Uczysz od zera.',
    'ZASADY:',
    '- Mów BARDZO prosto, jak dziecku. Krótkie zdania. Jedno pojęcie naraz.',
    '- Zawsze podaj analogię z życia lub z warsztatu samochodowego.',
    '- Maksymalnie 150 słów na odpowiedź.',
    '- Po każdej porcji wiedzy zadaj JEDNO proste pytanie sprawdzające z odpowiedziami A) B) C) i POCZEKAJ na odpowiedź.',
    '- Jeśli odpowiedź jest błędna: pochwal za próbę, wyjaśnij inaczej i prościej, z inną analogią.',
    '- Przy zadaniach NIE podawaj gotowego wyniku — prowadź krok po kroku, pytając o kolejne kroki.',
    '- Pisz po polsku, bez moralizowania.'
  ].join('\n');
  const modeTxt = (mode === 'quiz')
    ? 'TRYB ODPYTANKA: zadawaj po jednym pytaniu. Po każdej odpowiedzi napisz dobrze/źle + krótkie wyjaśnienie. Po 5 pytaniach podaj wynik x/5 i co warto powtórzyć.'
    : 'TRYB LEKCJA: prowadź lekcję krok po kroku na podany temat.';
  return [common, modeTxt,
    'PRZEDMIOT: ' + s.name + '.',
    'POZIOM: ' + lvl + ' — TEMAT: ' + topic,
    s.hint || ''].join('\n');
}

function callDeepSeek(messages) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: MODEL, messages, max_tokens: 800, temperature: 0.6, stream: false
    });
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

      try {
        const messages = [{ role: 'system', content: buildSystem(subject, mode, level) }]
          .concat(history.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: String(m.text || '').slice(0, 4000)
          })));
        const reply = await callDeepSeek(messages);
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
