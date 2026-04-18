import * as path from 'path';
import * as vscode from 'vscode';
import { StateStore } from '../state/stateStore';
import { WorkingTreeChange } from '../types';

export class ChangeFileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly filePath: string,
    public readonly status: string,
    workspaceRoot: string
  ) {
    const fileName = filePath.split('/').at(-1) ?? filePath;
    super(fileName, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'changeFile';
    this.id = `changes:file:${filePath}`;
    this.resourceUri = vscode.Uri.file(path.join(workspaceRoot, filePath));
    this.description = status.trim() || '?';
    this.tooltip = `${filePath}\n${status.trim() || '?'}`;
    this.command = {
      title: 'Open Working Tree Diff',
      command: 'intelliGit.changes.openFileDiff',
      arguments: [this]
    };
  }
}

export class ChangeFolderTreeItem extends vscode.TreeItem {
  constructor(
    public readonly folderPath: string,
    public readonly children: WorkingTreeChange[],
    workspaceRoot: string
  ) {
    const segment = folderPath.split('/').at(-1) ?? folderPath;
    super(segment, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = 'changeFolder';
    this.id = `changes:folder:${folderPath}`;
    this.resourceUri = vscode.Uri.file(path.join(workspaceRoot, folderPath));
  }
}

type ChangesNode = ChangeFileTreeItem | ChangeFolderTreeItem;

export class ChangesTreeProvider implements vscode.TreeDataProvider<ChangesNode> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(
    private readonly state: StateStore,
    private readonly workspaceRoot: string
  ) {
    this.state.onDidChange(() => this.emitter.fire());
  }

  refresh(): void {
    this.emitter.fire();
  }

  getTreeItem(element: ChangesNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ChangesNode): Promise<ChangesNode[]> {
    if (!element) {
      return buildChangesTree(this.state.changes, '', this.workspaceRoot);
    }

    if (element instanceof ChangeFolderTreeItem) {
      return buildChangesTree(element.children, element.folderPath, this.workspaceRoot);
    }

    return [];
  }

  getSelectedPaths(selectedItems: readonly ChangeFileTreeItem[]): string[] {
    const selected = [...new Set(selectedItems.map((item) => item.filePath).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    if (selected.length > 0) {
      return selected;
    }
    return this.state.changes.map((change) => change.path).sort((a, b) => a.localeCompare(b));
  }
}

function buildChangesTree(changes: WorkingTreeChange[], basePath: string, workspaceRoot: string): ChangesNode[] {
  const folders = new Map<string, WorkingTreeChange[]>();
  const leaves: ChangeFileTreeItem[] = [];

  for (const change of changes) {
    const relative = basePath ? change.path.slice(basePath.length + 1) : change.path;
    const slashIdx = relative.indexOf('/');
    if (slashIdx === -1) {
      leaves.push(new ChangeFileTreeItem(change.path, change.status, workspaceRoot));
      continue;
    }
    const segment = relative.slice(0, slashIdx);
    const childPath = basePath ? `${basePath}/${segment}` : segment;
    const list = folders.get(childPath) ?? [];
    list.push(change);
    folders.set(childPath, list);
  }

  const folderItems = [...folders.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folderPath, children]) => new ChangeFolderTreeItem(folderPath, children, workspaceRoot));

  leaves.sort((a, b) => a.filePath.localeCompare(b.filePath));
  return [...folderItems, ...leaves];
}
