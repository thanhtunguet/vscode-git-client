import type { GitService } from './index';
import { GraphCommit, BranchRef, TagRef } from '../../types';

export interface VisualGraphCommit {
  sha: string;
  shortSha: string;
  author: string;
  date: string;
  subject: string;
  parents: string[];
  refs: string[];
  branchNames: string[];
  tagNames: string[];
  isHead: boolean;
  column: number;
}

export interface VisualGraphData {
  commits: VisualGraphCommit[];
  branches: BranchRef[];
  tags: TagRef[];
  maxColumn: number;
}

const FIELD_SEPARATOR = '|~|';
const RECORD_SEPARATOR = '|#|';

export async function getVisualGraphData(
  this: GitService,
  maxCount: number = 500
): Promise<VisualGraphData> {
  const [branches, tags] = await Promise.all([this.getBranches(), this.getTags()]);

  // Fetch commits with full decorations using --all and topo-order
  const format = ['%m', '%H', '%h', '%P', '%D', '%an', '%aI', '%s'].join(FIELD_SEPARATOR);
  const args = [
    'log',
    '--all',
    '--topo-order',
    '--date=iso-strict',
    '--decorate=full',
    `--max-count=${maxCount}`,
    `--format=${format}${RECORD_SEPARATOR}`
  ];
  const result = await this.runGit(args);

  const rawCommits: GraphCommit[] = result.stdout
    .split(RECORD_SEPARATOR)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [graph, sha, shortSha, parentsRaw, refsRaw, author, date, subject] =
        line.split(FIELD_SEPARATOR);
      const parents = parentsRaw?.split(' ').filter(Boolean) ?? [];
      const refs = refsRaw
        ? refsRaw
            .split(',')
            .map((ref) => ref.trim())
            .filter(Boolean)
        : [];
      return {
        graph,
        sha,
        shortSha,
        parents,
        refs,
        author,
        date,
        subject
      } as GraphCommit;
    });

  // Parse refs to extract branch/tag names
  const commits: VisualGraphCommit[] = rawCommits.map((c) => {
    const branchNames: string[] = [];
    const tagNames: string[] = [];
    let isHead = false;

    for (const ref of c.refs) {
      const trimmed = ref.trim();
      if (trimmed.startsWith('HEAD -> ')) {
        isHead = true;
        const branchRef = trimmed.slice(8).trim();
        if (branchRef.startsWith('refs/heads/')) {
          branchNames.push(branchRef.slice(11));
        }
      } else if (trimmed.startsWith('refs/heads/')) {
        branchNames.push(trimmed.slice(11));
      } else if (trimmed.startsWith('tag: refs/tags/')) {
        // `--decorate=full` still prefixes tag decorations with `tag: `.
        tagNames.push(trimmed.slice('tag: refs/tags/'.length));
      } else if (trimmed.startsWith('refs/tags/')) {
        tagNames.push(trimmed.slice(10));
      } else if (trimmed.startsWith('refs/remotes/')) {
        branchNames.push(trimmed.slice(13));
      }
    }

    return {
      sha: c.sha,
      shortSha: c.shortSha,
      author: c.author,
      date: c.date,
      subject: c.subject,
      parents: c.parents,
      refs: c.refs,
      branchNames,
      tagNames,
      isHead,
      column: 0 // will be computed
    };
  });

  // Compute column assignment for graph layout
  // Algorithm: process commits in git log order (newest first).
  // Build a map of sha → commit index, then for each commit:
  // - If it has children (commits that list it as parent), inherit the column
  //   of the first child
  // - If no children yet (orphan at this point), allocate a new column
  // - For merges, the merge commit inherits the column of the first child,
  //   and other children's columns remain active until their branches end
  const shaToIndex = new Map<string, number>();
  for (let i = 0; i < commits.length; i++) {
    shaToIndex.set(commits[i].sha, i);
  }

  // Build parent → children map
  const parentToChildren = new Map<string, number[]>();
  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    for (const parentSha of commit.parents) {
      if (!parentToChildren.has(parentSha)) {
        parentToChildren.set(parentSha, []);
      }
      parentToChildren.get(parentSha)!.push(i);
    }
  }

  let nextColumn = 0;
  const activeColumns: number[] = []; // columns currently in use

  // Helper to allocate a new column (reuse freed columns if available)
  const allocateColumn = (): number => {
    // Try to find a free column (not in activeColumns)
    for (let i = 0; i < nextColumn; i++) {
      if (!activeColumns.includes(i)) {
        activeColumns.push(i);
        return i;
      }
    }
    // No free columns, allocate new one
    const col = nextColumn++;
    activeColumns.push(col);
    return col;
  };

  // Helper to free a column
  const freeColumn = (col: number): void => {
    const idx = activeColumns.indexOf(col);
    if (idx !== -1) {
      activeColumns.splice(idx, 1);
    }
  };

  // Process commits from newest to oldest
  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];

    // Find all children (commits that have this commit as parent)
    const childIndices = parentToChildren.get(commit.sha) || [];

    if (childIndices.length === 0) {
      // No children yet - allocate a new column (or reuse freed one)
      commit.column = allocateColumn();
    } else {
      // Has children - inherit column of first child (main branch)
      commit.column = commits[childIndices[0]].column;

      // For merge commits (multiple parents), other children represent
      // different branches that are merging in. They keep their columns.
    }
  }

  return {
    commits,
    branches,
    tags,
    maxColumn: nextColumn - 1
  };
}
