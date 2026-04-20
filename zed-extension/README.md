# IntelliGit Client for Zed

IntelliGit for Zed is implemented as a **command-first extension** through `/intelligit` slash commands.
It targets parity with the VSCode IntelliGit command surface, with explicit fallbacks for UI affordances that Zed extensions cannot yet reproduce natively.

## Current Capability Model

- Native extension bootstrap: implemented (`extension.toml`, real `run_slash_command` lifecycle)
- Command layer parity spine: implemented (`src/commands.rs`)
- Panel parity: command-first fallback implemented (`src/panels/*.rs` data projections + slash commands)
- Editor/diff/compare workflows: command-first fallback implemented (`src/editor.rs`)
- Git backend: implemented via `GitService` (`src/git_service.rs`)
- State/cache/filters: implemented via `StateStore` (`src/state.rs`)

## Slash Command Usage

Use one command namespace:

- `/intelligit <action> [args...]`

Examples:

- `/intelligit help`
- `/intelligit refresh`
- `/intelligit branch.list`
- `/intelligit branch.checkout main`
- `/intelligit stash.list`
- `/intelligit graph.open_details HEAD`
- `/intelligit compare.open main feature/my-branch`
- `/intelligit operation.abort`

## Settings Contract

Settings are read from `.zed/settings.json` under key `intelligit`.

```json
{
  "intelligit": {
    "git_path": "git",
    "command_timeout_ms": 15000,
    "max_graph_commits": 200,
    "recent_branches_count": 3,
    "commit_message_templates": [
      { "label": "feat", "template": "feat({scope}): {cursor}" },
      { "label": "fix", "template": "fix({scope}): {cursor}" }
    ],
    "commit_message_ticket_pattern": "[A-Z]+-\\d+",
    "ai_generate_timeout_ms": 5000
  }
}
```

## Build

```bash
cd zed-extension
cargo build
cargo build --release
cargo test
```

## Important Notes

- This extension focuses on **capability parity** (outcomes), not visual parity with VSCode webviews.
- Where Zed extension APIs do not expose an equivalent panel/webview primitive, IntelliGit returns explicit command-fallback guidance.
- Destructive operations are still guarded by explicit command naming and output messaging; the caller should confirm before invoking them.

## Parity Matrix

See [`PARITY.md`](./PARITY.md) for command/view parity status against VSCode behavior.
