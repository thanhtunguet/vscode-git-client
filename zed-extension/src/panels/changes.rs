//! Changes panel projection helpers.

use crate::types::WorkingTreeChange;

#[derive(Debug, Clone, Default)]
pub struct ChangesPanelData {
    pub staged: Vec<WorkingTreeChange>,
    pub unstaged: Vec<WorkingTreeChange>,
    pub conflicts: Vec<WorkingTreeChange>,
    pub untracked: Vec<WorkingTreeChange>,
}

pub fn build_changes_panel(changes: &[WorkingTreeChange], filter_text: Option<&str>) -> ChangesPanelData {
    let needle = filter_text.map(|s| s.to_lowercase());

    let mut data = ChangesPanelData::default();

    for change in changes {
        if let Some(ref n) = needle {
            if !change.path.to_lowercase().contains(n) {
                continue;
            }
        }

        let x = change.status.chars().next().unwrap_or(' ');
        let y = change.status.chars().nth(1).unwrap_or(' ');

        if x == 'U' || y == 'U' {
            data.conflicts.push(change.clone());
            continue;
        }
        if x == '?' && y == '?' {
            data.untracked.push(change.clone());
            continue;
        }

        if x != ' ' {
            data.staged.push(change.clone());
        }
        if y != ' ' {
            data.unstaged.push(change.clone());
        }
    }

    data
}

#[cfg(test)]
mod tests {
    use super::build_changes_panel;
    use crate::types::WorkingTreeChange;

    #[test]
    fn splits_changes_into_sections() {
        let changes = vec![
            WorkingTreeChange {
                status: "M ".to_string(),
                path: "staged.txt".to_string(),
            },
            WorkingTreeChange {
                status: " M".to_string(),
                path: "unstaged.txt".to_string(),
            },
            WorkingTreeChange {
                status: "UU".to_string(),
                path: "conflict.txt".to_string(),
            },
            WorkingTreeChange {
                status: "??".to_string(),
                path: "new.txt".to_string(),
            },
        ];

        let panel = build_changes_panel(&changes, None);

        assert_eq!(panel.staged.len(), 1);
        assert_eq!(panel.unstaged.len(), 1);
        assert_eq!(panel.conflicts.len(), 1);
        assert_eq!(panel.untracked.len(), 1);
    }
}
