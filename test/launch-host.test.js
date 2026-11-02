'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { launchHost } = require('../scripts/launch-host');

test('launches a real child with intact Unicode/spaced arguments and no inherited editor overrides', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'host-launch-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const output = path.join(root, 'output.json');
  const script = path.join(root, 'child.js');
  await fs.writeFile(script, `require('node:fs').writeFileSync(process.argv[2], JSON.stringify({
    args: process.argv.slice(3), electron: process.env.ELECTRON_RUN_AS_NODE,
    ipc: process.env.VSCODE_IPC_HOOK_CLI, storage: process.env.PROJECT_SWITCHER_TEST_STORAGE
  }));`);
  const spaced = 'D:\\Dự án có khoảng trắng\\Project & tools';
  await launchHost(process.execPath, [script, output, spaced], {
    ...process.env, ELECTRON_RUN_AS_NODE: '1', VSCODE_IPC_HOOK_CLI: 'existing-editor',
    PROJECT_SWITCHER_TEST_STORAGE: 'isolated-storage',
  });
  const result = JSON.parse(await fs.readFile(output, 'utf8'));
  assert.deepEqual(result, { args: [spaced], storage: 'isolated-storage' });
});

test('reports an unsuccessful editor process as a failed host test', async () => {
  await assert.rejects(launchHost(process.execPath, ['-e', 'process.exit(3)']), /3/);
});
