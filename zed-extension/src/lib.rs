//! IntelliGit Zed Extension - Main entry point
//!
//! This extension provides a JetBrains-like Git client for Zed IDE.

mod types;
mod git_service;
mod state;
mod panels;

use zed_extension_api::{self as zed, WorktreeId};

use std::sync::Arc;

use git_service::{GitService, GitConfig, RepositoryContext};
use state::StateStore;

struct IntelliGitExtension {
    git_service: Option<Arc<GitService>>,
    state_store: Option<StateStore>,
}

impl zed::Extension for IntelliGitExtension {
    fn new() -> Self {
        Self {
            git_service: None,
            state_store: None,
        }
    }

    fn workspace_updated(&mut self, worktree_id: WorktreeId) {
        // Initialize or refresh git service when workspace changes
        // In a real implementation, you would get the worktree path from Zed's API
        // For now, we initialize on first workspace update
        if self.git_service.is_none() {
            // Placeholder: In actual Zed extension, get root path from worktree_id
            // This is a simplified initialization
        }
    }
}

zed_extension_api::register_extension!(IntelliGitExtension);
