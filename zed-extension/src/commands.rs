//! Command-first parity layer for IntelliGit in Zed.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::editor::EditorOrchestrator;
use crate::git_service::{GitConfig, GitError, GitService, RepositoryContext};
use crate::panels::branches::{build_branch_tree, describe_branch};
use crate::panels::changes::build_changes_panel;
use crate::panels::graph::{describe_commit, filter_graph};
use crate::panels::stashes::{describe_stash, filter_stashes};
use crate::state::StateStore;
use crate::types::{GraphFilters, ResetMode, StashOptions};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitTemplate {
    pub label: String,
    pub template: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionConfig {
    pub git_path: String,
    pub command_timeout_ms: u64,
    pub max_graph_commits: u32,
    pub recent_branches_count: u32,
    pub commit_message_templates: Vec<CommitTemplate>,
    pub commit_message_ticket_pattern: String,
    pub ai_generate_timeout_ms: u64,
}

impl Default for ExtensionConfig {
    fn default() -> Self {
        Self {
            git_path: "git".to_string(),
            command_timeout_ms: 15000,
            max_graph_commits: 200,
            recent_branches_count: 3,
            commit_message_templates: vec![
                CommitTemplate {
                    label: "feat".to_string(),
                    template: "feat({scope}): {cursor}".to_string(),
                },
                CommitTemplate {
                    label: "fix".to_string(),
                    template: "fix({scope}): {cursor}".to_string(),
                },
                CommitTemplate {
                    label: "chore".to_string(),
                    template: "chore: {cursor}".to_string(),
                },
                CommitTemplate {
                    label: "ticket".to_string(),
                    template: "[{ticket}] {cursor}".to_string(),
                },
            ],
            commit_message_ticket_pattern: "[A-Z]+-\\d+".to_string(),
            ai_generate_timeout_ms: 5000,
        }
    }
}

#[derive(Debug, Clone)]
pub enum Capability {
    Native(&'static str),
    CommandFallback(&'static str),
    Deferred(&'static str),
}

#[derive(Debug, Clone)]
pub struct CapabilityMap {
    pub changes_panel: Capability,
    pub stashes_panel: Capability,
    pub graph_panel: Capability,
    pub branches_panel: Capability,
    pub merge_editor_actions: Capability,
    pub compare_view: Capability,
}

impl Default for CapabilityMap {
    fn default() -> Self {
        Self {
            changes_panel: Capability::CommandFallback(
                "Use /intelligit changes.list and /intelligit changes.open_diff",
            ),
            stashes_panel: Capability::CommandFallback(
                "Use /intelligit stash.list and stash subcommands",
            ),
            graph_panel: Capability::CommandFallback(
                "Use /intelligit graph.list and graph subcommands",
            ),
            branches_panel: Capability::CommandFallback(
                "Use /intelligit branch.list and branch subcommands",
            ),
            merge_editor_actions: Capability::CommandFallback(
                "Use /intelligit conflict.* and /intelligit operation.*",
            ),
            compare_view: Capability::CommandFallback(
                "Use /intelligit compare.open and compare.recent",
            ),
        }
    }
}

pub struct CommandRuntime {
    pub state: StateStore,
    pub config: ExtensionConfig,
    pub capabilities: CapabilityMap,
}

impl CommandRuntime {
    pub fn new(root_path: PathBuf, config: ExtensionConfig) -> Self {
        let git_service = GitService::new(
            RepositoryContext { root_path },
            GitConfig {
                git_path: config.git_path.clone(),
                timeout_ms: config.command_timeout_ms,
            },
        );

        let state = StateStore::new(
            git_service,
            config.max_graph_commits,
            config.recent_branches_count as usize,
        );

        Self {
            state,
            config,
            capabilities: CapabilityMap::default(),
        }
    }

    pub fn execute(&self, action: &str, args: &[String]) -> Result<String, String> {
        let mut guard = self.state.inner_mut();
        let git = &mut guard.git_service;

        let output = match action {
            "help" => self.help_text(),
            "capabilities" => render_capabilities(&self.capabilities),

            "refresh" => {
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                "Refreshed branches, stashes, changes, operation state, conflicts, and graph.".to_string()
            }

            "quick_actions" => self.quick_actions_text(),

            "branch.list" => {
                drop(guard);
                self.state.refresh_branches().map_err(format_git_error)?;
                let branches = self.state.branches();
                let tree = build_branch_tree(&branches, args.first().map(String::as_str));
                render_branch_tree(&tree)
            }
            "branch.checkout" => {
                let branch = require_arg(args, 0, "branch name")?;
                git.checkout_branch(branch).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Checked out branch '{}'", branch)
            }
            "branch.create" => {
                let branch = require_arg(args, 0, "new branch name")?;
                let base = args.get(1).map(String::as_str);
                git.create_branch(branch, base).map_err(format_git_error)?;
                git.checkout_branch(branch).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Created and checked out '{}'", branch)
            }
            "branch.rename" => {
                let from = require_arg(args, 0, "source branch")?;
                let to = require_arg(args, 1, "target branch")?;
                git.rename_branch(from, to).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Renamed branch '{}' -> '{}'", from, to)
            }
            "branch.delete" => {
                let branch = require_arg(args, 0, "branch name")?;
                let force = args.get(1).map(String::as_str) == Some("force");
                git.delete_branch(branch, force).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Deleted branch '{}' (force={})", branch, force)
            }
            "branch.track" => {
                let local = require_arg(args, 0, "local branch")?;
                let upstream = require_arg(args, 1, "upstream branch")?;
                git.track_branch(local, upstream).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Tracking '{}' with upstream '{}'", local, upstream)
            }
            "branch.untrack" => {
                let local = require_arg(args, 0, "local branch")?;
                git.untrack_branch(local).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Removed upstream tracking for '{}'", local)
            }
            "branch.merge_into_current" => {
                let branch = require_arg(args, 0, "source branch")?;
                git.merge_into_current(branch).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Merged '{}' into current branch", branch)
            }
            "branch.rebase_onto" => {
                let branch = require_arg(args, 0, "target branch")?;
                git.rebase_current_onto(branch).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Rebasing current branch onto '{}'", branch)
            }
            "branch.reset_current_to_commit" => {
                let target = require_arg(args, 0, "target commit")?;
                let mode = parse_reset_mode(args.get(1).map(String::as_str).unwrap_or("mixed"))?;
                git.reset_current(target, mode).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Reset current branch to '{}' with mode {:?}", target, mode)
            }
            "branch.compare_with_current" => {
                let branch = require_arg(args, 0, "branch")?;
                let current = git.get_current_branch().map_err(format_git_error)?;
                drop(guard);
                let result = EditorOrchestrator::open_branch_compare(&self.state, branch, &current)
                    .map_err(format_git_error)?;
                render_compare(&result)
            }

            "stash.list" => {
                drop(guard);
                self.state.refresh_stashes().map_err(format_git_error)?;
                let stashes = filter_stashes(&self.state.stashes(), args.first().map(String::as_str));
                if stashes.is_empty() {
                    "No stashes found.".to_string()
                } else {
                    stashes
                        .iter()
                        .map(describe_stash)
                        .collect::<Vec<_>>()
                        .join("\n")
                }
            }
            "stash.create" => {
                let message = require_arg(args, 0, "stash message")?;
                let include_untracked = has_flag(args, "include-untracked");
                let keep_index = has_flag(args, "keep-index");
                git.create_stash(
                    message,
                    StashOptions {
                        include_untracked,
                        keep_index,
                    },
                )
                .map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!(
                    "Created stash '{}' (include_untracked={}, keep_index={})",
                    message, include_untracked, keep_index
                )
            }
            "stash.apply" => {
                let reference = require_arg(args, 0, "stash reference")?;
                git.apply_stash(reference, false).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Applied {}", reference)
            }
            "stash.pop" => {
                let reference = require_arg(args, 0, "stash reference")?;
                git.apply_stash(reference, true).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Popped {}", reference)
            }
            "stash.drop" => {
                let reference = require_arg(args, 0, "stash reference")?;
                git.drop_stash(reference).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Dropped {}", reference)
            }
            "stash.rename" => {
                let reference = require_arg(args, 0, "stash reference")?;
                let new_message = require_arg(args, 1, "new message")?;
                git.rename_stash(reference, new_message).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Renamed {} -> {}", reference, new_message)
            }
            "stash.preview_patch" => {
                let reference = require_arg(args, 0, "stash reference")?;
                git.get_stash_patch(reference).map_err(format_git_error)?
            }
            "stash.unshelve" => {
                let reference = require_arg(args, 0, "stash reference")?;
                git.apply_stash(reference, false).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Unshelved {}", reference)
            }

            "graph.list" => {
                drop(guard);
                self.state.refresh_graph(None).map_err(format_git_error)?;
                let filters = self.state.panel_filters().graph_filter;
                let graph = filter_graph(&self.state.graph(), &filters);
                render_graph(&graph)
            }
            "graph.open_details" => {
                let sha = require_arg(args, 0, "commit sha")?;
                let details = git.get_commit_details(sha).map_err(format_git_error)?;
                format!(
                    "{}\n\n{}\n\nChanged files:\n{}",
                    describe_commit(&details.commit),
                    details.body,
                    details
                        .changed_files
                        .iter()
                        .map(|f| format!("{} {}", f.status, f.path))
                        .collect::<Vec<_>>()
                        .join("\n")
                )
            }
            "graph.open_file_diff" => {
                let left = require_arg(args, 0, "left ref")?;
                let right = require_arg(args, 1, "right ref")?;
                let path = require_arg(args, 2, "file path")?;
                EditorOrchestrator::open_diff_for_file(left, right, path)
            }
            "graph.checkout_commit" => {
                let sha = require_arg(args, 0, "commit sha")?;
                git.checkout_commit(sha).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Checked out {} in detached HEAD", sha)
            }
            "graph.create_branch_here" => {
                let sha = require_arg(args, 0, "commit sha")?;
                let branch = require_arg(args, 1, "new branch")?;
                git.create_branch(branch, Some(sha)).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Created branch '{}' at {}", branch, sha)
            }
            "graph.create_tag_here" => {
                let sha = require_arg(args, 0, "commit sha")?;
                let tag = require_arg(args, 1, "tag")?;
                git.create_tag(tag, sha).map_err(format_git_error)?;
                format!("Created tag '{}' at {}", tag, sha)
            }
            "graph.cherry_pick" => {
                let sha = require_arg(args, 0, "commit sha")?;
                git.cherry_pick(sha).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Cherry-picked {}", sha)
            }
            "graph.cherry_pick_range" => {
                let from = require_arg(args, 0, "from (exclusive)")?;
                let to = require_arg(args, 1, "to (inclusive)")?;
                git.cherry_pick_range(from, to).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Cherry-picked range {}..{}", from, to)
            }
            "graph.revert" => {
                let sha = require_arg(args, 0, "commit sha")?;
                git.revert_commit(sha).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Reverted {}", sha)
            }
            "graph.rebase_interactive_from_here" => {
                let sha = require_arg(args, 0, "commit sha")?;
                git.rebase_interactive(sha).map_err(format_git_error)?;
                format!("Started interactive rebase from {}", sha)
            }
            "graph.compare_with_current" => {
                let sha = require_arg(args, 0, "commit sha")?;
                let current = git.get_current_branch().map_err(format_git_error)?;
                drop(guard);
                let result = EditorOrchestrator::open_branch_compare(&self.state, sha, &current)
                    .map_err(format_git_error)?;
                render_compare(&result)
            }
            "graph.create_patch" => {
                let sha = require_arg(args, 0, "commit sha")?;
                git.get_patch_for_commit(sha).map_err(format_git_error)?
            }
            "graph.show_repository_at_revision" => {
                let sha = require_arg(args, 0, "commit sha")?;
                let files = EditorOrchestrator::show_repository_at_revision(git, sha)
                    .map_err(format_git_error)?;
                if files.is_empty() {
                    format!("No files found at revision {}", sha)
                } else {
                    format!("Files at {}:\n{}", sha, files.join("\n"))
                }
            }
            "graph.open_repository_file_at_revision" => {
                let reference = require_arg(args, 0, "reference")?;
                let path = require_arg(args, 1, "file path")?;
                EditorOrchestrator::open_file_at_revision(git, reference, path)
                    .map_err(format_git_error)?
            }
            "graph.go_to_parent_commit" => {
                let sha = require_arg(args, 0, "commit sha")?;
                let parent = EditorOrchestrator::go_to_parent_commit(git, sha)
                    .map_err(format_git_error)?;
                match parent {
                    Some(parent_sha) => format!("Parent of {} is {}", sha, parent_sha),
                    None => format!("{} has no parent (root commit)", sha),
                }
            }
            "graph.filter" => {
                let mut filters = GraphFilters::default();
                filters.branch = args.first().cloned();
                filters.author = args.get(1).cloned();
                filters.message = args.get(2).cloned();
                filters.since = args.get(3).cloned();
                filters.until = args.get(4).cloned();
                drop(guard);
                self.state.refresh_graph(Some(filters)).map_err(format_git_error)?;
                "Applied graph filters.".to_string()
            }
            "graph.clear_filter" => {
                drop(guard);
                self.state.clear_graph_filters().map_err(format_git_error)?;
                "Cleared graph filters.".to_string()
            }

            "changes.list" => {
                drop(guard);
                self.state.refresh_changes().map_err(format_git_error)?;
                let panel = build_changes_panel(&self.state.changes(), args.first().map(String::as_str));
                render_changes_panel(&panel)
            }
            "changes.open_file_diff" => {
                let path = require_arg(args, 0, "file path")?;
                EditorOrchestrator::open_diff_for_file("HEAD", "WORKTREE", path)
            }
            "changes.stash_selected" => {
                let message = require_arg(args, 0, "stash message")?;
                let path_args = args.iter().skip(1).map(String::as_str).collect::<Vec<_>>();
                git.stash_files(&path_args, message, false).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("Stashed {} selected paths", path_args.len())
            }

            "diff.open" => {
                let path = require_arg(args, 0, "file path")?;
                let left = args.get(1).map(String::as_str).unwrap_or("HEAD");
                let right = args.get(2).map(String::as_str).unwrap_or("WORKTREE");
                EditorOrchestrator::open_diff_for_file(left, right, path)
            }
            "compare.open" => {
                let left = require_arg(args, 0, "left ref")?;
                let right = require_arg(args, 1, "right ref")?;
                drop(guard);
                let result = EditorOrchestrator::open_branch_compare(&self.state, left, right)
                    .map_err(format_git_error)?;
                render_compare(&result)
            }
            "compare.recent" => {
                drop(guard);
                let pairs = self.state.recent_compare_pairs();
                if pairs.is_empty() {
                    "No recent compare pairs yet.".to_string()
                } else {
                    pairs
                        .iter()
                        .map(|p| format!("{} <> {}", p.left, p.right))
                        .collect::<Vec<_>>()
                        .join("\n")
                }
            }

            "merge.open_conflict" => {
                let path = require_arg(args, 0, "conflict file path")?;
                EditorOrchestrator::open_merge_conflict(path)
            }
            "merge.next" => "Fallback: use editor search for conflict markers '<<<<<<<' and jump next.".to_string(),
            "merge.previous" => {
                "Fallback: use editor search for conflict markers and jump previous.".to_string()
            }
            "merge.finalize" => {
                "Finalize merge by resolving all conflicts, staging files, then /intelligit operation.continue".to_string()
            }

            "conflict.accept_ours" => {
                let path = require_arg(args, 0, "conflict file path")?;
                git.resolve_conflict_ours(path).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_changes().map_err(format_git_error)?;
                format!("Accepted ours for {}", path)
            }
            "conflict.accept_theirs" => {
                let path = require_arg(args, 0, "conflict file path")?;
                git.resolve_conflict_theirs(path).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_changes().map_err(format_git_error)?;
                format!("Accepted theirs for {}", path)
            }
            "conflict.accept_both" => {
                let path = require_arg(args, 0, "conflict file path")?;
                EditorOrchestrator::open_merge_conflict(path)
            }

            "operation.abort" => {
                let op_state = self.state.operation_state();
                match op_state.kind {
                    crate::types::GitOperationKind::Merge => git.merge_abort().map_err(format_git_error)?,
                    crate::types::GitOperationKind::Rebase => git.rebase_abort().map_err(format_git_error)?,
                    crate::types::GitOperationKind::CherryPick => {
                        git.cherry_pick_abort().map_err(format_git_error)?
                    }
                    crate::types::GitOperationKind::Revert => git.revert_abort().map_err(format_git_error)?,
                    crate::types::GitOperationKind::None => {
                        return Ok("No operation in progress.".to_string())
                    }
                }
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                "Aborted current operation.".to_string()
            }
            "operation.continue" => {
                let op_state = self.state.operation_state();
                match op_state.kind {
                    crate::types::GitOperationKind::Merge => {
                        return Err("Merge continue uses `git commit` after resolving conflicts.".to_string())
                    }
                    crate::types::GitOperationKind::Rebase => git.rebase_continue().map_err(format_git_error)?,
                    crate::types::GitOperationKind::CherryPick => {
                        git.cherry_pick_continue().map_err(format_git_error)?
                    }
                    crate::types::GitOperationKind::Revert => git.revert_continue().map_err(format_git_error)?,
                    crate::types::GitOperationKind::None => {
                        return Ok("No operation in progress.".to_string())
                    }
                }
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                "Continued current operation.".to_string()
            }
            "operation.skip" => {
                let op_state = self.state.operation_state();
                match op_state.kind {
                    crate::types::GitOperationKind::Rebase => git.rebase_skip().map_err(format_git_error)?,
                    crate::types::GitOperationKind::CherryPick => {
                        git.cherry_pick_skip().map_err(format_git_error)?
                    }
                    _ => return Err("Skip is only supported for rebase/cherry-pick.".to_string()),
                }
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                "Skipped current operation step.".to_string()
            }

            "git.push_with_preview" => {
                let (outgoing, incoming) = git.get_outgoing_incoming_preview().map_err(format_git_error)?;
                let mut text = String::new();
                if outgoing.is_empty() {
                    text.push_str("Outgoing: none\n");
                } else {
                    text.push_str("Outgoing:\n");
                    text.push_str(&outgoing.join("\n"));
                    text.push('\n');
                }
                if incoming.is_empty() {
                    text.push_str("Incoming: none\n");
                } else {
                    text.push_str("Incoming:\n");
                    text.push_str(&incoming.join("\n"));
                    text.push('\n');
                }
                git.push().map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("{}\nPush completed.", text.trim_end())
            }
            "git.pull_with_preview" => {
                let (outgoing, incoming) = git.get_outgoing_incoming_preview().map_err(format_git_error)?;
                let mut text = String::new();
                if outgoing.is_empty() {
                    text.push_str("Outgoing: none\n");
                } else {
                    text.push_str("Outgoing:\n");
                    text.push_str(&outgoing.join("\n"));
                    text.push('\n');
                }
                if incoming.is_empty() {
                    text.push_str("Incoming: none\n");
                } else {
                    text.push_str("Incoming:\n");
                    text.push_str(&incoming.join("\n"));
                    text.push('\n');
                }
                git.pull().map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                format!("{}\nPull completed.", text.trim_end())
            }
            "git.fetch_prune" => {
                git.fetch_prune().map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                "Fetch --prune completed.".to_string()
            }

            "stage.patch" => {
                let file = require_arg(args, 0, "file path")?;
                git.stage_patch(file).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_changes().map_err(format_git_error)?;
                format!("Interactive patch staging started for {}", file)
            }
            "stage.file" => {
                let file = require_arg(args, 0, "file path")?;
                git.stage_file(file).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_changes().map_err(format_git_error)?;
                format!("Staged {}", file)
            }
            "unstage.file" => {
                let file = require_arg(args, 0, "file path")?;
                git.unstage_file(file).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_changes().map_err(format_git_error)?;
                format!("Unstaged {}", file)
            }
            "unstage.all" => {
                git.unstage_all().map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_changes().map_err(format_git_error)?;
                "Unstaged all files.".to_string()
            }
            "commit.amend" => {
                let message = args.first().map(String::as_str);
                git.amend_commit(message).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                "Amended latest commit.".to_string()
            }
            "commit.create" => {
                let message = require_arg(args, 0, "commit message")?;
                git.commit(message).map_err(format_git_error)?;
                drop(guard);
                self.state.refresh_all().map_err(format_git_error)?;
                "Created commit.".to_string()
            }
            "commit.template" => {
                let index = args
                    .first()
                    .and_then(|v| v.parse::<usize>().ok())
                    .unwrap_or(0);
                let template = self
                    .config
                    .commit_message_templates
                    .get(index)
                    .ok_or_else(|| format!("Template index {} is out of range", index))?;
                format!("{} => {}", template.label, template.template)
            }
            "commit.head_message" => git.get_head_commit_message().map_err(format_git_error)?,

            "file_history.open" => {
                let file = require_arg(args, 0, "file path")?;
                let commits = git.file_history(file).map_err(format_git_error)?;
                render_graph(&commits)
            }
            "file_blame.open" => {
                let file = require_arg(args, 0, "file path")?;
                git.file_blame(file).map_err(format_git_error)?
            }

            _ => {
                return Err(format!(
                    "Unknown IntelliGit action '{}'. Run '/intelligit help' for commands.",
                    action
                ))
            }
        };

        Ok(output)
    }

    fn help_text(&self) -> String {
        let commands = [
            "refresh",
            "quick_actions",
            "capabilities",
            "branch.list [filter]",
            "branch.checkout <branch>",
            "branch.create <name> [base]",
            "branch.rename <from> <to>",
            "branch.delete <branch> [force]",
            "branch.track <local> <remote>",
            "branch.untrack <local>",
            "branch.merge_into_current <branch>",
            "branch.rebase_onto <branch>",
            "branch.reset_current_to_commit <sha> [soft|mixed|hard]",
            "branch.compare_with_current <branch>",
            "stash.list [filter]",
            "stash.create <message> [include-untracked] [keep-index]",
            "stash.apply <stash@{n}>",
            "stash.pop <stash@{n}>",
            "stash.drop <stash@{n}>",
            "stash.rename <stash@{n}> <message>",
            "stash.preview_patch <stash@{n}>",
            "stash.unshelve <stash@{n}>",
            "graph.list",
            "graph.open_details <sha>",
            "graph.open_file_diff <leftRef> <rightRef> <path>",
            "graph.checkout_commit <sha>",
            "graph.create_branch_here <sha> <branch>",
            "graph.create_tag_here <sha> <tag>",
            "graph.cherry_pick <sha>",
            "graph.cherry_pick_range <fromExclusive> <toInclusive>",
            "graph.revert <sha>",
            "graph.rebase_interactive_from_here <sha>",
            "graph.compare_with_current <sha>",
            "graph.create_patch <sha>",
            "graph.show_repository_at_revision <sha>",
            "graph.open_repository_file_at_revision <ref> <path>",
            "graph.go_to_parent_commit <sha>",
            "graph.filter [branch] [author] [message] [since] [until]",
            "graph.clear_filter",
            "changes.list [filter]",
            "changes.open_file_diff <path>",
            "changes.stash_selected <message> <path...>",
            "diff.open <path> [leftRef] [rightRef]",
            "compare.open <leftRef> <rightRef>",
            "compare.recent",
            "merge.open_conflict <path>",
            "merge.next",
            "merge.previous",
            "merge.finalize",
            "conflict.accept_ours <path>",
            "conflict.accept_theirs <path>",
            "conflict.accept_both <path>",
            "operation.abort",
            "operation.continue",
            "operation.skip",
            "git.push_with_preview",
            "git.pull_with_preview",
            "git.fetch_prune",
            "stage.patch <path>",
            "stage.file <path>",
            "unstage.file <path>",
            "unstage.all",
            "commit.amend [message]",
            "commit.create <message>",
            "commit.template [index]",
            "commit.head_message",
            "file_history.open <path>",
            "file_blame.open <path>",
        ];

        format!(
            "IntelliGit slash command actions:\n{}\n\nExample:\n/intelligit branch.list\n/intelligit graph.open_details HEAD",
            commands.join("\n")
        )
    }

    fn quick_actions_text(&self) -> String {
        [
            "Quick actions:",
            "1) /intelligit refresh",
            "2) /intelligit branch.list",
            "3) /intelligit changes.list",
            "4) /intelligit stash.list",
            "5) /intelligit graph.list",
            "6) /intelligit git.push_with_preview",
        ]
        .join("\n")
    }
}

fn require_arg<'a>(args: &'a [String], index: usize, name: &str) -> Result<&'a str, String> {
    args.get(index)
        .map(String::as_str)
        .filter(|v| !v.trim().is_empty())
        .ok_or_else(|| format!("Missing required argument: {}", name))
}

fn has_flag(args: &[String], flag: &str) -> bool {
    args.iter().any(|arg| arg.eq_ignore_ascii_case(flag))
}

fn parse_reset_mode(input: &str) -> Result<ResetMode, String> {
    match input.to_ascii_lowercase().as_str() {
        "soft" => Ok(ResetMode::Soft),
        "mixed" => Ok(ResetMode::Mixed),
        "hard" => Ok(ResetMode::Hard),
        _ => Err(format!("Unsupported reset mode '{}'. Use soft|mixed|hard", input)),
    }
}

fn format_git_error(error: GitError) -> String {
    error.to_string()
}

fn render_capabilities(capabilities: &CapabilityMap) -> String {
    fn line(name: &str, capability: &Capability) -> String {
        match capability {
            Capability::Native(msg) => format!("- {}: native ({})", name, msg),
            Capability::CommandFallback(msg) => format!("- {}: command-fallback ({})", name, msg),
            Capability::Deferred(msg) => format!("- {}: deferred ({})", name, msg),
        }
    }

    [
        "Capability map:",
        &line("changes_panel", &capabilities.changes_panel),
        &line("stashes_panel", &capabilities.stashes_panel),
        &line("graph_panel", &capabilities.graph_panel),
        &line("branches_panel", &capabilities.branches_panel),
        &line("merge_editor_actions", &capabilities.merge_editor_actions),
        &line("compare_view", &capabilities.compare_view),
    ]
    .join("\n")
}

fn render_branch_tree(tree: &[crate::panels::branches::BranchTreeNode]) -> String {
    use crate::panels::branches::BranchTreeNode;

    if tree.is_empty() {
        return "No branches found.".to_string();
    }

    let mut lines = vec!["Branches:".to_string()];

    for node in tree {
        match node {
            BranchTreeNode::Section { kind, branches, count } => {
                lines.push(format!("- {} ({})", kind.label(), count));
                for branch in branches {
                    lines.push(format!("  - {}{}", branch.name, suffix_from_description(branch)));
                }
            }
            BranchTreeNode::RemoteGroup { remote_name, branches } => {
                lines.push(format!("- remote {} ({})", remote_name, branches.len()));
            }
            BranchTreeNode::PathGroup {
                segment,
                branches,
                ..
            } => {
                lines.push(format!("- {} ({})", segment, branches.len()));
            }
            BranchTreeNode::Branch(branch) => {
                lines.push(format!("- {}{}", branch.name, suffix_from_description(branch)));
            }
        }
    }

    lines.join("\n")
}

fn suffix_from_description(branch: &crate::types::BranchRef) -> String {
    let description = describe_branch(branch);
    if description.is_empty() {
        String::new()
    } else {
        format!(" [{}]", description)
    }
}

fn render_graph(commits: &[crate::types::GraphCommit]) -> String {
    if commits.is_empty() {
        return "No commits found.".to_string();
    }

    let mut lines = vec!["Graph commits:".to_string()];
    for commit in commits {
        lines.push(format!("- {} {}", commit.short_sha, commit.subject));
    }
    lines.join("\n")
}

fn render_compare(result: &crate::types::CompareResult) -> String {
    let mut lines = vec![format!(
        "Compare {} <> {}",
        result.left_ref, result.right_ref
    )];
    lines.push(format!(
        "left-only commits: {}",
        result.commits_only_left.len()
    ));
    lines.push(format!(
        "right-only commits: {}",
        result.commits_only_right.len()
    ));
    lines.push(format!("changed files: {}", result.changed_files.len()));
    if !result.changed_files.is_empty() {
        lines.push("Files:".to_string());
        lines.extend(
            result
                .changed_files
                .iter()
                .map(|f| format!("- {} {}", f.status, f.path)),
        );
    }
    lines.join("\n")
}

fn render_changes_panel(panel: &crate::panels::changes::ChangesPanelData) -> String {
    let mut lines = vec!["Changes:".to_string()];
    lines.push(format!("- staged: {}", panel.staged.len()));
    lines.push(format!("- unstaged: {}", panel.unstaged.len()));
    lines.push(format!("- conflicts: {}", panel.conflicts.len()));
    lines.push(format!("- untracked: {}", panel.untracked.len()));
    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::{parse_reset_mode, require_arg};

    #[test]
    fn reset_mode_parser_accepts_known_modes() {
        assert!(parse_reset_mode("soft").is_ok());
        assert!(parse_reset_mode("mixed").is_ok());
        assert!(parse_reset_mode("hard").is_ok());
        assert!(parse_reset_mode("invalid").is_err());
    }

    #[test]
    fn require_arg_validates_presence() {
        let args = vec!["foo".to_string()];
        let value = require_arg(&args, 0, "arg").expect("arg should exist");
        assert_eq!(value, "foo");
        assert!(require_arg(&args, 1, "missing").is_err());
    }
}
