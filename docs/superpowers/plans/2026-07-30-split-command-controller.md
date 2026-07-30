# Split CommandController into Domain Command Groups

**Date:** 2026-07-30
**Status:** Phase 1 implemented (additive group facades). Phase 2 (removing the
flat members from `CommandController`, migrating `register.ts`/`activate()`/
tests to the grouped API) is **not** done — deferred as originally planned,
given the CRITICAL/195-upstream-dependent blast radius of touching those
call sites.
**Type:** Refactor (internal)

## Phase 1 implementation notes (2026-07-30)

- Created `src/commands/commandController/groups/<name>Commands.ts` for all
  12 non-Core groups (Branch, Tag, Stash, Graph, CommitDiffView, Compare,
  Operations, Patch, Staging, Remote, Submodule, Worktree). Each class takes
  the `CommandController` instance in its constructor and binds every member
  handler function to it — verified by script that all 192 non-Core members
  are covered with zero gaps/duplicates.
- `CommandController` gained 12 new readonly properties (`branch`, `tag`,
  `stash`, `graph`, `commitDiffView`, `compare`, `operations`, `patch`,
  `staging`, `remote`, `submodule`, `worktree`), each `new XCommands(this)`.
  **All 193 existing flat members are untouched.**
- **Pitfall found and fixed:** binding via a class-field initializer
  (`public readonly x = importedFn.bind(this.controller);`) fails to compile
  (`TS2729: Property 'controller' is used before its initialization`) under
  this project's `target: ES2022` (implies `useDefineForClassFields: true`):
  field initializers run before parameter-property assignment completes. Bound
  assignments were moved into the constructor **body** instead (`this.x =
  importedFn.bind(controller)`, using the constructor parameter directly, with
  fields pre-declared as `public readonly x: OmitThisParameter<typeof importedFn>;`).
- Verified: `tsc --noEmit` clean, `eslint` clean, full test suite
  (`npm run test`) 178/178 passing, `detect_changes({scope: "all"})` reports
  `risk_level: "low"`, `affected_count: 0` — confirming the change is
  behavior-preserving.
- Not done in this pass: nothing was migrated to *call* the new grouped API
  (`register.ts` still uses `this.handleBranchCheckout.bind(this)` etc., not
  `this.branch.handleBranchCheckout`). The groups exist and are usable by new
  code today, but `CommandController`'s own line count/member count did not
  shrink — that requires Phase 2.

## Problem

`src/commands/commandController/index.ts` defines `CommandController`, a class
with **193 public members** (1 constructor + 192 delegated properties/methods),
each wired from a standalone file under `src/commands/commandController/*.ts`
via `public readonly xyz = xyz;`. This is the result of an earlier refactor
(see `docs/changelogs/command-controller-refactor.md`, 2026-07-07) that
extracted inline `register()` callbacks into named functions — a necessary
first step, but it left every extracted function re-attached to the same
single class.

### GitNexus findings

- `CommandController` is its own cohesive cluster (54 symbols, 91% cohesion in
  `gitnexus://repo/vscode-git-client/clusters`), separate from Views,
  Providers, Editor, State, GitService — i.e. the codebase already treats
  "command handling" as one coherent domain, but the domain itself is not
  subdivided internally.
- `impact({target: "CommandController", direction: "upstream"})` reports
  **CRITICAL risk — 195 upstream dependents**, dominated by `activate()` in
  `src/extension.ts` and the test suite (`commandRegistration.test.ts`,
  `cherryPickFeedback.test.ts`, `commitDetailsBehaviors.test.ts`,
  `selectedCommitChanges.test.ts`), all of which construct or call into
  `CommandController` directly.
- **Implication:** any structural split must preserve the existing public
  surface `CommandController` exposes today (either by composition/delegation
  or by keeping `CommandController` as a thin facade), or all 195 dependents
  need coordinated updates. This plan assumes a **facade-preserving split**
  (Option A below) to keep risk at a manageable level.

## Recommendation: split into 12 domain command groups + 1 core/facade

12 cohesive groups fully account for all 192 non-constructor members (verified
programmatically — no gaps, no duplicates). Each group becomes its own class
(e.g. `BranchCommands`, `GraphCommands`) living in
`src/commands/commandController/groups/<name>Commands.ts`, constructed with
the same `(git, state, editor, logger, commitFilesView)` dependencies (or a
subset) that `CommandController` takes today. `CommandController` itself
becomes a thin facade that composes these groups and re-exposes their members
so `activate()` and existing tests don't need to change.

| # | Group | Members | Responsibility |
|---|-------|--------:|-----------------|
| 1 | **Core** | 10 | `register`, `legacyCommandId`, `getBuiltInGitRepository`, `getActiveFilePath`, `getErrorSummary`, `handleRefresh`, `handleQuickActions`/`openQuickActions`, `pickFileFromWorkspace`, `openRefCommits` — cross-cutting infra with no single domain owner |
| 2 | **Branch** | 22 | Branch checkout/create/delete/rename/track/untrack, branch search, branch action hub, branch↔current compare/rebase/merge, reset current to commit |
| 3 | **Tag** | 11 | Tag create/checkout/compare/copy revision/open commits/show-at-revision |
| 4 | **Stash** | 11 | Stash create/apply/pop/drop/rename/preview/unshelve, shelve resource |
| 5 | **Graph** | 25 | Commit-graph interactions: load more, filter, checkout/revert/cherry-pick-range, create branch/tag here, copy id/message, go to parent/child, open details |
| 6 | **CommitDiffView** | 24 | Commit details view, file diffs, type-guard/converter helpers (`asCommitViewFileItem`, `toCommitSha`, etc.), commit amend/edit-message, file blame |
| 7 | **Compare** | 7 | Diff/compare workflow entry points (`openDiffWorkflow`, `openCompareWorkflow`, directory timeline, compare-with-revision) |
| 8 | **Operations** | 24 | Merge/rebase/cherry-pick lifecycle: issue classification, start/abort/continue/skip, conflict resolution (ours/theirs/both), conflict path picking |
| 9 | **Patch** | 7 | Patch pick/read/apply/create/revert-from-selection |
| 10 | **Staging** | 6 | Stage/unstage file or patch, commit template, AI commit message generation, SCM amend-from-input |
| 11 | **Remote** | 14 | Remote add/delete/fetch(-all)/set-url, SSH pull (GitHub/GitLab/Bitbucket/custom), fetch-prune, pull/push with preview, push-all-up-to-here |
| 12 | **Submodule** | 16 | Submodule init/update/sync(-all/-recursive), deinit, open (terminal/new window), diff pointer, stage pointer change, refresh |
| 13 | **Worktree** | 16 | Worktree add (detached/new-branch/from-branch), lock/unlock, prune(-preview), remove(-force), open (terminal/new window), reveal in Finder, refresh |

**Total: 192 delegated members + 1 constructor = 193**, matching the current
class exactly (cross-checked with a script — zero unassigned, zero
duplicated).

### Why 12 groups (not fewer/more)

- Fewer groups (e.g. merging Graph into Operations, or Tag into Branch) would
  recreate god-classes at a smaller scale — Graph alone is already 25 members.
- More groups (e.g. splitting Submodule's "open" actions from its "sync"
  actions) would fragment a domain that IntelliJ-style Git clients treat as
  one panel/one concern, and GitNexus shows no natural seam inside it (all
  submodule handlers share the same few upstream callers).
- The boundaries mostly follow existing naming prefixes
  (`handleBranch*`, `handleTag*`, `handleStash*`, `handleGraph*`,
  `handleSubmodule*`, `handleWorktree*`, `handleGitSsh*`/`handleRemote*`),
  which mirrors how the VS Code tree providers and views are already split
  (`providers/branchesTreeProvider`, `providers/stashTreeProvider`, etc. —
  see the "Providers" cluster in GitNexus).

## Migration approach (facade-preserving, low risk)

1. **Do not touch `register()` or command IDs.** `register()` (member of
   Core) continues to wrap every callback with the same try/catch + legacy
   alias behavior; only *which object* a bound method lives on changes.
2. For each group, create `src/commands/commandController/groups/<Name>Commands.ts`
   exporting a class whose constructor takes the same dependency subset the
   member functions already require (most take `(git, state, editor, logger)`
   as free functions today — verify per group before assuming all five deps
   are needed).
3. In each group class, add `public readonly xyz = xyz;` delegations exactly
   as `CommandController` does today (same pattern, smaller class).
4. `CommandController` becomes:
   ```typescript
   export class CommandController {
     public readonly branch = new BranchCommands(this.git, this.state, ...);
     public readonly tag = new TagCommands(...);
     // ...

     // Back-compat: re-expose flattened members so activate() and existing
     // tests keep working without changes.
     public readonly handleBranchCheckout = this.branch.handleBranchCheckout;
     // ...
   }
   ```
   This keeps `impact({target: "CommandController"})`'s 195 upstream
   dependents unaffected in phase 1.
5. **Only after** `register.ts` and `activate()` are migrated to call through
   `controller.branch.handleBranchCheckout` etc. (a separate, later phase),
   remove the flattened re-exports from `CommandController`.
6. Migrate and verify **one group at a time**, running the existing test
   suite (162 tests per the prior refactor's changelog) after each group, and
   run `detect_changes({scope: "staged"})` before each commit to confirm only
   the intended symbols/processes are affected.

## Risk

- `impact` on `CommandController` = **CRITICAL** (195 upstream, `activate`
  entry point + 4 test files). Mitigated by the facade approach above —
  the class's public shape doesn't change in phase 1, only its internals.
- Re-run `impact({target: "<GroupName>Commands", direction: "upstream"})` for
  each new group class before removing its flattened re-export from
  `CommandController`, to confirm no direct external caller was missed.
- `detect_changes({scope: "compare", base_ref: "main"})` must be run before
  each commit in this migration.

## Out of scope

- No behavior change. This is a structural refactor only.
- No command ID renames (would break user keybindings/settings).
- No changes to `register()`'s try/catch or legacy-alias wrapping logic.
