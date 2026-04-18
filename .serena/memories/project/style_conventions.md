---
name: style-conventions
description: TypeScript code style and conventions for vscode-git-client
type: project
---

# Code Style & Conventions

## TypeScript
- Strict mode enabled
- ES2022 target, CommonJS modules
- No `any` enforcement relaxed (`@typescript-eslint/no-explicit-any: off`)
- `esModuleInterop: true`, `skipLibCheck: true`
- No docstrings/comments by default; only add when non-obvious

## Naming
- Classes: PascalCase (e.g. `GitService`, `BranchTreeProvider`)
- Methods/functions: camelCase
- VS Code command IDs: `intelliGit.<area>.<action>` (e.g. `intelliGit.branch.checkout`)
- View IDs: `intelliGit.<view>` (e.g. `intelliGit.branches`)
- ViewItem context values: camelCase noun (e.g. `branchRef`, `stashEntry`, `graphCommit`)

## Patterns
- Central state via `StateStore`; providers subscribe to it
- Git operations encapsulated in `GitService`
- Commands registered in `CommandController.register(context)`
- TreeDataProviders implement `vscode.TreeDataProvider<T>`
- Virtual documents use `intelligit://` URI scheme

## No test framework currently
- `npm run test` only compiles; actual tests in `src/test/` are manual/ad-hoc
