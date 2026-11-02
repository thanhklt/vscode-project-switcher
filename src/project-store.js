'use strict';

const fs = require('node:fs/promises');
const { watch, mkdirSync } = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function pathKey(value) {
  const normalized = path.resolve(value);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function decode(contents) {
  let data;
  try { data = JSON.parse(contents); } catch {
    throw new Error('Invalid project list JSON. Fix or restore the storage file; it has not been overwritten.');
  }
  if (!data || data.version !== 1 || !Array.isArray(data.projects)) {
    throw new Error('Unsupported project list format or version. The storage file has not been overwritten.');
  }
  const ids = new Set();
  const paths = new Set();
  for (const entry of data.projects) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) ||
        typeof entry.name !== 'string' || !entry.name.trim() ||
        typeof entry.path !== 'string' || !path.isAbsolute(entry.path) || paths.has(pathKey(entry.path))) {
      throw new Error('Invalid project entry in storage. The storage file has not been overwritten.');
    }
    ids.add(entry.id);
    paths.add(pathKey(entry.path));
  }
  return data.projects.map(({ id, name, path: folderPath }) => ({ id, name, path: folderPath }));
}

class ProjectStore {
  constructor(filePath) {
    if (!path.isAbsolute(filePath)) throw new Error('The storage path must be absolute.');
    this.filePath = filePath;
  }

  async list() {
    let contents;
    try { contents = await fs.readFile(this.filePath, 'utf8'); } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
    return decode(contents);
  }

  async add(folderPaths) {
    const candidates = await Promise.all(folderPaths.map(async (folderPath) => {
      if (!path.isAbsolute(folderPath)) throw new Error('Project folders must use absolute paths.');
      const canonical = await fs.realpath(folderPath);
      if (!(await fs.stat(canonical)).isDirectory()) throw new Error(`Not a folder: ${folderPath}`);
      return canonical;
    }));
    return this.mutate((projects) => {
      const added = [];
      for (const folderPath of candidates) {
        const existing = projects.find((entry) => pathKey(entry.path) === pathKey(folderPath));
        if (existing) continue;
        const entry = { id: randomUUID(), name: path.basename(folderPath) || folderPath, path: folderPath };
        projects.push(entry);
        added.push(entry);
      }
      return added;
    });
  }

  async rename(id, name) {
    if (typeof name !== 'string' || !name.trim()) throw new Error('A project name cannot be empty.');
    return this.mutate((projects) => {
      const entry = projects.find((project) => project.id === id);
      if (!entry) throw new Error('This project is no longer in the list. Refresh and try again.');
      entry.name = name.trim();
    });
  }

  async remove(id) {
    return this.mutate((projects) => {
      const index = projects.findIndex((entry) => entry.id === id);
      if (index !== -1) projects.splice(index, 1);
    });
  }

  async acquireLock() {
    const lockPath = this.filePath + '.lock';
    const deadline = Date.now() + 5000;
    while (true) {
      try {
        await fs.mkdir(lockPath);
        return async () => fs.rmdir(lockPath);
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        // An old timestamp does not prove abandonment: a live editor may be
        // suspended. Never remove a lock that belongs to another writer.
        if (Date.now() >= deadline) throw new Error(
          `The project list is busy in another window. Try again shortly. If this persists after a crash, close both editors, remove the lock directory "${lockPath}", then reopen the editor. Do not remove the projects JSON file.`,
        );
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
  }

  async mutate(change) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const release = await this.acquireLock();
    const temporary = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      const projects = await this.list();
      const result = change(projects);
      await fs.writeFile(temporary, JSON.stringify({ version: 1, projects }, null, 2) + '\n', {
        encoding: 'utf8', mode: 0o600, flag: 'wx',
      });
      await fs.rename(temporary, this.filePath);
      return result;
    } finally {
      try { await fs.rm(temporary, { force: true }); } finally { await release(); }
    }
  }

  watch(onChange, onError) {
    // Watch the directory because a successful write atomically replaces the file.
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    let timer;
    const watcher = watch(path.dirname(this.filePath), (event, filename) => {
      if (filename && filename.toString() !== path.basename(this.filePath)) return;
      clearTimeout(timer);
      timer = setTimeout(onChange, 100);
    });
    watcher.on('error', onError);
    return { dispose() { clearTimeout(timer); watcher.close(); } };
  }
}

module.exports = { ProjectStore, pathKey };
