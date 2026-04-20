# IntelliGit VSCode -> Zed Parity Matrix

Status meanings:

- `native`: implemented directly in this Zed extension runtime
- `command-fallback`: implemented as `/intelligit` command workflow with equivalent outcome
- `deferred`: intentionally not implemented yet

## Core Lifecycle

- Extension bootstrap, repo discovery, runtime construction: `native`
- Capability map with explicit fallback messaging: `native`

## Command Families

- `refresh`, quick actions: `command-fallback`
- Branch actions (checkout/create/rename/delete/track/untrack/merge/rebase/reset/compare/search): `command-fallback`
- Stash actions (create/apply/pop/drop/rename/preview/unshelve): `command-fallback`
- Graph actions (details/diff/checkout/create branch+tag/cherry-pick/revert/patch/open revision/go parent/filter): `command-fallback`
- Diff/compare actions: `command-fallback`
- Conflict actions (accept ours/theirs/both) + operation actions (continue/skip/abort): `command-fallback`
- Push/pull/fetch preview, stage/unstage/amend: `command-fallback`
- File history/blame: `command-fallback`

## Panels

- Branches panel grouping/filtering logic: `native` (data projection)
- Changes panel grouping/filtering logic: `native` (data projection)
- Stashes panel filtering/description: `native` (data projection)
- Graph filtering/description: `native` (data projection)
- Rich docked interactive panel UI: `deferred`

## Editor Workflows

- Open conflict file workflow: `command-fallback`
- Diff entrypoints (`WORKTREE vs HEAD`, `INDEX vs HEAD`, `commit vs parent`, `ref vs ref`): `command-fallback`
- Branch compare + recent compare pairs: `command-fallback`
- Show repository at revision / open file at revision: `command-fallback`

## Notes

This matrix tracks capability parity, not visual parity with VSCode webviews.
