import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'site');
const out = path.join(root, 'dist');
const basePath = process.env.BASE_PATH || '/notes/';
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(basePath)) throw new Error('BASE_PATH must be / or a path such as /notes/');
const digest = data => createHash('sha256').update(data).digest('hex');
const notes = JSON.parse(await readFile(path.join(source, 'notes.json'), 'utf8'));
const ids = new Set();
const assets = new Set();
for (const note of notes) {
  if (!/^[a-z0-9-]+$/.test(note.id) || ids.has(note.id)) throw new Error(`Invalid or duplicate note: ${note.id}`);
  ids.add(note.id);
  if (!note.title || !note.body || !Array.isArray(note.tags) || !note.images?.length) throw new Error(`Incomplete note: ${note.id}`);
  if (digest(note.body) !== note.bodySha256) throw new Error(`Original body changed: ${note.id}`);
  for (const image of note.images) {
    if (!new RegExp(`^assets/${note.id}/[0-9]+\\.png$`).test(image.file) || assets.has(image.file)) throw new Error(`Invalid image path: ${image.file}`);
    const bytes = await readFile(path.join(source, image.file));
    if (digest(bytes) !== image.sha256) throw new Error(`Original image changed: ${image.file}`);
    assets.add(image.file);
  }
}
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const filename of ['index.html', 'styles.css', 'app.js', 'favicon.svg', 'fonts', 'media']) {
  await cp(path.join(source, filename), path.join(out, filename), { recursive: true });
}
// Only release-listed images are copied, so draft assets cannot enter a deployment.
for (const filename of assets) {
  await mkdir(path.dirname(path.join(out, filename)), { recursive: true });
  await cp(path.join(source, filename), path.join(out, filename));
}
const publicNotes = notes.map(({ bodySha256, images, ...note }) => ({ ...note, images: images.map(image => basePath + image.file) }));
await writeFile(path.join(out, 'data.js'), `export const notes = ${JSON.stringify(publicNotes)};\n`);
await writeFile(path.join(out, 'build.json'), JSON.stringify({ version: '0.1.0', basePath, notes: notes.length, images: assets.size }));
await writeFile(path.join(out, '.nojekyll'), '');
await writeFile(path.join(out, '404.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面未找到 · 生活构想</title><style>body{font-family:system-ui,sans-serif;padding:12vh 8vw;color:#1d1d1f;background:#f5f5f7}a{color:inherit}</style><h1>这个构想暂时找不到了。</h1><p><a href="${basePath}">返回生活构想</a></p></html>`);
console.log(`Built ${notes.length} note(s), ${assets.size} verified original images at ${basePath}`);
