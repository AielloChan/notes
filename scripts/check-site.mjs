import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat();
}
for (const basePath of ['/', '/notes/']) {
  execFileSync(process.execPath, ['scripts/build-site.mjs'], { cwd: root, env: { ...process.env, BASE_PATH: basePath }, stdio: 'inherit' });
  const data = await readFile(path.join(dist, 'data.js'), 'utf8');
  const notes = JSON.parse(data.replace(/^export const notes = /, '').replace(/;\s*$/, ''));
  const original = JSON.parse(await readFile(path.join(root, 'site/notes.json'), 'utf8'));
  assert.equal(notes.length, original.length);
  for (const [i, note] of notes.entries()) {
    assert.equal(note.body, original[i].body);
    assert.deepEqual(note.tags, original[i].tags);
    for (const image of note.images) {
      assert.ok(image.startsWith(basePath + 'assets/'));
      await access(path.join(dist, image.slice(basePath.length)));
    }
  }
  const html = await readFile(path.join(dist, 'index.html'), 'utf8');
  assert.ok(!html.includes('未发布'));
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const ref = match[1];
    if (/^https?:/.test(ref)) continue;
    assert.ok(!ref.startsWith('/'), `Root-relative static asset breaks project Pages: ${ref}`);
    await access(path.join(dist, ref));
  }
  for (const file of await files(dist)) {
    if (/\.(html|js|css|json|txt)$/.test(file)) {
      const content = await readFile(file, 'utf8');
      assert.ok(!/\/Users\/|file:\/\/|sourceDirectory|local-review-only|caption-draft/.test(content), `Private data in ${file}`);
    }
  }
}
console.log('Release checks passed: project paths, original content, assets, and private-data exclusion.');
