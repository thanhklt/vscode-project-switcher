'use strict';

const fs = require('node:fs/promises');

function createProjectActions(vscode, store, refresh) {
  const run = (action) => async (...args) => {
    try {
      if (vscode.env.remoteName) throw new Error('Project Switcher supports local folders. Open a local editor window to use your saved projects.');
      return await action(...args);
    } catch (error) {
      await vscode.window.showErrorMessage(`Project Switcher: ${error.message}`);
    }
  };

  async function choose(entry, placeholder = 'Search projects by name or path') {
    const projects = await store.list();
    if (entry) {
      const latest = projects.find((project) => project.id === entry.id);
      if (!latest) throw new Error('This project is no longer in the list. Refresh and try again.');
      return latest;
    }
    if (!projects.length) {
      void vscode.window.showInformationMessage('No saved projects yet. Use Projects: Add Folders first.');
      return undefined;
    }
    const picked = await vscode.window.showQuickPick(
      projects.sort((a, b) => a.name.localeCompare(b.name)).map((project) => ({
        label: project.name, description: project.path, project,
      })),
      { placeHolder: placeholder, matchOnDescription: true },
    );
    return picked?.project;
  }

  async function open(entry, newWindow) {
    const project = await choose(entry);
    if (!project) return;
    try {
      if (!(await fs.stat(project.path)).isDirectory()) throw new Error('Not a directory');
    } catch {
      throw new Error(`Project folder is missing or inaccessible: ${project.path}. Restore it or remove this entry from the list.`);
    }
    const forceNewWindow = newWindow ?? vscode.workspace.getConfiguration('projectSwitcher').get('openInNewWindow', false);
    return vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(project.path), { forceNewWindow });
  }

  return {
    open: run(open),
    search: run(() => open()),
    add: run(async () => {
      const folders = await vscode.window.showOpenDialog({
        canSelectFiles: false, canSelectFolders: true, canSelectMany: true,
        openLabel: 'Add Projects', title: 'Choose project folders to save',
      });
      if (!folders?.length) return;
      if (folders.some((uri) => uri.scheme !== 'file')) throw new Error('Only local folder paths are supported.');
      await store.add(folders.map((uri) => uri.fsPath));
      refresh();
    }),
    saveCurrent: run(async () => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders?.length) {
        void vscode.window.showInformationMessage('Open a project folder first, or use Projects: Add Folders.');
        return;
      }
      if (folders.some((folder) => folder.uri.scheme !== 'file')) throw new Error('Only local folder paths are supported.');
      await store.add(folders.map((folder) => folder.uri.fsPath));
      refresh();
      void vscode.window.showInformationMessage('Current project folders saved to Projects.');
    }),
    rename: run(async (entry) => {
      const project = await choose(entry, 'Choose a project to rename');
      if (!project) return;
      const name = await vscode.window.showInputBox({
        title: 'Rename Project', prompt: 'Display name (the folder on disk will keep its name)', value: project.name,
        validateInput: (value) => value.trim() ? undefined : 'Enter a project name.',
      });
      if (name === undefined) return;
      await store.rename(project.id, name);
      refresh();
    }),
    remove: run(async (entry) => {
      const project = await choose(entry, 'Choose a project to remove from the list');
      if (!project) return;
      const answer = await vscode.window.showWarningMessage(
        `Remove "${project.name}" from Projects? Your folder and files will be kept.`,
        { modal: true }, 'Remove',
      );
      if (answer !== 'Remove') return;
      await store.remove(project.id);
      refresh();
    }),
  };
}

module.exports = { createProjectActions };
