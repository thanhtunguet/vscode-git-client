//! IntelliGit Zed Extension - command-first Git client workflows.

mod commands;
mod editor;
mod git_service;
mod panels;
mod state;
mod types;

use std::collections::HashMap;
use std::path::PathBuf;

use commands::{CommandRuntime, ExtensionConfig};
use zed_extension_api as zed;

struct IntelliGitExtension {
    runtimes: std::sync::Mutex<HashMap<String, CommandRuntime>>,
}

impl IntelliGitExtension {
    fn parse_settings_for_worktree(worktree: Option<&zed::Worktree>) -> ExtensionConfig {
        if let Some(tree) = worktree {
            if let Ok(content) = tree.read_text_file(".zed/settings.json") {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(value) = json.get("intelligit") {
                        if let Ok(parsed) = serde_json::from_value::<ExtensionConfig>(value.clone()) {
                            return parsed;
                        }
                    }
                }
            }
        }

        ExtensionConfig::default()
    }

    fn runtime_key(worktree: Option<&zed::Worktree>) -> String {
        worktree
            .map(|w| w.root_path())
            .unwrap_or_else(|| ".".to_string())
    }

    fn get_or_create_runtime(&self, worktree: Option<&zed::Worktree>) -> Result<CommandRuntime, String> {
        let key = Self::runtime_key(worktree);
        let mut runtimes = self
            .runtimes
            .lock()
            .map_err(|_| "failed to lock runtime map".to_string())?;

        if let Some(runtime) = runtimes.get(&key) {
            return Ok(CommandRuntime {
                state: runtime.state.clone(),
                config: runtime.config.clone(),
                capabilities: runtime.capabilities.clone(),
            });
        }

        let root_path = PathBuf::from(&key);
        let config = Self::parse_settings_for_worktree(worktree);
        let runtime = CommandRuntime::new(root_path, config);

        let cloned = CommandRuntime {
            state: runtime.state.clone(),
            config: runtime.config.clone(),
            capabilities: runtime.capabilities.clone(),
        };

        runtimes.insert(key, runtime);
        Ok(cloned)
    }

    fn tokenize_args(args: Vec<String>) -> Vec<String> {
        if args.len() == 1 {
            args[0]
                .split_whitespace()
                .map(ToString::to_string)
                .collect::<Vec<_>>()
        } else {
            args
        }
    }

    fn render_sections(text: &str) -> Vec<zed::SlashCommandOutputSection> {
        let mut sections = Vec::new();
        let mut cursor = 0u32;

        for line in text.lines() {
            let len = line.len() as u32;
            if len > 0 {
                sections.push(zed::SlashCommandOutputSection {
                    range: zed::Range {
                        start: cursor,
                        end: cursor + len,
                    },
                    label: line
                        .split(':')
                        .next()
                        .unwrap_or(line)
                        .trim()
                        .to_string(),
                });
            }
            cursor += len + 1;
        }

        sections
    }
}

impl zed::Extension for IntelliGitExtension {
    fn new() -> Self
    where
        Self: Sized,
    {
        Self {
            runtimes: std::sync::Mutex::new(HashMap::new()),
        }
    }

    fn complete_slash_command_argument(
        &self,
        command: zed::SlashCommand,
        args: Vec<String>,
    ) -> Result<Vec<zed::SlashCommandArgumentCompletion>, String> {
        if command.name != "intelligit" {
            return Ok(Vec::new());
        }

        let args = Self::tokenize_args(args);
        if args.len() <= 1 {
            let prefix = args.first().map(String::as_str).unwrap_or("");
            let actions = [
                "help",
                "refresh",
                "quick_actions",
                "capabilities",
                "branch.list",
                "branch.checkout",
                "branch.create",
                "branch.rename",
                "branch.delete",
                "branch.track",
                "branch.untrack",
                "branch.merge_into_current",
                "branch.rebase_onto",
                "branch.reset_current_to_commit",
                "branch.compare_with_current",
                "stash.list",
                "stash.create",
                "stash.apply",
                "stash.pop",
                "stash.drop",
                "stash.rename",
                "stash.preview_patch",
                "stash.unshelve",
                "graph.list",
                "graph.open_details",
                "graph.open_file_diff",
                "graph.checkout_commit",
                "graph.create_branch_here",
                "graph.create_tag_here",
                "graph.cherry_pick",
                "graph.cherry_pick_range",
                "graph.revert",
                "graph.rebase_interactive_from_here",
                "graph.compare_with_current",
                "graph.create_patch",
                "graph.show_repository_at_revision",
                "graph.open_repository_file_at_revision",
                "graph.go_to_parent_commit",
                "graph.filter",
                "graph.clear_filter",
                "changes.list",
                "changes.open_file_diff",
                "changes.stash_selected",
                "diff.open",
                "compare.open",
                "compare.recent",
                "merge.open_conflict",
                "merge.next",
                "merge.previous",
                "merge.finalize",
                "conflict.accept_ours",
                "conflict.accept_theirs",
                "conflict.accept_both",
                "operation.abort",
                "operation.continue",
                "operation.skip",
                "git.push_with_preview",
                "git.pull_with_preview",
                "git.fetch_prune",
                "stage.patch",
                "stage.file",
                "unstage.file",
                "unstage.all",
                "commit.amend",
                "commit.create",
                "commit.template",
                "commit.head_message",
                "file_history.open",
                "file_blame.open",
            ];

            let suggestions = actions
                .iter()
                .filter(|action| action.starts_with(prefix))
                .map(|action| zed::SlashCommandArgumentCompletion {
                    label: action.to_string(),
                    new_text: action.to_string(),
                    run_command: false,
                })
                .collect();

            return Ok(suggestions);
        }

        Ok(Vec::new())
    }

    fn run_slash_command(
        &self,
        command: zed::SlashCommand,
        args: Vec<String>,
        worktree: Option<&zed::Worktree>,
    ) -> Result<zed::SlashCommandOutput, String> {
        if command.name != "intelligit" {
            return Err(format!("Unexpected command: {}", command.name));
        }

        let tokens = Self::tokenize_args(args);
        if tokens.is_empty() {
            return Err("Missing IntelliGit action. Try '/intelligit help'.".to_string());
        }

        let action = tokens[0].clone();
        let action_args = tokens.into_iter().skip(1).collect::<Vec<_>>();

        let runtime = self.get_or_create_runtime(worktree)?;
        let text = runtime.execute(&action, &action_args)?;

        Ok(zed::SlashCommandOutput {
            sections: Self::render_sections(&text),
            text,
        })
    }
}

zed_extension_api::register_extension!(IntelliGitExtension);
