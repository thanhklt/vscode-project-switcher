'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ProjectStore } = require('../src/project-store');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'project-switcher-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const folder = path.join(root, 'Dự án có khoảng trắng');
  await fs.mkdir(folder);
  const file = path.join(root, 'settings', 'projects.json');
  return { root, folder, file, store: new ProjectStore(file) };
}

test('persists Unicode folders and display names across repository instances', async (t) => {
  const { folder, file, store } = await fixture(t);
  assert.deepEqual(await store.list(), []);
  const [entry] = await store.add([folder]);
  assert.equal(entry.name, 'Dự án có khoảng trắng');
  assert.equal(entry.path, await fs.realpath(folder));
  await store.rename(entry.id, '  Công việc  ');
  const restored = await new ProjectStore(file).list();
  assert.equal(restored[0].id, entry.id);
  assert.equal(restored[0].name, 'Công việc');
  await store.remove(entry.id);
  assert.deepEqual(await new ProjectStore(file).list(), []);
  assert.ok((await fs.stat(folder)).isDirectory());
});

test('does not duplicate trailing-separator or Windows case variants', async (t) => {
  const { folder, store } = await fixture(t);
  await store.add([folder, folder + path.sep]);
  if (process.platform === 'win32') await store.add([folder.toUpperCase()]);
  assert.equal((await store.list()).length, 1);
});

test('simultaneous writers preserve every project and leave valid JSON', async (t) => {
  const { root, file, store } = await fixture(t);
  const folders = await Promise.all(Array.from({ length: 8 }, async (_, i) => {
    const folder = path.join(root, `project-${i}`);
    await fs.mkdir(folder);
    return folder;
  }));
  await Promise.all(folders.map((folder) => new ProjectStore(file).add([folder])));
  assert.equal((await store.list()).length, 8);
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).version, 1);
});

for (const contents of [
  '{broken',
  JSON.stringify({ version: 2, projects: [] }),
  JSON.stringify({ version: 1, projects: [{ id: 'x', name: 'X', path: 'relative' }] }),
  JSON.stringify({ version: 1, projects: [null] }),
]) {
  test(`rejects invalid data without overwriting it: ${contents}`, async (t) => {
    const { file, folder, store } = await fixture(t);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, contents);
    await assert.rejects(store.list(), /invalid|version|format/i);
    await assert.rejects(store.add([folder]), /invalid|version|format/i);
    assert.equal(await fs.readFile(file, 'utf8'), contents);
  });
}

test('validates the entire folder selection before saving any entries', async (t) => {
  const { root, folder, store } = await fixture(t);
  const regularFile = path.join(root, 'file.txt');
  await fs.writeFile(regularFile, 'hello');
  await assert.rejects(store.add([folder, regularFile]), /folder|directory/i);
  await assert.rejects(store.add([path.join(root, 'missing')]), /ENOENT|exist/i);
  assert.deepEqual(await store.list(), []);
});

test('rejects blank names without changing a saved project', async (t) => {
  const { folder, store } = await fixture(t);
  const [entry] = await store.add([folder]);
  await assert.rejects(store.rename(entry.id, '   '), /name/i);
  assert.equal((await store.list())[0].name, entry.name);
  await assert.rejects(store.rename('deleted-id', 'Other'), /no longer|found/i);
});

test('never evicts an aged lock held by another writer; manual recovery restores writes', async (t) => {
  const { folder, file, store } = await fixture(t);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const release = await store.acquireLock();
  const old = new Date(Date.now() - 120000);
  await fs.utimes(file + '.lock', old, old);
  await assert.rejects(new ProjectStore(file).add([folder]), /busy|lock/i);
  assert.deepEqual(await store.list(), []);
  await release();
  await store.add([folder]);
  assert.equal((await store.list()).length, 1);
});

test('notifies another instance after atomic replacement of shared storage', async (t) => {
  const { folder, file, store } = await fixture(t);
  const changed = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No external storage notification')), 3000);
    const watcher = store.watch(() => { clearTimeout(timer); resolve(); }, reject);
    t.after(() => { clearTimeout(timer); watcher.dispose(); });
  });
  await new ProjectStore(file).add([folder]);
  await changed;
  assert.equal((await store.list())[0].name, 'Dự án có khoảng trắng');
});
