'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { launchHost } = require('./launch-host');

async function main() {
  const editor = process.argv[2] || 'vscode';
  if (!['vscode', 'antigravity'].includes(editor)) throw new Error('Choose vscode or antigravity.');
  const executable = process.env.VSCODE_EXECUTABLE_PATH || (process.platform === 'win32' && path.join(
    process.env.LOCALAPPDATA, 'Programs',
    editor === 'vscode' ? 'Microsoft VS Code/Code.exe' : 'Antigravity IDE/Antigravity IDE.exe',
  ));
  if (!executable) throw new Error('Set VSCODE_EXECUTABLE_PATH to the editor executable.');
  await fs.access(executable);
  const root = path.resolve(__dirname, '..');
  const base = path.join(root, '.test-data', `${editor}-${Date.now()}`);
  const userData = path.join(base, 'user-data');
  const workspace = path.join(base, 'Workspace có khoảng trắng');
  const storagePath = path.join(base, 'storage', 'projects.json');
  const openTarget = path.join(base, 'storage', 'Second project');
  const openReport = path.join(base, 'opened-workspace.json');
  await fs.mkdir(path.join(userData, 'User'), { recursive: true });
  await fs.mkdir(workspace, { recursive: true });
  await fs.writeFile(path.join(userData, 'User', 'settings.json'), JSON.stringify({
    'projectSwitcher.storagePath': storagePath,
    'workbench.startupEditor': 'none',
    'update.mode': 'none',
    'extensions.autoUpdate': false,
    'telemetry.telemetryLevel': 'off',
    'window.newWindowProfile': 'Default',
  }));
  console.log(`Testing ${editor}: ${executable}`);
  console.log(`Isolated profile: ${base}`);
  await launchHost(executable, [
      workspace, '--user-data-dir', userData, '--extensions-dir', path.join(base, 'extensions'),
      '--disable-extensions', '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes',
      '--disable-updates', '--disable-gpu',
      `--extensionDevelopmentPath=${root}`,
      `--extensionDevelopmentPath=${path.join(root, 'test', 'host', 'workspace-probe')}`,
      `--extensionTestsPath=${path.join(root, 'test', 'host', 'index.js')}`,
    ], {
      ...process.env, PROJECT_SWITCHER_TEST_STORAGE: storagePath,
      PROJECT_SWITCHER_TEST_OPEN_TARGET: openTarget, PROJECT_SWITCHER_TEST_OPEN_REPORT: openReport,
    });
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
