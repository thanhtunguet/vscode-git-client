//! Shared type definitions for IntelliGit Zed extension
//!
//! This module contains the core data structures used throughout the extension,
//! mirroring the TypeScript types from the VSCode version.

use serde::{Deserialize, Serialize};

/// Type of branch reference
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum BranchType {
    Local,
    Remote,
}

/// Branch reference information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BranchRef {
    pub name: String,
    pub short_name: String,
    pub full_name: String,
    #[serde(rename = "type")]
    pub branch_type: BranchType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub current: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_commit_epoch: Option<u64>,
}

/// Stash entry information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StashEntry {
    pub index: u32,
    pub r#ref: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<String>,
    pub file_count: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha: Option<String>,
}

/// Graph commit information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphCommit {
    pub sha: String,
    pub short_sha: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub graph: Option<String>,
    pub parents: Vec<String>,
    pub refs: Vec<String>,
    pub author: String,
    pub date: String,
    pub subject: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stats: Option<CommitStats>,
}

/// Commit statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitStats {
    pub files: u32,
    pub insertions: u32,
    pub deletions: u32,
}

/// Compare result between two branches
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompareResult {
    pub left_ref: String,
    pub right_ref: String,
    pub commits_only_left: Vec<GraphCommit>,
    pub commits_only_right: Vec<GraphCommit>,
    pub changed_files: Vec<ChangedFile>,
}

/// Changed file in a comparison
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangedFile {
    pub path: String,
    pub status: String,
}

/// Commit details with body and changed files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitDetails {
    pub commit: GraphCommit,
    pub body: String,
    pub changed_files: Vec<CommitFileChange>,
}

/// File change in a commit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitFileChange {
    pub status: String,
    pub path: String,
}

/// Working tree change
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkingTreeChange {
    pub status: String,
    pub path: String,
}

/// Merge conflict file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergeConflictFile {
    pub path: String,
    pub status: String,
}

/// Git operation kind
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
pub enum GitOperationKind {
    Merge,
    Rebase,
    CherryPick,
    Revert,
    None,
}

/// Git operation state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitOperationState {
    pub kind: GitOperationKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub head_short: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub onto_short: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_current: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub step_total: Option<u32>,
}

/// Compare pair for recent comparisons
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComparePair {
    pub left: String,
    pub right: String,
}

/// Reset mode for git reset
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ResetMode {
    Soft,
    Mixed,
    Hard,
}

/// Stash options
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct StashOptions {
    #[serde(default)]
    pub include_untracked: bool,
    #[serde(default)]
    pub keep_index: bool,
}

/// Graph filters
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GraphFilters {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub since: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub until: Option<String>,
}
