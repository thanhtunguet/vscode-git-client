//! Git service module - Native git CLI wrapper usable inside Zed extensions.

use std::path::{Path, PathBuf};

use thiserror::Error;
use zed_extension_api as zed;

use crate::types::*;

const FIELD_SEPARATOR: &str = "|~|";
const RECORD_SEPARATOR: &str = "|#|";

#[derive(Error, Debug)]
pub enum GitError {
    #[error("Git command failed: {0}")]
    CommandFailed(String),
    #[error("Git not found: {0}")]
    GitNotFound(String),
    #[error("Parse error: {0}")]
    ParseError(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

pub type GitResult<T> = Result<T, GitError>;

#[derive(Debug, Clone)]
pub struct GitCommandResult {
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Clone)]
pub struct RepositoryContext {
    pub root_path: PathBuf,
}

#[derive(Debug, Clone)]
pub struct GitConfig {
    pub git_path: String,
    pub timeout_ms: u64,
}

impl Default for GitConfig {
    fn default() -> Self {
        Self {
            git_path: "git".to_string(),
            timeout_ms: 15000,
        }
    }
}

pub struct GitService {
    context: RepositoryContext,
    config: GitConfig,
    git_dir_cache: Option<PathBuf>,
}

impl GitService {
    pub fn new(context: RepositoryContext, config: GitConfig) -> Self {
        Self {
            context,
            config,
            git_dir_cache: None,
        }
    }

    pub fn root_path(&self) -> &Path {
        &self.context.root_path
    }

    pub fn is_repo(&mut self) -> bool {
        match self.run_git(&["rev-parse", "--is-inside-work-tree"]) {
            Ok(result) => result.stdout.trim() == "true",
            Err(_) => false,
        }
    }

    pub fn get_current_branch(&mut self) -> GitResult<String> {
        let result = self.run_git(&["rev-parse", "--abbrev-ref", "HEAD"])?;
        Ok(result.stdout.trim().to_string())
    }

    pub fn get_current_head_sha(&mut self) -> GitResult<String> {
        let result = self.run_git(&["rev-parse", "HEAD"])?;
        Ok(result.stdout.trim().to_string())
    }

    pub fn get_branches(&mut self) -> GitResult<Vec<BranchRef>> {
        let format = [
            "%(refname:short)",
            "%(refname)",
            "%(upstream:short)",
            "%(upstream:track)",
            "%(HEAD)",
            "%(committerdate:unix)",
        ]
        .join(FIELD_SEPARATOR);

        let format_arg = format!("--format={}{}", format, RECORD_SEPARATOR);

        let result = self.run_git(&[
            "for-each-ref",
            &format_arg,
            "refs/heads",
            "refs/remotes",
        ])?;

        let mut branches: Vec<BranchRef> = result
            .stdout
            .split(RECORD_SEPARATOR)
            .map(|line| line.trim())
            .filter(|s| !s.is_empty())
            .filter_map(|line| {
                let parts: Vec<&str> = line.split(FIELD_SEPARATOR).collect();
                if parts.len() < 6 {
                    return None;
                }

                let name = parts[0].to_string();
                let full_name = parts[1].to_string();
                let upstream = if parts[2].is_empty() {
                    None
                } else {
                    Some(parts[2].to_string())
                };
                let track = parts[3];
                let head = parts[4];
                let commit_epoch = parts[5].parse::<u64>().ok();

                let (ahead, behind) = parse_track(track);
                let branch_type = if full_name.starts_with("refs/remotes/") {
                    BranchType::Remote
                } else {
                    BranchType::Local
                };

                let short_name = if branch_type == BranchType::Remote {
                    let prefix = format!("{}/", name.split('/').next()?);
                    name.strip_prefix(&prefix)?.to_string()
                } else {
                    name.clone()
                };

                let remote_name = if branch_type == BranchType::Remote {
                    name.split('/').next().map(ToString::to_string)
                } else {
                    None
                };

                Some(BranchRef {
                    name,
                    short_name,
                    full_name,
                    branch_type,
                    remote_name,
                    upstream,
                    ahead,
                    behind,
                    current: head == "*",
                    last_commit_epoch: commit_epoch,
                })
            })
            .collect();

        branches.sort_by(|a, b| {
            if a.current {
                std::cmp::Ordering::Less
            } else if b.current {
                std::cmp::Ordering::Greater
            } else if a.branch_type != b.branch_type {
                if a.branch_type == BranchType::Local {
                    std::cmp::Ordering::Less
                } else {
                    std::cmp::Ordering::Greater
                }
            } else {
                a.name.cmp(&b.name)
            }
        });

        Ok(branches)
    }

    pub fn create_branch(&mut self, name: &str, base: Option<&str>) -> GitResult<()> {
        let mut args = vec!["branch", name];
        if let Some(b) = base {
            args.push(b);
        }
        self.run_git(&args)?;
        Ok(())
    }

    pub fn create_tag(&mut self, name: &str, ref_: &str) -> GitResult<()> {
        self.run_git(&["tag", name, ref_])?;
        Ok(())
    }

    pub fn rename_branch(&mut self, from: &str, to: &str) -> GitResult<()> {
        self.run_git(&["branch", "-m", from, to])?;
        Ok(())
    }

    pub fn delete_branch(&mut self, branch: &str, force: bool) -> GitResult<()> {
        let flag = if force { "-D" } else { "-d" };
        self.run_git(&["branch", flag, branch])?;
        Ok(())
    }

    pub fn checkout_branch(&mut self, branch: &str) -> GitResult<()> {
        self.run_git(&["checkout", branch])?;
        Ok(())
    }

    pub fn checkout_commit(&mut self, commit: &str) -> GitResult<()> {
        self.run_git(&["checkout", commit])?;
        Ok(())
    }

    pub fn track_branch(&mut self, local_branch: &str, upstream: &str) -> GitResult<()> {
        self.run_git(&["branch", "--set-upstream-to", upstream, local_branch])?;
        Ok(())
    }

    pub fn untrack_branch(&mut self, local_branch: &str) -> GitResult<()> {
        self.run_git(&["branch", "--unset-upstream", local_branch])?;
        Ok(())
    }

    pub fn has_upstream(&mut self, local_branch: &str) -> bool {
        let upstream_arg = format!("{}@{{upstream}}", local_branch);
        self.run_git(&[
            "rev-parse",
            "--abbrev-ref",
            "--symbolic-full-name",
            &upstream_arg,
        ])
        .is_ok()
    }

    pub fn merge_into_current(&mut self, branch: &str) -> GitResult<()> {
        self.run_git(&["merge", "--no-ff", branch])?;
        Ok(())
    }

    pub fn rebase_current_onto(&mut self, branch: &str) -> GitResult<()> {
        self.run_git(&["rebase", branch])?;
        Ok(())
    }

    pub fn rebase_interactive(&mut self, base: &str) -> GitResult<()> {
        self.run_git(&["rebase", "-i", base])?;
        Ok(())
    }

    pub fn merge_abort(&mut self) -> GitResult<()> {
        self.run_git(&["merge", "--abort"])?;
        Ok(())
    }

    pub fn rebase_abort(&mut self) -> GitResult<()> {
        self.run_git(&["rebase", "--abort"])?;
        Ok(())
    }

    pub fn rebase_continue(&mut self) -> GitResult<()> {
        self.run_git(&["-c", "core.editor=true", "rebase", "--continue"])?;
        Ok(())
    }

    pub fn rebase_skip(&mut self) -> GitResult<()> {
        self.run_git(&["rebase", "--skip"])?;
        Ok(())
    }

    pub fn cherry_pick_abort(&mut self) -> GitResult<()> {
        self.run_git(&["cherry-pick", "--abort"])?;
        Ok(())
    }

    pub fn cherry_pick_continue(&mut self) -> GitResult<()> {
        self.run_git(&["-c", "core.editor=true", "cherry-pick", "--continue"])?;
        Ok(())
    }

    pub fn cherry_pick_skip(&mut self) -> GitResult<()> {
        self.run_git(&["cherry-pick", "--skip"])?;
        Ok(())
    }

    pub fn revert_abort(&mut self) -> GitResult<()> {
        self.run_git(&["revert", "--abort"])?;
        Ok(())
    }

    pub fn revert_continue(&mut self) -> GitResult<()> {
        self.run_git(&["-c", "core.editor=true", "revert", "--continue"])?;
        Ok(())
    }

    pub fn resolve_conflict_ours(&mut self, path: &str) -> GitResult<()> {
        self.run_git(&["checkout", "--ours", "--", path])?;
        self.run_git(&["add", "--", path])?;
        Ok(())
    }

    pub fn resolve_conflict_theirs(&mut self, path: &str) -> GitResult<()> {
        self.run_git(&["checkout", "--theirs", "--", path])?;
        self.run_git(&["add", "--", path])?;
        Ok(())
    }

    pub fn get_operation_state(&mut self) -> GitResult<GitOperationState> {
        let git_dir = self.get_git_dir()?;

        if git_dir.is_none() {
            return Ok(GitOperationState {
                kind: GitOperationKind::None,
                head_short: None,
                onto_short: None,
                message: None,
                step_current: None,
                step_total: None,
            });
        }

        let git_dir = git_dir.expect("git_dir is_some checked");

        let read_file = |relative: &str| -> Option<String> {
            let path = git_dir.join(relative);
            std::fs::read_to_string(path).ok().map(|s| s.trim().to_string())
        };

        let exists = |relative: &str| -> bool { git_dir.join(relative).exists() };

        let shorten_ref = |value: Option<&str>| -> Option<String> {
            value.map(|v| v[..8.min(v.len())].to_string())
        };

        if exists("rebase-merge") {
            let head = read_file("rebase-merge/head-name");
            let onto = read_file("rebase-merge/onto");
            let msgnum = read_file("rebase-merge/msgnum").and_then(|s| s.parse::<u32>().ok());
            let end = read_file("rebase-merge/end").and_then(|s| s.parse::<u32>().ok());

            return Ok(GitOperationState {
                kind: GitOperationKind::Rebase,
                head_short: head.and_then(|h| h.strip_prefix("refs/heads/").map(ToString::to_string)),
                onto_short: shorten_ref(onto.as_deref()),
                message: None,
                step_current: msgnum,
                step_total: end,
            });
        }

        if exists("rebase-apply") {
            let head = read_file("rebase-apply/head-name");
            let onto = read_file("rebase-apply/onto");
            let next = read_file("rebase-apply/next").and_then(|s| s.parse::<u32>().ok());
            let last = read_file("rebase-apply/last").and_then(|s| s.parse::<u32>().ok());

            return Ok(GitOperationState {
                kind: GitOperationKind::Rebase,
                head_short: head.and_then(|h| h.strip_prefix("refs/heads/").map(ToString::to_string)),
                onto_short: shorten_ref(onto.as_deref()),
                message: None,
                step_current: next,
                step_total: last,
            });
        }

        if exists("MERGE_HEAD") {
            let merge_head = read_file("MERGE_HEAD");
            let merge_msg = read_file("MERGE_MSG");

            return Ok(GitOperationState {
                kind: GitOperationKind::Merge,
                head_short: shorten_ref(merge_head.as_deref().and_then(|s| s.lines().next())),
                onto_short: None,
                message: merge_msg.and_then(|m| m.lines().next().map(ToString::to_string)),
                step_current: None,
                step_total: None,
            });
        }

        if exists("CHERRY_PICK_HEAD") {
            let head = read_file("CHERRY_PICK_HEAD");
            return Ok(GitOperationState {
                kind: GitOperationKind::CherryPick,
                head_short: shorten_ref(head.as_deref()),
                onto_short: None,
                message: None,
                step_current: None,
                step_total: None,
            });
        }

        if exists("REVERT_HEAD") {
            let head = read_file("REVERT_HEAD");
            return Ok(GitOperationState {
                kind: GitOperationKind::Revert,
                head_short: shorten_ref(head.as_deref()),
                onto_short: None,
                message: None,
                step_current: None,
                step_total: None,
            });
        }

        Ok(GitOperationState {
            kind: GitOperationKind::None,
            head_short: None,
            onto_short: None,
            message: None,
            step_current: None,
            step_total: None,
        })
    }

    pub fn cherry_pick(&mut self, ref_: &str) -> GitResult<()> {
        self.run_git(&["cherry-pick", ref_])?;
        Ok(())
    }

    pub fn cherry_pick_range(&mut self, from_exclusive: &str, to_inclusive: &str) -> GitResult<()> {
        self.run_git(&["cherry-pick", &format!("{}..{}", from_exclusive, to_inclusive)])?;
        Ok(())
    }

    pub fn revert_commit(&mut self, ref_: &str) -> GitResult<()> {
        self.run_git(&["revert", ref_])?;
        Ok(())
    }

    pub fn reset_current(&mut self, ref_: &str, mode: ResetMode) -> GitResult<()> {
        let mode_str = match mode {
            ResetMode::Soft => "--soft",
            ResetMode::Mixed => "--mixed",
            ResetMode::Hard => "--hard",
        };
        self.run_git(&["reset", mode_str, ref_])?;
        Ok(())
    }

    pub fn is_commit_in_current_branch(&mut self, sha: &str) -> bool {
        self.run_git(&["merge-base", "--is-ancestor", sha, "HEAD"])
            .is_ok()
    }

    pub fn get_stashes(&mut self) -> GitResult<Vec<StashEntry>> {
        let result = self.run_git(&[
            "reflog",
            "show",
            "refs/stash",
            "--date=iso-strict",
            &format!(
                "--format=%gd{}%H{}%gs{}%an{}%aI{}",
                FIELD_SEPARATOR, FIELD_SEPARATOR, FIELD_SEPARATOR, FIELD_SEPARATOR, RECORD_SEPARATOR
            ),
        ])?;

        let mut entries: Vec<StashEntry> = result
            .stdout
            .split(RECORD_SEPARATOR)
            .map(|line| line.trim())
            .filter(|s| !s.is_empty())
            .filter_map(|line| {
                let parts: Vec<&str> = line.split(FIELD_SEPARATOR).collect();
                if parts.len() < 5 {
                    return None;
                }

                let ref_raw = parts[0];
                let sha = parts[1].to_string();
                let subject = parts[2].to_string();
                let author = if parts[3].is_empty() {
                    None
                } else {
                    Some(parts[3].to_string())
                };
                let timestamp = if parts[4].is_empty() {
                    None
                } else {
                    Some(parts[4].to_string())
                };

                let index = ref_raw
                    .strip_prefix("stash@{")
                    .and_then(|s| s.strip_suffix('}'))
                    .and_then(|s| s.parse::<u32>().ok())
                    .unwrap_or(0);
                let r#ref = format!("stash@{{{}}}", index);
                let message = subject
                    .strip_prefix("On ")
                    .and_then(|s| s.split_once(':'))
                    .map(|(_, s)| s.trim())
                    .or_else(|| subject.strip_prefix("WIP on ").and_then(|s| s.split_once(':')).map(|(_, s)| s.trim()))
                    .unwrap_or(&subject)
                    .to_string();

                Some(StashEntry {
                    index,
                    r#ref,
                    message,
                    author,
                    timestamp,
                    file_count: 0,
                    sha: Some(sha),
                })
            })
            .collect();

        for entry in &mut entries {
            entry.file_count = self.get_stash_file_count(&entry.r#ref);
        }

        entries.sort_by_key(|e| e.index);
        Ok(entries)
    }

    pub fn create_stash(&mut self, message: &str, options: StashOptions) -> GitResult<()> {
        let mut args = vec!["stash", "push", "-m", message];
        if options.include_untracked {
            args.push("-u");
        }
        if options.keep_index {
            args.push("--keep-index");
        }
        self.run_git(&args)?;
        Ok(())
    }

    pub fn apply_stash(&mut self, ref_: &str, pop: bool) -> GitResult<()> {
        let cmd = if pop { "pop" } else { "apply" };
        self.run_git(&["stash", cmd, ref_])?;
        Ok(())
    }

    pub fn drop_stash(&mut self, ref_: &str) -> GitResult<()> {
        self.run_git(&["stash", "drop", ref_])?;
        Ok(())
    }

    pub fn rename_stash(&mut self, ref_: &str, message: &str) -> GitResult<()> {
        let result = self.run_git(&["rev-parse", ref_])?;
        let stash_hash = result.stdout.trim().to_string();
        self.run_git(&["stash", "drop", ref_])?;
        self.run_git(&["stash", "store", "-m", message, &stash_hash])?;
        Ok(())
    }

    pub fn get_stash_patch(&mut self, ref_: &str) -> GitResult<String> {
        let result = self.run_git(&["stash", "show", "-p", ref_])?;
        Ok(result.stdout)
    }

    pub fn get_graph(&mut self, max_count: u32, filters: Option<&GraphFilters>) -> GitResult<Vec<GraphCommit>> {
        let format = ["%m", "%H", "%h", "%P", "%D", "%an", "%aI", "%s"].join(FIELD_SEPARATOR);
        let max_count_arg = format!("--max-count={}", max_count);
        let format_arg = format!("--format={}{}", format, RECORD_SEPARATOR);

        let mut args = vec![
            "log".to_string(),
            "--date=iso-strict".to_string(),
            "--decorate=full".to_string(),
            max_count_arg,
            format_arg,
        ];

        if let Some(f) = filters {
            if let Some(ref branch) = f.branch {
                args.push(branch.clone());
            }
            if let Some(ref author) = f.author {
                args.push(format!("--author={}", author));
            }
            if let Some(ref message) = f.message {
                args.push(format!("--grep={}", message));
            }
            if let Some(ref since) = f.since {
                args.push(format!("--since={}", since));
            }
            if let Some(ref until) = f.until {
                args.push(format!("--until={}", until));
            }
        }

        let arg_refs: Vec<&str> = args.iter().map(String::as_str).collect();
        let result = self.run_git(&arg_refs)?;

        let commits = result
            .stdout
            .split(RECORD_SEPARATOR)
            .map(|line| line.trim())
            .filter(|s| !s.is_empty())
            .filter_map(|line| {
                let parts: Vec<&str> = line.split(FIELD_SEPARATOR).collect();
                if parts.len() < 8 {
                    return None;
                }

                let graph = if parts[0].is_empty() {
                    None
                } else {
                    Some(parts[0].to_string())
                };
                let sha = parts[1].to_string();
                let short_sha = parts[2].to_string();
                let parents = parts[3]
                    .split_whitespace()
                    .filter(|s| !s.is_empty())
                    .map(ToString::to_string)
                    .collect();
                let refs = parts[4]
                    .split(',')
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty())
                    .map(ToString::to_string)
                    .collect();
                let author = parts[5].to_string();
                let date = parts[6].to_string();
                let subject = parts[7].to_string();

                Some(GraphCommit {
                    graph,
                    sha,
                    short_sha,
                    parents,
                    refs,
                    author,
                    date,
                    subject,
                    stats: None,
                })
            })
            .collect();

        Ok(commits)
    }

    pub fn get_commit_details(&mut self, sha: &str) -> GitResult<CommitDetails> {
        let mut commits = self.get_graph(
            1,
            Some(&GraphFilters {
                branch: Some(sha.to_string()),
                ..Default::default()
            }),
        )?;
        let commit = commits
            .pop()
            .ok_or_else(|| GitError::ParseError(format!("Commit {} not found", sha)))?;

        let body_result = self.run_git(&["show", "--quiet", "--format=%B", sha])?;
        let name_status = self.run_git(&["show", "--name-status", "--format=", sha])?;
        let short_stat = self.run_git(&["show", "--shortstat", "--format=", sha])?;

        let changed_files = name_status
            .stdout
            .lines()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .filter_map(|line| {
                let parts: Vec<&str> = line.split('\t').collect();
                if parts.len() >= 2 {
                    Some(CommitFileChange {
                        status: parts[0].to_string(),
                        path: parts[1].to_string(),
                    })
                } else {
                    None
                }
            })
            .collect();

        let stats = parse_short_stat(&short_stat.stdout);

        Ok(CommitDetails {
            commit: GraphCommit { stats, ..commit },
            body: body_result.stdout.trim().to_string(),
            changed_files,
        })
    }

    pub fn get_parent_commit(&mut self, sha: &str) -> GitResult<Option<String>> {
        let result = self.run_git(&["rev-list", "--parents", "-n", "1", sha])?;
        let tokens: Vec<&str> = result.stdout.split_whitespace().collect();

        if tokens.len() < 2 {
            return Ok(None);
        }

        Ok(Some(tokens[1].to_string()))
    }

    pub fn get_files_at_revision(&mut self, ref_: &str) -> GitResult<Vec<String>> {
        let result = self.run_git(&["ls-tree", "-r", "--name-only", ref_])?;
        Ok(result
            .stdout
            .lines()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string)
            .collect())
    }

    pub fn get_patch_for_commit(&mut self, sha: &str) -> GitResult<String> {
        let result = self.run_git(&["format-patch", "--stdout", "-1", sha])?;
        Ok(result.stdout)
    }

    pub fn get_compare(&mut self, left_ref: &str, right_ref: &str) -> GitResult<CompareResult> {
        let format = ["%m", "%H", "%h", "%P", "%D", "%an", "%aI", "%s"].join(FIELD_SEPARATOR);

        let left_only = self.run_git(&[
            "log",
            "--date=iso-strict",
            &format!("--format={}{}", format, RECORD_SEPARATOR),
            &format!("{}..{}", right_ref, left_ref),
        ])?;

        let right_only = self.run_git(&[
            "log",
            "--date=iso-strict",
            &format!("--format={}{}", format, RECORD_SEPARATOR),
            &format!("{}..{}", left_ref, right_ref),
        ])?;

        let diff_names = self.run_git(&["diff", "--name-status", &format!("{}...{}", left_ref, right_ref)])?;

        let commits_only_left = parse_graph_rows(&left_only.stdout);
        let commits_only_right = parse_graph_rows(&right_only.stdout);

        let changed_files = diff_names
            .stdout
            .lines()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .filter_map(|line| {
                let parts: Vec<&str> = line.split('\t').collect();
                if parts.len() >= 2 {
                    Some(ChangedFile {
                        status: parts[0].to_string(),
                        path: parts[1].to_string(),
                    })
                } else {
                    None
                }
            })
            .collect();

        Ok(CompareResult {
            left_ref: left_ref.to_string(),
            right_ref: right_ref.to_string(),
            commits_only_left,
            commits_only_right,
            changed_files,
        })
    }

    pub fn get_changed_files(&mut self) -> GitResult<Vec<WorkingTreeChange>> {
        let result = self.run_git(&["status", "--porcelain"])?;
        Ok(result
            .stdout
            .lines()
            .map(|line| line.replace('\r', ""))
            .filter(|s| !s.is_empty())
            .map(|line| {
                let status = line[..2].to_string();
                let path = line[3..].to_string();
                WorkingTreeChange { status, path }
            })
            .collect())
    }

    pub fn stash_files(&mut self, paths: &[&str], message: &str, keep_index: bool) -> GitResult<()> {
        if paths.is_empty() {
            return Ok(());
        }

        let mut args = vec!["stash", "push", "-m", message];
        if keep_index {
            args.push("--keep-index");
        }
        args.push("--");
        for path in paths {
            args.push(path);
        }

        self.run_git(&args)?;
        Ok(())
    }

    pub fn get_staged_files(&mut self) -> GitResult<Vec<String>> {
        let result = self.run_git(&["diff", "--cached", "--name-only"])?;
        Ok(result
            .stdout
            .lines()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string)
            .collect())
    }

    pub fn get_merge_conflicts(&mut self) -> GitResult<Vec<MergeConflictFile>> {
        let result = self.run_git(&["diff", "--name-status", "--diff-filter=U"])?;
        Ok(result
            .stdout
            .lines()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .filter_map(|line| {
                let parts: Vec<&str> = line.split('\t').collect();
                if parts.len() >= 2 {
                    Some(MergeConflictFile {
                        status: parts[0].to_string(),
                        path: parts[1].to_string(),
                    })
                } else {
                    None
                }
            })
            .collect())
    }

    pub fn stage_file(&mut self, path: &str) -> GitResult<()> {
        self.run_git(&["add", "--", path])?;
        Ok(())
    }

    pub fn unstage_file(&mut self, path: &str) -> GitResult<()> {
        self.run_git(&["restore", "--staged", "--", path])?;
        Ok(())
    }

    pub fn get_outgoing_incoming_preview(&mut self) -> GitResult<(Vec<String>, Vec<String>)> {
        let branch = self.get_current_branch()?;

        let upstream = match self.run_git(&[
            "rev-parse",
            "--abbrev-ref",
            "--symbolic-full-name",
            &format!("{}@{{upstream}}", branch),
        ]) {
            Ok(result) => result.stdout.trim().to_string(),
            Err(_) => return Ok((vec![], vec![])),
        };

        let outgoing = self.run_git(&["log", "--oneline", &format!("{}..{}", upstream, branch)])?;
        let incoming = self.run_git(&["log", "--oneline", &format!("{}..{}", branch, upstream)])?;

        Ok((
            outgoing
                .stdout
                .lines()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(ToString::to_string)
                .collect(),
            incoming
                .stdout
                .lines()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(ToString::to_string)
                .collect(),
        ))
    }

    pub fn push(&mut self) -> GitResult<()> {
        self.run_git(&["push"])?;
        Ok(())
    }

    pub fn pull(&mut self) -> GitResult<()> {
        self.run_git(&["pull"])?;
        Ok(())
    }

    pub fn fetch_prune(&mut self) -> GitResult<()> {
        self.run_git(&["fetch", "--prune"])?;
        Ok(())
    }

    pub fn add_all(&mut self) -> GitResult<()> {
        self.run_git(&["add", "-A"])?;
        Ok(())
    }

    pub fn stage_patch(&mut self, file_path: &str) -> GitResult<()> {
        self.run_git(&["add", "-p", "--", file_path])?;
        Ok(())
    }

    pub fn amend_commit(&mut self, message: Option<&str>) -> GitResult<()> {
        let mut args = vec!["commit", "--amend"];
        if let Some(msg) = message {
            args.extend_from_slice(&["-m", msg]);
        } else {
            args.push("--no-edit");
        }
        self.run_git(&args)?;
        Ok(())
    }

    pub fn commit(&mut self, message: &str) -> GitResult<()> {
        self.run_git(&["commit", "-m", message])?;
        Ok(())
    }

    pub fn commit_only(&mut self, message: &str, paths: &[&str]) -> GitResult<()> {
        if paths.is_empty() {
            return Err(GitError::CommandFailed(
                "No paths provided for commit".to_string(),
            ));
        }

        let mut args = vec!["commit", "--only", "-m", message, "--"];
        for path in paths {
            args.push(path);
        }

        self.run_git(&args)?;
        Ok(())
    }

    pub fn get_head_commit_message(&mut self) -> GitResult<String> {
        let result = self.run_git(&["log", "-1", "--pretty=%B"])?;
        Ok(result.stdout.trim().to_string())
    }

    pub fn unstage_all(&mut self) -> GitResult<()> {
        self.run_git(&["restore", "--staged", "."])?;
        Ok(())
    }

    pub fn discard_file(&mut self, file_path: &str, is_untracked: bool) -> GitResult<()> {
        if is_untracked {
            self.run_git(&["clean", "-f", "--", file_path])?;
        } else {
            self.run_git(&["restore", "--", file_path])?;
        }
        Ok(())
    }

    pub fn file_history(&mut self, path: &str) -> GitResult<Vec<GraphCommit>> {
        let format = ["%m", "%H", "%h", "%P", "%D", "%an", "%aI", "%s"].join(FIELD_SEPARATOR);

        let result = self.run_git(&[
            "log",
            "--date=iso-strict",
            "--follow",
            &format!("--format={}{}", format, RECORD_SEPARATOR),
            "--",
            path,
        ])?;

        Ok(parse_graph_rows(&result.stdout))
    }

    pub fn file_blame(&mut self, path: &str) -> GitResult<String> {
        let result = self.run_git(&["blame", "--", path])?;
        Ok(result.stdout)
    }

    pub fn get_file_content_from_ref(&mut self, ref_spec: &str, relative_path: &str) -> GitResult<String> {
        if ref_spec == "WORKTREE" {
            let absolute_path = self.context.root_path.join(relative_path);
            return Ok(std::fs::read_to_string(absolute_path)?);
        }

        if ref_spec == "INDEX" {
            let result = self.run_git(&["show", &format!(":{}", relative_path)])?;
            return Ok(result.stdout);
        }

        let result = self.run_git(&["show", &format!("{}:{}", ref_spec, relative_path)])?;
        Ok(result.stdout)
    }

    pub fn get_files_in_commit(&mut self, sha: &str) -> GitResult<Vec<String>> {
        let entries = self.get_files_in_commit_with_status(sha)?;
        Ok(entries.into_iter().map(|e| e.path).collect())
    }

    pub fn get_files_in_commit_with_status(&mut self, sha: &str) -> GitResult<Vec<CommitFileChange>> {
        let result = self.run_git(&["show", "--name-status", "--pretty=format:", sha])?;
        Ok(result
            .stdout
            .lines()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .filter_map(|line| {
                let parts: Vec<&str> = line.split('\t').filter(|s| !s.is_empty()).collect();
                if parts.len() >= 2 {
                    Some(CommitFileChange {
                        status: parts[0].to_string(),
                        path: parts.last()?.to_string(),
                    })
                } else {
                    None
                }
            })
            .collect())
    }

    pub fn get_files_changed_between(&mut self, left_ref: &str, right_ref: &str) -> GitResult<Vec<String>> {
        let result = self.run_git(&["diff", "--name-only", &format!("{}...{}", left_ref, right_ref)])?;
        Ok(result
            .stdout
            .lines()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string)
            .collect())
    }

    fn run_git(&self, args: &[&str]) -> GitResult<GitCommandResult> {
        let mut command = zed::process::Command::new(&self.config.git_path)
            .arg("-C")
            .arg(self.context.root_path.to_string_lossy().to_string())
            .args(args.iter().map(|arg| (*arg).to_string()))
            .env("INTELLIGIT_TIMEOUT_MS", self.config.timeout_ms.to_string());

        let output = command
            .output()
            .map_err(|e| GitError::GitNotFound(e.to_string()))?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        let success = output.status.unwrap_or(-1) == 0;
        if success {
            Ok(GitCommandResult { stdout, stderr })
        } else {
            let command_str = format!("{} {}", self.config.git_path, args.join(" "));
            if stderr.trim().is_empty() {
                Err(GitError::CommandFailed(format!("{} failed", command_str)))
            } else {
                Err(GitError::CommandFailed(format!("{}: {}", command_str, stderr.trim())))
            }
        }
    }

    fn get_git_dir(&mut self) -> GitResult<Option<PathBuf>> {
        if let Some(cached) = &self.git_dir_cache {
            return Ok(Some(cached.clone()));
        }

        match self.run_git(&["rev-parse", "--git-dir"]) {
            Ok(result) => {
                let raw = result.stdout.trim();
                if raw.is_empty() {
                    return Ok(None);
                }

                let resolved = if raw.starts_with('/') {
                    PathBuf::from(raw)
                } else {
                    self.context.root_path.join(raw)
                };

                self.git_dir_cache = Some(resolved.clone());
                Ok(Some(resolved))
            }
            Err(_) => Ok(None),
        }
    }

    fn get_stash_file_count(&mut self, ref_: &str) -> u32 {
        match self.run_git(&["stash", "show", "--name-only", ref_]) {
            Ok(result) => {
                result
                    .stdout
                    .lines()
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .count() as u32
            }
            Err(_) => 0,
        }
    }
}

fn parse_track(value: &str) -> (u32, u32) {
    if value.is_empty() {
        return (0, 0);
    }

    let cleaned = value
        .trim_matches(|c| c == '[' || c == ']')
        .replace(',', " ");

    let tokens: Vec<&str> = cleaned.split_whitespace().collect();
    let mut ahead = 0u32;
    let mut behind = 0u32;

    for i in 0..tokens.len() {
        if tokens[i] == "ahead" && i + 1 < tokens.len() {
            ahead = tokens[i + 1].parse::<u32>().unwrap_or(0);
        }
        if tokens[i] == "behind" && i + 1 < tokens.len() {
            behind = tokens[i + 1].parse::<u32>().unwrap_or(0);
        }
    }

    (ahead, behind)
}

fn parse_graph_rows(raw: &str) -> Vec<GraphCommit> {
    raw.split(RECORD_SEPARATOR)
        .map(|line| line.trim())
        .filter(|s| !s.is_empty())
        .filter_map(|line| {
            let parts: Vec<&str> = line.split(FIELD_SEPARATOR).collect();
            if parts.len() < 8 {
                return None;
            }

            let graph = if parts[0].is_empty() {
                None
            } else {
                Some(parts[0].to_string())
            };
            let sha = parts[1].to_string();
            let short_sha = parts[2].to_string();
            let parents = parts[3]
                .split_whitespace()
                .filter(|s| !s.is_empty())
                .map(ToString::to_string)
                .collect();
            let refs = parts[4]
                .split(',')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .map(ToString::to_string)
                .collect();
            let author = parts[5].to_string();
            let date = parts[6].to_string();
            let subject = parts[7].to_string();

            Some(GraphCommit {
                graph,
                sha,
                short_sha,
                parents,
                refs,
                author,
                date,
                subject,
                stats: None,
            })
        })
        .collect()
}

fn parse_short_stat(raw: &str) -> Option<CommitStats> {
    let line = raw.lines().map(|s| s.trim()).find(|s| !s.is_empty())?;

    let files = line
        .find("file")
        .and_then(|i| line[..i].trim_end().split_whitespace().last())
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(0);

    let insertions = line
        .find("insertion")
        .and_then(|i| line[..i].trim_end().split_whitespace().last())
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(0);

    let deletions = line
        .find("deletion")
        .and_then(|i| line[..i].trim_end().split_whitespace().last())
        .and_then(|s| s.parse::<u32>().ok())
        .unwrap_or(0);

    Some(CommitStats {
        files,
        insertions,
        deletions,
    })
}

#[cfg(test)]
mod tests {
    use super::{parse_short_stat, parse_track};

    #[test]
    fn parse_track_handles_ahead_and_behind() {
        let (ahead, behind) = parse_track("[ahead 3, behind 2]");
        assert_eq!(ahead, 3);
        assert_eq!(behind, 2);
    }

    #[test]
    fn parse_track_handles_empty() {
        let (ahead, behind) = parse_track("");
        assert_eq!(ahead, 0);
        assert_eq!(behind, 0);
    }

    #[test]
    fn parse_short_stat_extracts_counts() {
        let stats = parse_short_stat(" 3 files changed, 14 insertions(+), 2 deletions(-)")
            .expect("expected parsed stats");
        assert_eq!(stats.files, 3);
        assert_eq!(stats.insertions, 14);
        assert_eq!(stats.deletions, 2);
    }
}
