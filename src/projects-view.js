'use strict';

const { pathKey } = require('./project-store');

class ProjectsView {
  constructor(vscode, store, reportError) {
    this.vscode = vscode;
    this.store = store;
    this.reportError = reportError;
    this.emitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.emitter.event;
    this.lastError = undefined;
  }

  refresh() { this.emitter.fire(); }

  async getChildren(element) {
    if (element || this.vscode.env.remoteName) return [];
    try {
      const projects = await this.store.list();
      this.lastError = undefined;
      return projects.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      if (error.message !== this.lastError) {
        this.lastError = error.message;
        this.reportError(error);
      }
      return [];
    }
  }

  getTreeItem(project) {
    const { vscode } = this;
    const current = vscode.workspace.workspaceFolders?.some((folder) =>
      folder.uri.scheme === 'file' && pathKey(folder.uri.fsPath) === pathKey(project.path));
    const item = new vscode.TreeItem(project.name, vscode.TreeItemCollapsibleState.None);
    item.id = project.id;
    item.description = current ? `Current · ${project.path}` : project.path;
    item.tooltip = `${project.name}\n${project.path}${current ? '\nCurrently open' : ''}`;
    item.iconPath = new vscode.ThemeIcon(current ? 'folder-opened' : 'folder');
    item.contextValue = 'savedProject';
    item.command = { command: 'projectSwitcher.open', title: 'Open Project', arguments: [project] };
    return item;
  }

  dispose() { this.emitter.dispose(); }
}

module.exports = { ProjectsView };
