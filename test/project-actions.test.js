'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ProjectStore } = require('../src/project-store');
const { createProjectActions } = require('../src/project-actions');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'switcher-actions-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const folder = path.join(root, 'Project with spaces');
  await fs.mkdir(folder);
  const store = new ProjectStore(path.join(root, 'projects.json'));
  const opened = [];
  const errors = [];
  const notices = [];
  let refreshCount = 0;
  const state = { newWindow: false, folders: undefined, name: undefined, confirmation: undefined };
  const vscode = {
    Uri: { file: (fsPath) => ({ scheme: 'file', fsPath }) },
    env: { remoteName: undefined },
    workspace: { workspaceFolders: [], getConfiguration: () => ({ get: () => state.newWindow }) },
    window: {
      showOpenDialog: async () => state.folders,
      showInputBox: async () => state.name,
      showQuickPick: async (items) => items[0],
      showErrorMessage: async (message) => errors.push(message),
      showInformationMessage: async (message) => notices.push(message),
      showWarningMessage: async () => state.confirmation,
    },
    commands: { executeCommand: async (...args) => opened.push(args) },
  };
  const actions = createProjectActions(vscode, store, () => { refreshCount++; });
  return { root, folder, store, opened, errors, notices, state, vscode, actions, refreshCount: () => refreshCount };
}

test('opens the selected folder URI using the configured window mode', async (t) => {
  const f = await fixture(t);
  const [entry] = await f.store.add([f.folder]);
  await f.actions.open(entry);
  assert.deepEqual(f.opened[0], ['vscode.openFolder', { scheme: 'file', fsPath: entry.path }, { forceNewWindow: false }]);
  f.state.newWindow = true;
  await f.actions.open(entry);
  assert.equal(f.opened[1][2].forceNewWindow, true);
});

test('explicit new-window action overrides the default', async (t) => {
  const f = await fixture(t);
  const [entry] = await f.store.add([f.folder]);
  await f.actions.open(entry, true);
  assert.equal(f.opened[0][2].forceNewWindow, true);
});

test('does not switch to a deleted directory or an entry removed in another editor', async (t) => {
  const f = await fixture(t);
  const [entry] = await f.store.add([f.folder]);
  await fs.rmdir(f.folder);
  await f.actions.open(entry);
  assert.equal(f.opened.length, 0);
  assert.equal(f.errors.length, 1);
  await f.store.remove(entry.id);
  await fs.mkdir(f.folder);
  await f.actions.open(entry);
  assert.equal(f.opened.length, 0);
  assert.equal(f.errors.length, 2);
});

test('adds selected folders and refreshes the list; cancel makes no changes', async (t) => {
  const f = await fixture(t);
  await f.actions.add();
  assert.deepEqual(await f.store.list(), []);
  f.state.folders = [{ scheme: 'file', fsPath: f.folder }];
  await f.actions.add();
  assert.equal((await f.store.list()).length, 1);
  assert.equal(f.refreshCount(), 1);
});

test('saves the current workspace folders and supports renaming and confirmed removal', async (t) => {
  const f = await fixture(t);
  f.vscode.workspace.workspaceFolders = [{ name: 'Project', uri: { scheme: 'file', fsPath: f.folder } }];
  await f.actions.saveCurrent();
  const [entry] = await f.store.list();
  f.state.name = 'My renamed project';
  await f.actions.rename(entry);
  assert.equal((await f.store.list())[0].name, 'My renamed project');
  await f.actions.remove(entry);
  assert.equal((await f.store.list()).length, 1);
  f.state.confirmation = 'Remove';
  await f.actions.remove(entry);
  assert.deepEqual(await f.store.list(), []);
  assert.ok((await fs.stat(f.folder)).isDirectory());
});

test('Quick Pick opens the chosen saved project', async (t) => {
  const f = await fixture(t);
  const [entry] = await f.store.add([f.folder]);
  await f.actions.search();
  assert.equal(f.opened[0][1].fsPath, entry.path);
});

test('blocks local project operations in remote windows', async (t) => {
  const f = await fixture(t);
  f.vscode.env.remoteName = 'ssh-remote';
  await f.actions.add();
  await f.actions.saveCurrent();
  await f.actions.search();
  assert.equal(f.opened.length, 0);
  assert.equal(f.errors.length, 3);
  assert.deepEqual(await f.store.list(), []);
});

test('surfaces malformed storage as an error instead of losing the saved data', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(f.store.filePath, '{broken');
  f.state.folders = [{ scheme: 'file', fsPath: f.folder }];
  await f.actions.add();
  assert.match(f.errors[0], /invalid/i);
  assert.equal(await fs.readFile(f.store.filePath, 'utf8'), '{broken');
});

test('saving a project completes without waiting for its informational toast to be dismissed', async (t) => {
  const f = await fixture(t);
  f.vscode.workspace.workspaceFolders = [{ uri: { scheme: 'file', fsPath: f.folder } }];
  f.vscode.window.showInformationMessage = () => new Promise(() => {});
  let timer;
  try {
    await Promise.race([
      f.actions.saveCurrent(),
      new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('Save is blocked by a toast')), 200); }),
    ]);
  } finally { clearTimeout(timer); }
  assert.equal((await f.store.list()).length, 1);
});
