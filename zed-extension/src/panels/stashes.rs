//! Stashes panel projection helpers.

use crate::types::StashEntry;

pub fn filter_stashes(stashes: &[StashEntry], filter_text: Option<&str>) -> Vec<StashEntry> {
    let needle = filter_text.map(|v| v.to_lowercase());

    stashes
        .iter()
        .filter(|stash| {
            if let Some(ref n) = needle {
                stash.message.to_lowercase().contains(n)
                    || stash
                        .author
                        .as_ref()
                        .map(|a| a.to_lowercase().contains(n))
                        .unwrap_or(false)
            } else {
                true
            }
        })
        .cloned()
        .collect()
}

pub fn describe_stash(stash: &StashEntry) -> String {
    let mut parts = vec![stash.r#ref.clone(), stash.message.clone()];
    if let Some(author) = &stash.author {
        parts.push(format!("author: {}", author));
    }
    if let Some(ts) = &stash.timestamp {
        parts.push(format!("at {}", ts));
    }
    parts.push(format!("files: {}", stash.file_count));
    parts.join(" · ")
}

#[cfg(test)]
mod tests {
    use super::{describe_stash, filter_stashes};
    use crate::types::StashEntry;

    #[test]
    fn filters_by_message() {
        let input = vec![
            StashEntry {
                index: 0,
                r#ref: "stash@{0}".to_string(),
                message: "wip parser".to_string(),
                author: Some("Alice".to_string()),
                timestamp: None,
                file_count: 1,
                sha: None,
            },
            StashEntry {
                index: 1,
                r#ref: "stash@{1}".to_string(),
                message: "fix tests".to_string(),
                author: Some("Bob".to_string()),
                timestamp: None,
                file_count: 2,
                sha: None,
            },
        ];

        let filtered = filter_stashes(&input, Some("parser"));
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].r#ref, "stash@{0}");
    }

    #[test]
    fn describe_contains_ref_message_and_file_count() {
        let stash = StashEntry {
            index: 1,
            r#ref: "stash@{1}".to_string(),
            message: "demo".to_string(),
            author: None,
            timestamp: None,
            file_count: 3,
            sha: None,
        };

        let text = describe_stash(&stash);
        assert!(text.contains("stash@{1}"));
        assert!(text.contains("demo"));
        assert!(text.contains("files: 3"));
    }
}
