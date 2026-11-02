'use strict';

const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');

async function activate() {
  const target = process.env.PROJECT_SWITCHER_TEST_OPEN_TARGET;
  const report = process.env.PROJECT_SWITCHER_TEST_OPEN_REPORT;
  if (!target || !report) return;
  const actual = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!actual || path.resolve(actual).toLowerCase() !== path.resolve(target).toLowerCase()) return;
  await fs.writeFile(report + '.tmp', JSON.stringify({ folder: actual, editor: vscode.env.appName, version: vscode.version }));
  await fs.rename(report + '.tmp', report);
  // This probe is loaded only in the isolated test profile. Close just the
  // secondary window after proving its actual workspace, never a user window.
  setTimeout(() => { void vscode.commands.executeCommand('workbench.action.closeWindow'); }, 500);
}

module.exports = { activate };
