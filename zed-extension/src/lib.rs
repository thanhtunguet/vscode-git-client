//! IntelliGit Zed Extension - Main entry point
//!
//! This extension provides a JetBrains-like Git client for Zed IDE.

mod types;
mod git_service;
mod state;
mod panels;

use zed_extension_api::{self as zed, Event, WorktreeId};

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

    fn event(&mut self, worktree: &zed::Worktree, event: Event) {
        match event {
            Event::WorktreeUpdated { .. } => {
                // Initialize or refresh git service when worktree changes
                if let Some(root_path) = worktree.root_dir() {
                    let config = GitConfig::default();
                    let context = RepositoryContext {
                        root_path: root_path.path().into(),
                    };
                    
                    let git_service = Arc::new(GitService::new(context, config));
                    let state_store = StateStore::new(Arc::clone(&git_service));
                    
                    self.git_service = Some(git_service);
                    self.state_store = Some(state_store);
                }
            }
            _ => {}
        }
    }

    fn serialize_state(&self, _worktree_id: WorktreeId) -> Option<Vec<u8>> {
        // Serialize recent compare pairs and other state if needed
        None
    }

    fn deserialize_state(
        &mut self,
        _worktree_id: WorktreeId,
        _serialized: Vec<u8>,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Deserialize state on restore
        Ok(())
    }
}

zed_extension_api::register_extension!(IntelliGitExtension);
