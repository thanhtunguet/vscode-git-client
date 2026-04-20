//! State management module for IntelliGit Zed extension.

use std::sync::{Arc, RwLock};

use crate::git_service::{GitResult, GitService};
use crate::types::*;

#[derive(Debug, Clone, Default)]
pub struct PanelFilters {
    pub branch_filter: Option<String>,
    pub stash_filter: Option<String>,
    pub change_filter: Option<String>,
    pub graph_filter: GraphFilters,
}

#[derive(Debug, Clone, Default)]
pub struct OperationContextFlags {
    pub can_continue: bool,
    pub can_skip: bool,
    pub can_abort: bool,
    pub has_conflicts: bool,
}

#[derive(Debug, Clone, Default)]
pub struct CompareSessionState {
    pub left_ref: Option<String>,
    pub right_ref: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct CommitDetailSelectionState {
    pub selected_commit_sha: Option<String>,
    pub selected_file_path: Option<String>,
}

pub struct StateStore {
    inner: Arc<RwLock<StateStoreInner>>,
}

pub struct StateStoreInner {
    pub git_service: GitService,
    pub branches: Vec<BranchRef>,
    pub stashes: Vec<StashEntry>,
    pub changes: Vec<WorkingTreeChange>,
    pub graph: Vec<GraphCommit>,
    pub compare_result: Option<CompareResult>,
    pub operation_state: GitOperationState,
    pub conflicts: Vec<MergeConflictFile>,
    pub recent_compare_pairs: Vec<ComparePair>,
    pub max_recent_compare_pairs: usize,
    pub max_graph_commits: u32,
    pub panel_filters: PanelFilters,
    pub compare_session: CompareSessionState,
    pub commit_detail_selection: CommitDetailSelectionState,
    pub operation_flags: OperationContextFlags,
}

impl StateStore {
    pub fn new(git_service: GitService, max_graph_commits: u32, recent_compare_pairs_count: usize) -> Self {
        Self {
            inner: Arc::new(RwLock::new(StateStoreInner {
                git_service,
                branches: Vec::new(),
                stashes: Vec::new(),
                changes: Vec::new(),
                graph: Vec::new(),
                compare_result: None,
                operation_state: GitOperationState {
                    kind: GitOperationKind::None,
                    head_short: None,
                    onto_short: None,
                    message: None,
                    step_current: None,
                    step_total: None,
                },
                conflicts: Vec::new(),
                recent_compare_pairs: Vec::new(),
                max_recent_compare_pairs: recent_compare_pairs_count.max(1),
                max_graph_commits: max_graph_commits.max(20),
                panel_filters: PanelFilters::default(),
                compare_session: CompareSessionState::default(),
                commit_detail_selection: CommitDetailSelectionState::default(),
                operation_flags: OperationContextFlags::default(),
            })),
        }
    }

    pub fn branches(&self) -> Vec<BranchRef> {
        self.inner.read().expect("state lock poisoned").branches.clone()
    }

    pub fn stashes(&self) -> Vec<StashEntry> {
        self.inner.read().expect("state lock poisoned").stashes.clone()
    }

    pub fn changes(&self) -> Vec<WorkingTreeChange> {
        self.inner.read().expect("state lock poisoned").changes.clone()
    }

    pub fn staged_changes(&self) -> Vec<WorkingTreeChange> {
        self.inner
            .read()
            .expect("state lock poisoned")
            .changes
            .iter()
            .filter(|c| {
                c.status.chars().next().unwrap_or(' ') != ' '
                    && c.status.chars().next().unwrap_or(' ') != '?'
            })
            .cloned()
            .collect()
    }

    pub fn unstaged_changes(&self) -> Vec<WorkingTreeChange> {
        self.inner
            .read()
            .expect("state lock poisoned")
            .changes
            .iter()
            .filter(|c| c.status.chars().nth(1).unwrap_or(' ') != ' ')
            .cloned()
            .collect()
    }

    pub fn graph(&self) -> Vec<GraphCommit> {
        self.inner.read().expect("state lock poisoned").graph.clone()
    }

    pub fn compare_result(&self) -> Option<CompareResult> {
        self.inner
            .read()
            .expect("state lock poisoned")
            .compare_result
            .clone()
    }

    pub fn operation_state(&self) -> GitOperationState {
        self.inner
            .read()
            .expect("state lock poisoned")
            .operation_state
            .clone()
    }

    pub fn conflicts(&self) -> Vec<MergeConflictFile> {
        self.inner
            .read()
            .expect("state lock poisoned")
            .conflicts
            .clone()
    }

    pub fn recent_compare_pairs(&self) -> Vec<ComparePair> {
        self.inner
            .read()
            .expect("state lock poisoned")
            .recent_compare_pairs
            .clone()
    }

    pub fn panel_filters(&self) -> PanelFilters {
        self.inner
            .read()
            .expect("state lock poisoned")
            .panel_filters
            .clone()
    }

    pub fn compare_session(&self) -> CompareSessionState {
        self.inner
            .read()
            .expect("state lock poisoned")
            .compare_session
            .clone()
    }

    pub fn commit_detail_selection(&self) -> CommitDetailSelectionState {
        self.inner
            .read()
            .expect("state lock poisoned")
            .commit_detail_selection
            .clone()
    }

    pub fn operation_flags(&self) -> OperationContextFlags {
        self.inner
            .read()
            .expect("state lock poisoned")
            .operation_flags
            .clone()
    }

    pub fn set_panel_filters(&self, filters: PanelFilters) {
        self.inner
            .write()
            .expect("state lock poisoned")
            .panel_filters = filters;
    }

    pub fn set_selected_commit(&self, sha: Option<String>, file_path: Option<String>) {
        let mut state = self.inner.write().expect("state lock poisoned");
        state.commit_detail_selection.selected_commit_sha = sha;
        state.commit_detail_selection.selected_file_path = file_path;
    }

    pub fn clear_compare_result(&self) {
        let mut state = self.inner.write().expect("state lock poisoned");
        state.compare_result = None;
        state.compare_session = CompareSessionState::default();
    }

    pub fn refresh_all(&self) -> GitResult<()> {
        let mut state = self.inner.write().expect("state lock poisoned");

        if !state.git_service.is_repo() {
            state.branches.clear();
            state.stashes.clear();
            state.changes.clear();
            state.graph.clear();
            state.compare_result = None;
            state.compare_session = CompareSessionState::default();
            state.operation_state = GitOperationState {
                kind: GitOperationKind::None,
                head_short: None,
                onto_short: None,
                message: None,
                step_current: None,
                step_total: None,
            };
            state.operation_flags = OperationContextFlags::default();
            state.conflicts.clear();
            return Ok(());
        }

        state.branches = state.git_service.get_branches()?;
        state.stashes = state.git_service.get_stashes()?;
        state.changes = state.git_service.get_changed_files()?;
        state.operation_state = state.git_service.get_operation_state()?;
        state.conflicts = state.git_service.get_merge_conflicts()?;
        let max_graph_commits = state.max_graph_commits;
        let graph_filter = state.panel_filters.graph_filter.clone();
        state.graph = state
            .git_service
            .get_graph(max_graph_commits, Some(&graph_filter))?;

        state.operation_flags = Self::compute_operation_flags(&state.operation_state, &state.conflicts);
        Ok(())
    }

    pub fn refresh_branches(&self) -> GitResult<()> {
        let mut state = self.inner.write().expect("state lock poisoned");
        state.branches = state.git_service.get_branches()?;
        Ok(())
    }

    pub fn refresh_stashes(&self) -> GitResult<()> {
        let mut state = self.inner.write().expect("state lock poisoned");
        state.stashes = state.git_service.get_stashes()?;
        Ok(())
    }

    pub fn refresh_changes(&self) -> GitResult<()> {
        let mut state = self.inner.write().expect("state lock poisoned");
        state.changes = state.git_service.get_changed_files()?;
        state.operation_state = state.git_service.get_operation_state()?;
        state.conflicts = state.git_service.get_merge_conflicts()?;
        state.operation_flags = Self::compute_operation_flags(&state.operation_state, &state.conflicts);
        Ok(())
    }

    pub fn refresh_graph(&self, filters: Option<GraphFilters>) -> GitResult<()> {
        let mut state = self.inner.write().expect("state lock poisoned");
        if let Some(new_filters) = filters {
            state.panel_filters.graph_filter = new_filters;
        }
        let max_graph_commits = state.max_graph_commits;
        let filter = state.panel_filters.graph_filter.clone();
        state.graph = state.git_service.get_graph(max_graph_commits, Some(&filter))?;
        Ok(())
    }

    pub fn clear_graph_filters(&self) -> GitResult<()> {
        let mut state = self.inner.write().expect("state lock poisoned");
        state.panel_filters.graph_filter = GraphFilters::default();
        let max_graph_commits = state.max_graph_commits;
        state.graph = state.git_service.get_graph(max_graph_commits, None)?;
        Ok(())
    }

    pub fn compare_branches(&self, left_ref: &str, right_ref: &str) -> GitResult<CompareResult> {
        let mut state = self.inner.write().expect("state lock poisoned");
        let result = state.git_service.get_compare(left_ref, right_ref)?;

        state.compare_result = Some(result.clone());
        state.compare_session = CompareSessionState {
            left_ref: Some(left_ref.to_string()),
            right_ref: Some(right_ref.to_string()),
        };

        let pair = ComparePair {
            left: left_ref.to_string(),
            right: right_ref.to_string(),
        };
        state
            .recent_compare_pairs
            .retain(|p| !(p.left == pair.left && p.right == pair.right));
        state.recent_compare_pairs.insert(0, pair);
        let max_pairs = state.max_recent_compare_pairs;
        state.recent_compare_pairs.truncate(max_pairs);

        Ok(result)
    }

    fn compute_operation_flags(
        operation_state: &GitOperationState,
        conflicts: &[MergeConflictFile],
    ) -> OperationContextFlags {
        let has_operation = operation_state.kind != GitOperationKind::None;
        let can_skip = matches!(
            operation_state.kind,
            GitOperationKind::Rebase | GitOperationKind::CherryPick
        );

        OperationContextFlags {
            can_continue: has_operation,
            can_skip,
            can_abort: has_operation,
            has_conflicts: !conflicts.is_empty(),
        }
    }

    pub(crate) fn inner_mut(
        &self,
    ) -> std::sync::RwLockWriteGuard<'_, StateStoreInner> {
        self.inner.write().expect("state lock poisoned")
    }
}

impl Clone for StateStore {
    fn clone(&self) -> Self {
        Self {
            inner: Arc::clone(&self.inner),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use crate::git_service::{GitConfig, GitService, RepositoryContext};

    use super::{CompareSessionState, OperationContextFlags, PanelFilters, StateStore};

    fn make_state() -> StateStore {
        let git_service = GitService::new(
            RepositoryContext {
                root_path: PathBuf::from("."),
            },
            GitConfig::default(),
        );
        StateStore::new(git_service, 200, 3)
    }

    #[test]
    fn filter_state_round_trip() {
        let state = make_state();
        let mut filters = PanelFilters::default();
        filters.branch_filter = Some("feature".to_string());
        state.set_panel_filters(filters.clone());
        assert_eq!(state.panel_filters().branch_filter, filters.branch_filter);
    }

    #[test]
    fn compare_session_defaults_are_empty() {
        let state = make_state();
        assert!(matches!(
            state.compare_session(),
            CompareSessionState {
                left_ref: None,
                right_ref: None
            }
        ));
    }

    #[test]
    fn operation_flags_default_to_safe_false() {
        let state = make_state();
        assert!(matches!(
            state.operation_flags(),
            OperationContextFlags {
                can_continue: false,
                can_skip: false,
                can_abort: false,
                has_conflicts: false
            }
        ));
    }
}
