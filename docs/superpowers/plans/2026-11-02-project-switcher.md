# Project Switcher Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Execution is authorized by the user's request to create the extension; keep work in the empty supplied workspace.

**Goal:** Deliver an installable project switcher for VS Code and Antigravity IDE.

**Architecture:** A filesystem repository owns persistence and locking. A VS Code controller and native Tree View own editor interactions. Package all runtime code without dependencies into a VSIX.

**Tech Stack:** CommonJS JavaScript, stable VS Code 1.85 APIs, Node test runner, @vscode/vsce, direct isolated editor extension-host runner.

**Spec:** `docs/superpowers/specs/2026-11-02-project-switcher-design.md`

## Global Constraints

- Stable VS Code APIs only; minimum 1.85.
- Shared storage `~/.project-switcher/projects.json`, with a machine-scoped absolute storagePath override.
- Never delete project folders, run shell commands, or overwrite malformed storage.
- Local desktop folders only; use isolated test profiles and storage.

## Review Focus

1. Concurrent writes from separate instances must preserve both additions.
2. Invalid/unknown-version JSON must remain intact after a rejected mutation.
3. Folder paths with spaces, Unicode, trailing separators, or Windows case differences must behave correctly.
4. A removed/missing project must not trigger a workspace switch.
5. Storage failures and external changes must reach the UI without unhandled rejections.

### Task 1: Persistent repository

Files: `src/project-store.js`, `test/project-store.test.js`.
Interface: `new ProjectStore(filePath)`, async `list()`, `add(paths)`, `rename(id, name)`, `remove(id)`; `watch(onChange, onError)` returns a disposable. Entries are `{id, name, path}`.

- [x] Write failing real-filesystem tests for add/reload/rename/remove, duplicates, concurrent writers, bad JSON/schema, missing/non-folder paths, stale locks, and external file replacement.
- [x] Run `node --test test/project-store.test.js`, confirm failure before implementation.
- [x] Implement validated atomic persistence, locking, and watching; run the same tests to green. After review, stale locks require safe manual recovery rather than eviction by age.

### Task 2: Editor commands and sidebar

Files: `package.json`, `src/extension.js`, `src/projects-view.js`, `src/project-actions.js`, `media/projects.svg`, `test/project-actions.test.js`.
Interface: `activate(context)` registers commands and provider; `createProjectActions(vscode, store, refresh)` supplies commands, keeping persistence real in tests and editor boundary calls injectable.

- [x] Write failing command tests for opening exact URIs, configured window mode, explicit new-window override, missing folders, canceled dialogs, add/current/rename/remove and refresh after changes.
- [x] Run `node --test test/project-actions.test.js`, confirm RED.
- [x] Implement standard commands, native Tree View, external refresh, remote guard, storage path change reload notification, manifest and icon.
- [x] Run all Node tests to green.

### Task 3: Package and host verification

Files: `test/host/index.js`, `scripts/test-host.js`, `scripts/check.js`, `.vscode/launch.json`, `.vscodeignore`, `.gitignore`, `README.md`, `LICENSE`, `CHANGELOG.md`.

- [x] Add actual extension-host checks for activation, registered commands, persisted current project, tree labels, and opening a folder in a new isolated window.
- [x] Install development-only tools, run syntax checks and all Node tests.
- [x] Run isolated extension-host smoke tests against VS Code and Antigravity IDE. The installed VS Code was update-locked; verified the official portable VS Code 1.144.0 archive with Microsoft's SHA256 before testing it. Both hosts passed, including actual new-window workspace confirmation.
- [x] Package `dist/project-switcher-0.1.0.vsix`, inspect its file list, and document installation and verification limits. Verified 11 archive entries and byte-for-byte matches of all runtime source, manifest and icon. Removed portable VS Code, downloaded ZIP, test profiles, npm cache and node_modules after testing as requested.

## Execution notes

This directory is empty and has no Git repository, so there is no branch to isolate, commit, or merge. Continue directly in the workspace supplied for this new extension. Implement inline; request one independent review after the implementation, as required by the execution skill.
