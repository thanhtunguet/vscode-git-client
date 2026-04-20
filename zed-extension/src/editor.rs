//! Editor and compare workflow orchestration.

use crate::git_service::{GitResult, GitService};
use crate::state::StateStore;
use crate::types::CompareResult;

pub struct EditorOrchestrator;

impl EditorOrchestrator {
    pub fn open_merge_conflict(file_path: &str) -> String {
        format!(
            "Fallback: open merge conflict file '{}' in editor and use /intelligit conflict.accept_ours|accept_theirs|accept_both",
            file_path
        )
    }

    pub fn open_diff_for_file(left_ref: &str, right_ref: &str, path: &str) -> String {
        format!(
            "Diff request: {} vs {} for {}. Use /intelligit graph.open_file_diff {} {} {}",
            left_ref, right_ref, path, left_ref, right_ref, path
        )
    }

    pub fn open_branch_compare(
        state: &StateStore,
        left_ref: &str,
        right_ref: &str,
    ) -> GitResult<CompareResult> {
        state.compare_branches(left_ref, right_ref)
    }

    pub fn show_repository_at_revision(git: &mut GitService, sha: &str) -> GitResult<Vec<String>> {
        git.get_files_at_revision(sha)
    }

    pub fn open_file_at_revision(git: &mut GitService, ref_name: &str, path: &str) -> GitResult<String> {
        git.get_file_content_from_ref(ref_name, path)
    }

    pub fn go_to_parent_commit(git: &mut GitService, sha: &str) -> GitResult<Option<String>> {
        git.get_parent_commit(sha)
    }
}
