'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vscode = require('vscode');

async function run() {
  // Some hosts propagate extensionTestsPath to a newly opened development
  // window. Its startup probe owns reporting and closing that secondary window.
  if (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath.toLowerCase() === process.env.PROJECT_SWITCHER_TEST_OPEN_TARGET?.toLowerCase()) return;
  const extension = vscode.extensions.getExtension('local-project-tools.project-switcher');
  assert.ok(extension, 'The host must discover the extension manifest');
  const api = await extension.activate();
  assert.ok(extension.isActive, 'Extension must activate without errors');
  assert.equal(api.store.filePath, process.env.PROJECT_SWITCHER_TEST_STORAGE, 'Tests must never touch the real project list');
  const commands = await vscode.commands.getCommands(true);
  for (const command of extension.packageJSON.contributes.commands) {
    assert.ok(commands.includes(command.command), `Missing registered command: ${command.command}`);
  }
  await vscode.commands.executeCommand('projectSwitcher.projects.focus');
  assert.deepEqual(await api.provider.getChildren(), []);

  // Exercise the actual registered command against a real workspace and disk.
  await vscode.commands.executeCommand('projectSwitcher.saveCurrent');
  const entries = await api.store.list();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'Workspace có khoảng trắng');
  assert.equal(entries[0].path, await fs.realpath(vscode.workspace.workspaceFolders[0].uri.fsPath));
  const item = api.provider.getTreeItem(entries[0]);
  assert.match(item.description, /^Current/);
  assert.equal(item.command.command, 'projectSwitcher.open');
  assert.equal(item.command.arguments[0].id, entries[0].id);

  await api.store.rename(entries[0].id, 'Dự án kiểm thử');
  await vscode.commands.executeCommand('projectSwitcher.refresh');
  assert.equal((await api.provider.getChildren())[0].name, 'Dự án kiểm thử');

  // A second writer simulates the other IDE updating the shared file.
  const secondFolder = path.join(path.dirname(api.store.filePath), 'Second project');
  await fs.mkdir(secondFolder);
  const { ProjectStore } = require('../../src/project-store');
  let timer;
  const notified = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Tree did not refresh after external file replacement')), 5000);
    const subscription = api.provider.onDidChangeTreeData(() => { clearTimeout(timer); subscription.dispose(); resolve(); });
  });
  await new ProjectStore(api.store.filePath).add([secondFolder]);
  await notified;
  clearTimeout(timer);
  assert.equal((await api.provider.getChildren()).length, 2);
  const target = (await api.store.list()).find((entry) => entry.path === secondFolder);
  await vscode.commands.executeCommand('projectSwitcher.openInNewWindow', target);
  const deadline = Date.now() + 30000;
  let report;
  while (Date.now() < deadline) {
    try { report = JSON.parse(await fs.readFile(process.env.PROJECT_SWITCHER_TEST_OPEN_REPORT, 'utf8')); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(report, 'A second real editor window must report its actual workspace');
  assert.equal(report.folder.toLowerCase(), secondFolder.toLowerCase());
  assert.equal(await fs.realpath(vscode.workspace.workspaceFolders[0].uri.fsPath), entries[0].path, 'Opening a new window must preserve the first workspace');
  await api.store.remove(entries[0].id);
  assert.ok((await fs.stat(entries[0].path)).isDirectory());
  console.log(`HOST PASS: ${vscode.env.appName} ${vscode.version} — activation, commands, current project, persistence, tree, external refresh, actual new-window workspace.`);
}

module.exports = { run };
