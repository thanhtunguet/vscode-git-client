---
name: project-overview
description: Purpose, tech stack, and structure of the vscode-git-client project
type: project
---

# Project: vscode-git-client (IntelliGit Client)

**Purpose:** A VS Code extension providing an IntelliJ-like Git client with branch tree, stashes, graph, merge/diff/compare workflows.

**Publisher:** thanhtunguet  
**Version:** 0.1.1  
**Repo:** https://github.com/thanhtunguet/vscode-git-client

## Tech Stack
- TypeScript (strict mode, ES2022 target, CommonJS modules)
- VS Code Extension API (vscode ^1.90.0)
- ESLint with @typescript-eslint (no explicit-any rule disabled)
- No runtime dependencies (dev-only: typescript, eslint, @vscode/vsce)

## Source Structure
```
src/
  extension.ts           # Entry point: activate/deactivate
  types.ts               # Shared types
  logger.ts              # Logger wrapper
  guards.ts              # Type guards
  commands/
    commandController.ts # Registers all VS Code commands
  providers/
    branchTreeProvider.ts
    stashTreeProvider.ts
    graphTreeProvider.ts
  services/
    gitService.ts        # Git operations via child_process
    repositoryContext.ts # Workspace/repo detection
  state/
    stateStore.ts        # Central state (branches, stashes, graph)
  views/
    compareView.ts       # Compare branches webview
  editor/
    editorOrchestrator.ts
    virtualGitContentProvider.ts
  test/
    gitParsing.test.ts
```

## Views (SCM panel)
- `intelliGit.branches` — branch tree
- `intelliGit.stashes` — stash list
- `intelliGit.graph` — git log graph

## Extension ID prefix: `intelliGit.*`
