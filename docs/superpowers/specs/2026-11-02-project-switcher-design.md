# Project Switcher

Build a desktop extension for VS Code and Antigravity IDE using stable VS Code APIs (minimum 1.85). The user accepted the proposed Projects sidebar and requested implementation for both editors.

## Behavior

- A Projects Activity Bar icon opens a native, accessible tree of saved local folders.
- Add one or more folders, save the current project, rename a display name, remove a saved entry, and search with Quick Pick. Removing an entry never removes files.
- Selecting a project opens its folder as the editor workspace, in the current window by default. A context command opens a new window; a setting can change the default.
- Use `vscode.openFolder`, never a shell command or terminal `cd`. Existing terminals and agent conversations are not retargeted.
- Persist `{ version: 1, projects: [{ id, name, path }] }` in `~/.project-switcher/projects.json`. Both editors use that file. A machine-scoped absolute storagePath setting allows an alternative local file.
- Validate folders, preserve Unicode/spaces, deduplicate canonical paths, serialize writes across windows using an exclusive lock, replace data atomically, and refresh on external changes. Invalid data is reported and never silently overwritten.
- Desktop local projects only. Remote windows show an explanation instead of opening local paths on a remote machine.

## Approach

A native Tree View is chosen over a webview because the requested UI is a project list and native controls provide themes, keyboard navigation, and accessibility. A shared JSON file is chosen over per-editor globalState so both installed editors share the same list. No runtime dependencies, telemetry, shell execution, or private Antigravity APIs.

## Deliverables and checks

Source, Node tests for real filesystem behavior and command boundaries, extension-host smoke tests for each installed editor, Vietnamese installation instructions, and a locally packaged VSIX. Tests use isolated storage and editor profiles. Compatibility claims must name which hosts actually passed. No marketplace publication or installation into normal editor profiles is required.
