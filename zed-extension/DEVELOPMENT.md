# IntelliGit Zed Extension Development Guide

This extension is command-first and deliberately explicit about fallbacks.

## Module Layout

- `src/lib.rs`: extension bootstrap + slash command entry points
- `src/commands.rs`: parity command dispatcher and capability map
- `src/editor.rs`: compare/diff/conflict orchestration fallbacks
- `src/git_service.rs`: canonical git CLI backend
- `src/state.rs`: cached state, operation flags, compare session, filters
- `src/panels/branches.rs`: branch tree grouping
- `src/panels/changes.rs`: staged/unstaged/conflict/untracked projection
- `src/panels/stashes.rs`: stash filtering and rendering helpers
- `src/panels/graph.rs`: graph filter and rendering helpers
- `extension.toml`: Zed extension manifest and slash command registration
- `PARITY.md`: VSCode-to-Zed parity truth table

## Settings

Load settings from `.zed/settings.json` key `intelligit` with defaults in `ExtensionConfig`.

Supported keys:

- `git_path: string`
- `command_timeout_ms: u64`
- `max_graph_commits: u32`
- `recent_branches_count: u32`
- `commit_message_templates: [{label, template}]`
- `commit_message_ticket_pattern: string`
- `ai_generate_timeout_ms: u64`

## Command Contract

All flows go through:

- `/intelligit <action> [args...]`

Source of truth for supported actions is `CommandRuntime::help_text` in `src/commands.rs`.

## Testing

Run:

```bash
cargo build
cargo build --release
cargo test
```

Unit tests currently cover:

- git parsing helpers (`parse_track`, `parse_short_stat`)
- panel projections (`changes`, `stashes`, `graph`)
- command argument parsing (`require_arg`, reset mode parsing)
- state defaults and filter persistence

## Design Rule

When native UI primitives are missing in Zed extensions, do not no-op silently.
Always return a command-fallback message via slash command output.
