import * as vscode from 'vscode';
import { GitService } from '../services/gitService';
import { StateStore } from '../state/stateStore';
import { GraphCommit } from '../types';

export class GraphCommitTreeItem extends vscode.TreeItem {
  constructor(public readonly commit: GraphCommit) {
    const graphGlyph = commit.graph === '<' ? '◀' : commit.graph === '>' ? '▶' : commit.graph === '-' ? '●' : '○';
    super(`${graphGlyph} ${commit.shortSha} ${commit.subject}`, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'graphCommit';
    this.id = `commit:${commit.sha}`;
    this.description = [commit.author, new Date(commit.date).toLocaleString()].join(' · ');
    this.tooltip = [
      commit.sha,
      commit.subject,
      `Author: ${commit.author}`,
      `Date: ${new Date(commit.date).toLocaleString()}`,
      commit.refs.length ? `Refs: ${commit.refs.join(', ')}` : ''
    ]
      .filter(Boolean)
      .join('\n');
    this.iconPath = new vscode.ThemeIcon('git-commit');

  }
}

export class GraphCommitFileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly commit: GraphCommit,
    public readonly filePath: string
  ) {
    super(filePath, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'graphCommitFile';
    this.id = `commitFile:${commit.sha}:${filePath}`;
    this.iconPath = new vscode.ThemeIcon('file-diff');
    this.tooltip = `${filePath}\n${commit.shortSha} ${commit.subject}`;
    this.command = {
      title: 'Open Diff',
      command: 'intelliGit.graph.openFileDiff',
      arguments: [this]
    };
  }
}

type GraphNode = GraphCommitTreeItem | GraphCommitFileTreeItem;

export class GraphTreeProvider implements vscode.TreeDataProvider<GraphNode> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;
  private readonly commitFilesCache = new Map<string, string[]>();

  constructor(
    private readonly state: StateStore,
    private readonly git: GitService
  ) {
    this.state.onDidChange(() => this.emitter.fire());
  }

  refresh(): void {
    this.emitter.fire();
  }

  getTreeItem(element: GraphNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: GraphNode): Promise<GraphNode[]> {
    if (element instanceof GraphCommitTreeItem) {
      const commitSha = element.commit.sha;
      let files = this.commitFilesCache.get(commitSha);
      if (!files) {
        files = await this.git.getFilesInCommit(commitSha);
        this.commitFilesCache.set(commitSha, files);
      }

      return files.map((filePath) => new GraphCommitFileTreeItem(element.commit, filePath));
    }

    return this.state.graph.map((commit) => new GraphCommitTreeItem(commit));
  }
}
