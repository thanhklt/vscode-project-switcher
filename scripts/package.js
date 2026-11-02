'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createVSIX } = require('@vscode/vsce');
const { version } = require('../package.json');

const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
createVSIX({
  cwd: root,
  packagePath: path.join(root, 'dist', `project-switcher-${version}.vsix`),
  dependencies: false,
  allowMissingRepository: true,
}).catch((error) => { console.error(error); process.exitCode = 1; });
