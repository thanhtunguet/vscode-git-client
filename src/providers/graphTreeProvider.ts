import * as vscode from 'vscode';
import { StateStore } from '../state/stateStore';
import { GraphCommit } from '../types';

export class GraphCommitTreeItem extends vscode.TreeItem {
  constructor(public readonly commit: GraphCommit) {
    const graphGlyph = commit.graph === '<' ? '◀' : commit.graph === '>' ? '▶' : commit.graph === '-' ? '●' : '○';
    super(`${graphGlyph} ${commit.shortSha} ${commit.subject}`, vscode.TreeItemCollapsibleState.None);
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

    this.command = {
      title: 'Open Commit Details',
      command: 'intelliGit.graph.openDetails',
      arguments: [this]
    };
  }
}

export class GraphTreeProvider implements vscode.TreeDataProvider<GraphCommitTreeItem> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(private readonly state: StateStore) {
    this.state.onDidChange(() => this.emitter.fire());
  }

  refresh(): void {
    this.emitter.fire();
  }

  getTreeItem(element: GraphCommitTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<GraphCommitTreeItem[]> {
    return this.state.graph.map((commit) => new GraphCommitTreeItem(commit));
  }
}
