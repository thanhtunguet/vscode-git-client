//! State management module for IntelliGit Zed extension
//!
//! This module provides central cached state for branches, stashes, graph, and compare results,
//! mirroring the functionality from the VSCode version's stateStore.ts

use std::sync::Arc;
use tokio::sync::RwLock;

use crate::types::*;
use crate::git_service::{GitService, GitResult};

/// Central state store for Git data
pub struct StateStore {
    inner: Arc<RwLock<StateStoreInner>>,
    git_service: Arc<GitService>,
}

struct StateStoreInner {
    branches: Vec<BranchRef>,
    stashes: Vec<StashEntry>,
    changes: Vec<WorkingTreeChange>,
    graph: Vec<GraphCommit>,
    compare_result: Option<CompareResult>,
    operation_state: GitOperationState,
    conflicts: Vec<MergeConflictFile>,
    recent_compare_pairs: Vec<ComparePair>,
    graph_filters: GraphFilters,
}

impl Default for StateStoreInner {
    fn default() -> Self {
        Self {
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
            graph_filters: GraphFilters::default(),
        }
    }
}

impl StateStore {
    /// Create a new StateStore instance
    pub fn new(git_service: Arc<GitService>) -> Self {
        Self {
            inner: Arc::new(RwLock::new(StateStoreInner::default())),
            git_service,
        }
    }

    /// Get all branches
    pub async fn branches(&self) -> Vec<BranchRef> {
        self.inner.read().await.branches.clone()
    }

    /// Get all stashes
    pub async fn stashes(&self) -> Vec<StashEntry> {
        self.inner.read().await.stashes.clone()
    }

    /// Get all changes
    pub async fn changes(&self) -> Vec<WorkingTreeChange> {
        self.inner.read().await.changes.clone()
    }

    /// Get staged changes
    pub async fn staged_changes(&self) -> Vec<WorkingTreeChange> {
        self.inner.read().await.changes
            .iter()
            .filter(|c| c.status.chars().next().unwrap_or(' ') != ' ' && c.status.chars().next().unwrap_or(' ') != '?')
            .cloned()
            .collect()
    }

    /// Get unstaged changes
    pub async fn unstaged_changes(&self) -> Vec<WorkingTreeChange> {
        self.inner.read().await.changes
            .iter()
            .filter(|c| c.status.chars().nth(1).unwrap_or(' ') != ' ')
            .cloned()
            .collect()
    }

    /// Get commit graph
    pub async fn graph(&self) -> Vec<GraphCommit> {
        self.inner.read().await.graph.clone()
    }

    /// Get compare result
    pub async fn compare_result(&self) -> Option<CompareResult> {
        self.inner.read().await.compare_result.clone()
    }

    /// Get operation state
    pub async fn operation_state(&self) -> GitOperationState {
        self.inner.read().await.operation_state.clone()
    }

    /// Get merge conflicts
    pub async fn conflicts(&self) -> Vec<MergeConflictFile> {
        self.inner.read().await.conflicts.clone()
    }

    /// Get recent compare pairs
    pub async fn recent_compare_pairs(&self) -> Vec<ComparePair> {
        self.inner.read().await.recent_compare_pairs.clone()
    }

    /// Get graph filters
    pub async fn graph_filters(&self) -> GraphFilters {
        self.inner.read().await.graph_filters.clone()
    }

    /// Refresh all state
    pub async fn refresh_all(&self) -> GitResult<()> {
        let is_repo = self.git_service.is_repo().await;
        
        if !is_repo {
            let mut inner = self.inner.write().await;
            inner.branches.clear();
            inner.stashes.clear();
            inner.changes.clear();
            inner.graph.clear();
            inner.compare_result = None;
            inner.operation_state = GitOperationState {
                kind: GitOperationKind::None,
                head_short: None,
                onto_short: None,
                message: None,
                step_current: None,
                step_total: None,
            };
            inner.conflicts.clear();
            return Ok(());
        }

        let max_graph_commits = 200; // Default value, could be configurable

        let (branches, stashes, changes, graph, operation_state, conflicts) = tokio::try_join!(
            self.git_service.get_branches(),
            self.git_service.get_stashes(),
            self.git_service.get_changed_files(),
            self.git_service.get_graph(max_graph_commits, None),
            self.git_service.get_operation_state(),
            self.git_service.get_merge_conflicts(),
        )?;

        let mut inner = self.inner.write().await;
        inner.branches = branches;
        inner.stashes = stashes;
        inner.changes = changes;
        inner.operation_state = operation_state;
        inner.conflicts = conflicts;
        
        // Apply graph filters if set
        let filters = inner.graph_filters.clone();
        drop(inner);
        
        let graph = if filters.branch.is_some() || filters.author.is_some() 
            || filters.message.is_some() || filters.since.is_some() || filters.until.is_some() {
            self.git_service.get_graph(max_graph_commits, Some(&filters)).await?
        } else {
            graph
        };

        let mut inner = self.inner.write().await;
        inner.graph = graph;

        Ok(())
    }

    /// Refresh branches only
    pub async fn refresh_branches(&self) -> GitResult<()> {
        let branches = self.git_service.get_branches().await?;
        self.inner.write().await.branches = branches;
        Ok(())
    }

    /// Refresh stashes only
    pub async fn refresh_stashes(&self) -> GitResult<()> {
        let stashes = self.git_service.get_stashes().await?;
        self.inner.write().await.stashes = stashes;
        Ok(())
    }

    /// Refresh changes only
    pub async fn refresh_changes(&self) -> GitResult<()> {
        let (changes, operation_state, conflicts) = tokio::try_join!(
            self.git_service.get_changed_files(),
            self.git_service.get_operation_state(),
            self.git_service.get_merge_conflicts(),
        )?;

        let mut inner = self.inner.write().await;
        inner.changes = changes;
        inner.operation_state = operation_state;
        inner.conflicts = conflicts;
        Ok(())
    }

    /// Refresh graph with optional filters
    pub async fn refresh_graph(&self, filters: Option<GraphFilters>) -> GitResult<()> {
        let max_graph_commits = 200;
        
        let mut inner = self.inner.write().await;
        if let Some(f) = filters {
            inner.graph_filters = f;
        }
        let filters_ref = &inner.graph_filters;
        drop(inner);

        let graph = self.git_service.get_graph(max_graph_commits, Some(filters_ref)).await?;
        
        self.inner.write().await.graph = graph;
        Ok(())
    }

    /// Clear graph filters
    pub async fn clear_graph_filters(&self) -> GitResult<()> {
        let max_graph_commits = 200;
        
        let mut inner = self.inner.write().await;
        inner.graph_filters = GraphFilters::default();
        drop(inner);

        let graph = self.git_service.get_graph(max_graph_commits, None).await?;
        
        self.inner.write().await.graph = graph;
        Ok(())
    }

    /// Compare two branches
    pub async fn compare_branches(&self, left_ref: &str, right_ref: &str) -> GitResult<CompareResult> {
        let result = self.git_service.get_compare(left_ref, right_ref).await?;
        
        {
            let mut inner = self.inner.write().await;
            inner.compare_result = Some(result.clone());
            
            // Add to recent compare pairs
            let pair = ComparePair {
                left: left_ref.to_string(),
                right: right_ref.to_string(),
            };
            
            // Remove duplicate if exists
            inner.recent_compare_pairs.retain(|p| {
                !(p.left == pair.left && p.right == pair.right)
            });
            
            // Add to front, keep max 10
            inner.recent_compare_pairs.insert(0, pair);
            inner.recent_compare_pairs.truncate(10);
        }
        
        Ok(result)
    }

    /// Clear compare result
    pub async fn clear_compare_result(&self) {
        self.inner.write().await.compare_result = None;
    }
}

// Thread-safe clone
impl Clone for StateStore {
    fn clone(&self) -> Self {
        Self {
            inner: Arc::clone(&self.inner),
            git_service: Arc::clone(&self.git_service),
        }
    }
}
