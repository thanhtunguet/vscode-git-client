---
name: task-completion
description: What to do after completing a coding task in vscode-git-client
type: project
---

# Task Completion Checklist

1. **Compile**: `npm run compile` — ensure no TypeScript errors
2. **Lint**: `npm run lint` — fix any ESLint issues
3. **Impact check**: Run `gitnexus_detect_changes({scope: "all"})` to verify only expected symbols changed
4. **Manual test**: F5 in VS Code to test the feature in Extension Development Host
5. **Refresh index**: After committing, run `npx gitnexus analyze` (or with `--embeddings` if applicable)

## Before editing any symbol
- MUST run `gitnexus_impact({target: "symbolName", direction: "upstream"})` first
- Warn user if risk is HIGH or CRITICAL
