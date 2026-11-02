'use strict';

const { spawn } = require('node:child_process');

function launchHost(executable, args, environment = process.env) {
  const env = { ...environment };
  // The coding agent itself can be an Electron/VS Code child. These variables
  // would make the tested editor run as Node or connect to the existing IDE.
  delete env.ELECTRON_RUN_AS_NODE;
  for (const key of Object.keys(env)) if (key.startsWith('VSCODE_')) delete env[key];
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env, shell: false, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Editor test process exited with ${signal || code}.`));
    });
  });
}

module.exports = { launchHost };
