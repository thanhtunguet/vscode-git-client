---
name: suggested-commands
description: Key development commands for vscode-git-client
type: project
---

# Suggested Commands

## Build & Compile
```bash
npm run compile        # tsc -p . (one-shot build to dist/)
npm run watch          # tsc --watch (incremental, use during dev)
```

## Lint
```bash
npm run lint           # eslint src --ext .ts
```

## Test
```bash
npm run test           # Currently just runs compile (no test runner)
```

## Package Extension
```bash
npx vsce package       # Creates .vsix file for local install
```

## Run in VS Code
- Press F5 in VS Code to open Extension Development Host
- Or use "Run Extension" launch config

## Git / Code Intelligence
```bash
npx gitnexus analyze           # Refresh GitNexus index after commits
npx gitnexus analyze --embeddings  # Preserve semantic embeddings
```
