/* Adres API Stacji Nauki (proxy DeepSeek).
   Lokalnie:  uruchom serwer w folderze serwer:  node server.js   → http://localhost:8787
   Online:    usługa na Renderze (patrz START.md) */
window.FELGA_API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:8787'
  : 'https://stacja-nauki-api.onrender.com';
