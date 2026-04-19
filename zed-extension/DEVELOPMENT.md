# IntelliGit Zed Extension Development Guide

This document provides guidance for continuing development of the IntelliGit Zed extension.

## Project Structure

```
zed-extension/
├── Cargo.toml              # Rust package configuration
├── README.md               # Extension documentation
└── src/
    ├── lib.rs              # Main extension entry point
    ├── types.rs            # Shared type definitions
    ├── git_service.rs      # Git CLI wrapper service
    ├── state.rs            # Central state management
    └── panels/
        ├── mod.rs          # Panels module declaration
        └── branches.rs     # Branches panel implementation
```

## Implemented Components

### Core Types (`src/types.rs`)
- `BranchRef` - Branch reference information
- `StashEntry` - Stash entry data
- `GraphCommit` - Commit graph node
- `CompareResult` - Branch comparison results
- `WorkingTreeChange` - Working directory changes
- `MergeConflictFile` - Conflict file information
- `GitOperationState` - Current git operation state
- And supporting types...

### Git Service (`src/git_service.rs`)
Complete async git CLI wrapper with methods for:
- Repository detection and info
- Branch operations (create, delete, rename, checkout, track)
- Stash operations (create, apply, pop, drop, rename)
- Commit operations (cherry-pick, revert, reset, amend)
- Merge/rebase operations (abort, continue, skip)
- Graph/log retrieval
- File operations (stage, unstage, diff, blame, history)
- Conflict resolution

### State Management (`src/state.rs`)
Thread-safe state store with:
- Cached branches, stashes, changes, graph
- Compare result tracking
- Recent compare pairs persistence
- Refresh methods (all, branches, stashes, changes, graph)
- Graph filters support

### Branches Panel (`src/panels/branches.rs`)
Tree view structure for branches with:
- Section nodes (Recent, Local, Remote)
- Remote group nodes (by remote name)
- Path group nodes (feature/, release/, etc.)
- Branch leaf nodes
- Filtering support
- Sorting (current first, then alphabetically)

## Remaining Work

### Panel Implementations Needed
1. **Changes Panel** (`src/panels/changes.rs`)
   - Working tree status display
   - Staged/unstaged grouping
   - Conflict resolution UI
   - Operation banner (merge/rebase/cherry-pick in progress)

2. **Stashes Panel** (`src/panels/stashes.rs`)
   - Stash list display
   - Stash actions (apply, pop, drop, rename)
   - Patch preview

3. **Git Graph Panel** (`src/panels/graph.rs`)
   - Commit list with graph visualization
   - Commit details view
   - Commit actions menu

### Command Handlers (`src/commands.rs`)
Implement command handlers for:
- Quick Git Actions palette
- Branch commands (checkout, create, delete, merge, rebase)
- Stash commands
- Conflict resolution commands
- Operation control (abort, continue, skip)
- Diff/compare commands

### Editor Integration (`src/editor.rs`)
- Merge editor orchestration
- Diff view helpers
- Branch comparison view

### Extension Manifest
Create `extension.toml` for Zed:
```toml
id = "intelligit"
name = "IntelliGit"
version = "0.1.0"
schema_version = 1
authors = ["Your Name"]
description = "JetBrains-like Git client for Zed"
repository = "https://github.com/your/repo"

[language_servers]
# If applicable

[grammars]
# If applicable
```

## Building

```bash
cd zed-extension
cargo build --release
```

The compiled extension will be at `target/release/libintelligit.so`.

## Testing

Since cargo is not available in the current environment, testing should be done:
1. Install Rust toolchain locally
2. Run `cargo check` for compilation errors
3. Run `cargo test` for unit tests
4. Test in Zed IDE by copying to extensions directory

## Zed Extension API Reference

Key Zed extension APIs used:
- `zed::Extension` - Main extension trait
- `zed::Worktree` - Workspace representation
- `zed::Event` - Lifecycle events
- `WorktreeId` - Workspace identifier

For full API documentation, see:
- https://zed.dev/docs/extensions/api-reference
- https://github.com/zed-industries/zed/tree/main/crates/zed_extension_api

## Porting Notes from VSCode Version

### Key Differences
1. **UI Framework**: Zed uses native panels instead of webviews
2. **Language**: Rust vs TypeScript
3. **Async Model**: tokio vs Promise-based
4. **Extension API**: Different capabilities and constraints

### Architecture Mapping
| VSCode Component | Zed Equivalent |
|-----------------|----------------|
| TreeDataProvider | Custom panel rendering |
| WebviewPanel | Native Zed panels |
| commands.registerCommand | Extension event handlers |
| workspace.fs | std::fs with async wrappers |
| vscode.Uri | PathBuf / zed paths |

## Next Steps

1. Create remaining panel implementations
2. Implement command handlers
3. Add editor integration
4. Create extension manifest
5. Test in Zed IDE
6. Add configuration options
7. Implement auto-refresh on file changes
8. Add error handling and user notifications
