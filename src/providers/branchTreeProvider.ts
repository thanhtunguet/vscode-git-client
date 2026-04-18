import * as vscode from 'vscode';
import { StateStore } from '../state/stateStore';
import { BranchRef } from '../types';

class BranchGroupNode extends vscode.TreeItem {
  constructor(
    public readonly segment: string,
    public readonly fullPath: string,
    public readonly depth: number,
    public readonly childrenBranches: BranchRef[]
  ) {
    super(segment, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = 'branchGroup';
    this.id = `branchGroup:${fullPath}`;
  }
}

export class BranchTreeItem extends vscode.TreeItem {
  constructor(public readonly branch: BranchRef) {
    super(branch.name, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'branchRef';
    this.id = `branch:${branch.fullName}`;
    this.description = describeBranch(branch);
    this.tooltip = `${branch.name}\n${branch.fullName}${branch.upstream ? `\nupstream: ${branch.upstream}` : ''}`;
    this.iconPath = branch.current
      ? new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'))
      : new vscode.ThemeIcon(branch.type === 'remote' ? 'cloud' : 'git-branch');

    this.command = {
      title: 'Checkout Branch',
      command: 'intelliGit.branch.checkout',
      arguments: [this]
    };
  }
}

export class BranchTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;
  private filterText = '';

  constructor(private readonly state: StateStore) {
    this.state.onDidChange(() => this.emitter.fire());
  }

  setFilter(text: string): void {
    this.filterText = text.trim().toLowerCase();
    this.emitter.fire();
  }

  refresh(): void {
    this.emitter.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    const branches = this.state.branches.filter((branch) => {
      if (!this.filterText) {
        return true;
      }
      return branch.name.toLowerCase().includes(this.filterText);
    });

    if (!element) {
      return this.buildTopLevelNodes(branches);
    }

    if (element instanceof BranchGroupNode) {
      return this.buildGroupChildren(element.fullPath, branches, element.depth + 1);
    }

    return [];
  }

  private buildTopLevelNodes(branches: BranchRef[]): vscode.TreeItem[] {
    return this.buildGroupChildren('', branches, 0);
  }

  private buildGroupChildren(basePath: string, branches: BranchRef[], depth: number): vscode.TreeItem[] {
    const groups = new Map<string, BranchRef[]>();
    const leaves: BranchTreeItem[] = [];

    for (const branch of branches) {
      const relativeName = basePath ? branch.name.slice(basePath.length + 1) : branch.name;
      if (!relativeName) {
        leaves.push(new BranchTreeItem(branch));
        continue;
      }

      const parts = relativeName.split('/');
      if (parts.length === 1) {
        leaves.push(new BranchTreeItem(branch));
        continue;
      }

      const segment = parts[0];
      const childPath = basePath ? `${basePath}/${segment}` : segment;
      const list = groups.get(childPath) ?? [];
      list.push(branch);
      groups.set(childPath, list);
    }

    const groupItems = Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, branchSet]) => {
        const segment = path.split('/').at(-1) ?? path;
        return new BranchGroupNode(segment, path, depth, branchSet);
      });

    leaves.sort((a, b) => {
      if (a.branch.current) {
        return -1;
      }
      if (b.branch.current) {
        return 1;
      }
      return a.branch.name.localeCompare(b.branch.name);
    });

    return [...groupItems, ...leaves];
  }
}

function describeBranch(branch: BranchRef): string {
  const parts: string[] = [];
  if (branch.current) {
    parts.push('current');
  }
  if (branch.type === 'remote') {
    parts.push('remote');
  }
  if (branch.upstream) {
    parts.push(`upstream: ${branch.upstream}`);
  }
  if (branch.ahead || branch.behind) {
    parts.push(`▲${branch.ahead} ▼${branch.behind}`);
  }
  return parts.join(' · ');
}
