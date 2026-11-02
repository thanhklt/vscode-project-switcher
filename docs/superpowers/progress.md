# Progress — plan: docs/superpowers/plans/2026-11-02-project-switcher.md

- User authorized creating the proposed extension for both IDEs; proceed without another approval prompt.
- Empty workspace, no Git metadata: implement here without creating or altering Git history.
- Pre-flight: repository entries `{id, name, path}` are shared by actions and Tree View; no interface conflicts.
- Task 1: complete — 11 filesystem tests passed, including concurrent writers, malformed JSON and watcher notification.
- Task 2: complete — all 19 tests passed, covering command arguments, missing paths, canceled dialogs, renaming/removal and remote guards.
- Task 3: packaging succeeded (11 files, no runtime dependencies). Host verification in progress.
- Host runner: inherited ELECTRON_RUN_AS_NODE made Code.exe launch as Node, and test-electron used shell:true on Windows, splitting spaced paths. Use direct spawn(shell:false) and sanitize only the child environment. Real-process regression tests added before the fix; retain the installed editors' native extensionTestsPath contract without the test-electron dependency.
- Independent review: an aged lock could belong to a suspended live writer. Regression reproduced two acquisitions; removed automatic eviction, retaining exclusive ownership and a bounded busy error with manual crash-recovery instructions. Regression failed before the fix. Tradeoff: after a crash during a write, close both editors and remove only the .lock directory manually.
- Host observation: informational notification promises resolve on dismissal; Save Current must return after persistence without waiting for a toast. Added a failing never-dismissed-toast regression, then changed the informational notifications to nonblocking calls.
- Review coverage finding addressed: a second isolated development window now runs a test-only startup probe, reports its actual workspace atomically, and closes itself. The first window asserts the target folder and that its own workspace is preserved.
- Antigravity IDE host suite passed (vscode.version 1.107.0), including actual new-window opening. Built-in Antigravity warnings were unrelated to this extension.
- Node suite: 22/22 passed; JavaScript syntax: 13 files passed.
- User requested removal of extra downloaded editor builds after tests. Remove the official portable VS Code ZIP/build, isolated profiles, npm cache and development node_modules after final packaging. Retain source, lockfile and VSIX.
- VS Code 1.144.0 host suite passed, including actual new-window opening. Its installed build was blocked by an existing updater mutex; used the official portable archive with SHA256 055722269e3c9531af0c50a8b757c14e8062a0d02fc973b038863d9732c567ea, verified against Microsoft's release metadata.
- Final review finding on locking fixed and tested RED→GREEN; host coverage finding addressed by the real second-window probe. No deferred review findings remain.
- Task 3: complete — final VSIX packaged, 11 archive entries; packaged runtime files exactly match current source. VSIX SHA256: c44e221b297a57debe82cb3b4d41a94ec3d3dad3bceeab208ca09301626ff59f.
- Cleanup complete: removed .test-data (portable build, ZIP, metadata and all isolated profiles), .npm-cache, and node_modules. No installed VS Code/Antigravity files or normal editor profiles were changed. The sandbox could not remove a VS Code endpoint, so the same bounded workspace cleanup was rerun with escalation and succeeded.
