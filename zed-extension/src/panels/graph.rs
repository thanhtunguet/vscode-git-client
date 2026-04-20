//! Graph panel projection helpers.

use crate::types::{GraphCommit, GraphFilters};

pub fn filter_graph(commits: &[GraphCommit], filters: &GraphFilters) -> Vec<GraphCommit> {
    commits
        .iter()
        .filter(|commit| {
            if let Some(ref branch_filter) = filters.branch {
                let matches_ref = commit.refs.iter().any(|r| r.contains(branch_filter));
                if !matches_ref && !commit.sha.starts_with(branch_filter) && !commit.short_sha.starts_with(branch_filter) {
                    return false;
                }
            }

            if let Some(ref author_filter) = filters.author {
                if !commit
                    .author
                    .to_lowercase()
                    .contains(&author_filter.to_lowercase())
                {
                    return false;
                }
            }

            if let Some(ref message_filter) = filters.message {
                if !commit
                    .subject
                    .to_lowercase()
                    .contains(&message_filter.to_lowercase())
                {
                    return false;
                }
            }

            true
        })
        .cloned()
        .collect()
}

pub fn describe_commit(commit: &GraphCommit) -> String {
    let mut parts = vec![format!("{} {}", commit.short_sha, commit.subject)];
    if !commit.refs.is_empty() {
        parts.push(format!("refs: {}", commit.refs.join(", ")));
    }
    parts.push(format!("author: {}", commit.author));
    parts.push(format!("date: {}", commit.date));
    if let Some(stats) = &commit.stats {
        parts.push(format!(
            "stats: {} files +{} -{}",
            stats.files, stats.insertions, stats.deletions
        ));
    }
    parts.join(" · ")
}

#[cfg(test)]
mod tests {
    use super::{describe_commit, filter_graph};
    use crate::types::{GraphCommit, GraphFilters};

    fn sample_commit(subject: &str, author: &str, refs: Vec<&str>) -> GraphCommit {
        GraphCommit {
            sha: "abcdef123456".to_string(),
            short_sha: "abcdef1".to_string(),
            graph: None,
            parents: vec![],
            refs: refs.into_iter().map(ToString::to_string).collect(),
            author: author.to_string(),
            date: "2026-04-20T00:00:00Z".to_string(),
            subject: subject.to_string(),
            stats: None,
        }
    }

    #[test]
    fn graph_filter_matches_message_and_author() {
        let commits = vec![
            sample_commit("feat: parser", "Alice", vec!["origin/main"]),
            sample_commit("fix: ui", "Bob", vec!["origin/dev"]),
        ];

        let filters = GraphFilters {
            branch: None,
            author: Some("alice".to_string()),
            message: Some("parser".to_string()),
            since: None,
            until: None,
        };

        let filtered = filter_graph(&commits, &filters);
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].author, "Alice");
    }

    #[test]
    fn describe_commit_includes_sha_and_subject() {
        let commit = sample_commit("feat: parser", "Alice", vec![]);
        let text = describe_commit(&commit);
        assert!(text.contains("abcdef1"));
        assert!(text.contains("feat: parser"));
    }
}
