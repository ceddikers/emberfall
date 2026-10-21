// Tiny static file server for testing locally: `npm start`, then open http://localhost:3000.
// Multiplayer is peer-to-peer (see client/js/net.js), so this only serves the game files.
// Any static host (Netlify, GitHub Pages, itch.io) can serve the client/ folder instead.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.normalize(path.join(CLIENT_DIR, urlPath === '/' ? 'index.html' : urlPath));
  if (!file.startsWith(CLIENT_DIR)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Emberfall at http://localhost:${PORT}`));
