# IntelliGit Client for Zed

A port of the VSCode IntelliGit extension to Zed IDE, providing JetBrains-like Git client features.

## Features

### Changes Panel
- Working tree and index status grouped by state (modified, staged, untracked, conflicted)
- File diff from change entry
- Conflict resolution shortcuts:
  - Accept Ours
  - Accept Theirs
  - Accept Both (open merge editor)
- In-progress operation banner (merge / rebase / cherry-pick) with Continue, Skip, Abort actions
- Stash selected changes

### Branches Panel
- Hierarchical branch tree grouped by prefix (`feature/*`, `release/*`, etc.)
- Local + remote branches
- Current branch marker + upstream/ahead/behind info
- Branch actions:
  - Checkout
  - Create
  - Rename
  - Delete
  - Track / untrack upstream
  - Merge into current
  - Rebase current onto selected branch
  - Reset current branch to selected commit (`soft|mixed|hard`) with confirmation
  - Compare with current branch
- Branch search/filter command

### Stashes Panel
- Stash list with message, author, timestamp, file count
- Stash actions:
  - Create stash (include untracked, keep index)
  - Apply
  - Pop
  - Drop (guarded)
  - Rename message
  - Patch preview (diff document)
  - Unshelve (apply stash to working tree without removing)
  - Stash selected changes from Changes view

### Git Graph Panel
- Commit list with graph-like glyph, refs, metadata, author/date
- Commit details view:
  - Full message
  - Parent SHAs
  - Changed files
  - Stats (files/insertions/deletions)
- Commit actions:
  - Checkout commit (detached, guarded)
  - Create branch at commit
  - Create tag at commit
  - Cherry-pick commit
  - Revert commit
  - Cherry-pick range
  - Compare commit with current branch
  - Interactive rebase from selected commit
  - Go to parent commit
  - Create patch from commit
  - Open file at revision
  - Show repository at revision
- Graph filters:
  - branch/ref
  - author
  - message text
  - since / until dates

### Main Editor Workflows
- 3-way merge: integrates with Zed's merge editor
- Side-by-side diff entry points:
  - Working tree vs HEAD
  - Index vs HEAD
  - Commit vs parent
  - Any two refs for a file
- Branch comparison tab:
  - Dedicated view for `A..B`, `B..A`, changed files
  - Drill down into file-level diff
  - Recent compare pairs persisted in workspace state

### Cross-cutting Features
- Quick Git Actions command palette entry
- Push/pull previews (incoming/outgoing commit summaries)
- Fetch --prune
- Partial staging (`git add -p`)
- Stage file / unstage file
- Amend last commit
- File history and blame from active editor file
- Guardrails for destructive operations with modal confirmation
- Output channel logging of executed Git commands
- Deterministic state refresh after mutating operations

## Architecture

The extension is structured similarly to the VSCode version:

- `src/git_service.rs` - Native `git` CLI wrapper with typed methods
- `src/state.rs` - Central cached state for branches/stashes/graph/compare
- `src/panels/` - Panel providers for Changes, Branches, Stashes, and Git Graph
- `src/commands.rs` - Command registration and action orchestration
- `src/editor.rs` - Merge/diff/compare orchestration
- `src/types.rs` - Shared type definitions

## Building

```bash
cargo build --release
```

## Installation

Copy the compiled extension to your Zed extensions directory:

```bash
mkdir -p ~/.config/zed/extensions/intelligit
cp target/release/libintelligit.so ~/.config/zed/extensions/intelligit/
```

## Configuration

Add to your Zed settings.json:

```json
{
  "intelligit": {
    "git_path": "git",
    "command_timeout_ms": 15000,
    "max_graph_commits": 200
  }
}
```

## Notes

- Single-repo per window (first workspace folder)
- Native Git CLI required on system path
- Uses built-in Zed merge/diff editors for reliability
- Graph is tree-based rendering (with glyph hints)
- PR/issue tracker integrations are intentionally not included in this core-parity scope
