'use strict';

const vscode = require('vscode');
const path = require('node:path');
const os = require('node:os');
const { ProjectStore } = require('./project-store');
const { ProjectsView } = require('./projects-view');
const { createProjectActions } = require('./project-actions');

function activate(context) {
  const output = vscode.window.createOutputChannel('Project Switcher');
  context.subscriptions.push(output);
  const reportError = (error) => {
    output.appendLine(`${new Date().toISOString()} ${error.stack || error.message}`);
    void vscode.window.showErrorMessage(`Project Switcher: ${error.message}`);
  };
  try {
    const configured = vscode.workspace.getConfiguration('projectSwitcher').get('storagePath', '').trim();
    const storagePath = configured || path.join(os.homedir(), '.project-switcher', 'projects.json');
    const store = new ProjectStore(storagePath);
    const provider = new ProjectsView(vscode, store, reportError);
    const tree = vscode.window.createTreeView('projectSwitcher.projects', {
      treeDataProvider: provider, showCollapseAll: false,
    });
    if (vscode.env.remoteName) tree.message = 'Open a local editor window to use saved local projects.';
    const refresh = () => provider.refresh();
    const actions = createProjectActions(vscode, store, refresh);
    const commands = {
      add: actions.add,
      saveCurrent: actions.saveCurrent,
      open: actions.open,
      openInNewWindow: (entry) => actions.open(entry, true),
      search: actions.search,
      rename: actions.rename,
      remove: actions.remove,
      refresh,
      editStorage: async () => {
        try {
          await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(storagePath)));
        } catch (error) { reportError(error); }
      },
    };
    context.subscriptions.push(provider, tree);
    for (const [name, handler] of Object.entries(commands)) {
      context.subscriptions.push(vscode.commands.registerCommand(`projectSwitcher.${name}`, handler));
    }
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(refresh));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('projectSwitcher.storagePath')) {
        void vscode.window.showInformationMessage('Project storage path changed. Reload the window to use the new file.', 'Reload Window')
          .then((answer) => {
            if (answer === 'Reload Window') return vscode.commands.executeCommand('workbench.action.reloadWindow');
          }, reportError);
      }
    }));
    if (!vscode.env.remoteName) {
      try { context.subscriptions.push(store.watch(refresh, reportError)); } catch (error) { reportError(error); }
    }
    output.appendLine(`Project list: ${storagePath}`);
    return { store, provider };
  } catch (error) {
    reportError(error);
    throw error;
  }
}

module.exports = { activate };
