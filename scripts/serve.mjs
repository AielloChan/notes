import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const { basePath } = JSON.parse(await readFile(path.join(root, 'build.json'), 'utf8'));
const port = Number(process.env.PORT || 4182);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8' };

http.createServer(async (req, res) => {
  const parsed = new URL(req.url, 'http://localhost');
  if (parsed.pathname === '/' && basePath !== '/') { res.writeHead(302, { Location: basePath + parsed.search }); return res.end(); }
  if (basePath !== '/' && parsed.pathname === basePath.slice(0, -1)) { res.writeHead(301, { Location: basePath + parsed.search }); return res.end(); }
  try {
    const pathname = decodeURIComponent(parsed.pathname);
    if (!pathname.startsWith(basePath)) throw new Error('Outside site');
    let filename = path.resolve(root, pathname.slice(basePath.length));
    if (filename !== path.resolve(root) && !filename.startsWith(root)) throw new Error('Outside root');
    if ((await stat(filename)).isDirectory()) {
      if (!parsed.pathname.endsWith('/')) { res.writeHead(301, { Location: parsed.pathname + '/' + parsed.search }); return res.end(); }
      filename = path.join(filename, 'index.html');
    }
    const bytes = await readFile(filename);
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(path.join(root, '404.html')));
  }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}${basePath}`));
