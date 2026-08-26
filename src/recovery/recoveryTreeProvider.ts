import * as vscode from 'vscode';
import { GitService } from '../services/gitService';
import { CommitFileChange } from '../types';
import {
  RecoveryLoadMoreTreeItem,
  RecoveryReflogEntryTreeItem,
  RecoveryReflogFileTreeItem,
  RecoveryScanPlaceholderTreeItem,
  RecoverySectionTreeItem,
  RecoveryTreeNode
} from './recoveryTreeItems';
import { RecoveryReflogEntry } from './recoveryTypes';

const REFLOG_PAGE_SIZE = 50;

export class RecoveryTreeProvider implements vscode.TreeDataProvider<RecoveryTreeNode> {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.emitter.event;

  private reflogEntries: RecoveryReflogEntry[] = [];
  private hasLoadedReflog = false;
  private reflogHasMore = false;
  private includeAllRefs = false;
  private visibleReflogLimit = 0;
  private readonly reflogFilesCache = new Map<string, CommitFileChange[]>();
  private cachedHeadSha: string | undefined;

  constructor(
    private readonly git: GitService,
    private readonly workspaceRoot: string
  ) {}

  refresh(): void {
    this.emitter.fire();
  }

  getTreeItem(element: RecoveryTreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: RecoveryTreeNode): Promise<RecoveryTreeNode[]> {
    if (!element) {
      return [
        new RecoverySectionTreeItem('reflog', `Reflog Timeline (${this.reflogScopeLabel})`),
        new RecoverySectionTreeItem('commits', 'Unreachable Commits'),
        new RecoverySectionTreeItem('blobs', 'Unreachable Blobs')
      ];
    }

    if (element instanceof RecoverySectionTreeItem) {
      if (element.kind === 'reflog') {
        return this.getReflogChildren();
      }
      return [new RecoveryScanPlaceholderTreeItem(element.kind)];
    }

    if (element instanceof RecoveryReflogEntryTreeItem) {
      const files = await this.getEntryFiles(element.entry);
      return files.map(
        (file) => new RecoveryReflogFileTreeItem(element.entry, file, this.workspaceRoot)
      );
    }

    return [];
  }

  async refreshReflog(): Promise<void> {
    this.reflogEntries = [];
    this.reflogHasMore = false;
    this.visibleReflogLimit = 0;
    this.reflogFilesCache.clear();
    this.cachedHeadSha = undefined;
    this.hasLoadedReflog = true;
    await this.loadMoreReflog();
  }

  async loadMoreReflog(): Promise<void> {
    const nextVisibleLimit = this.visibleReflogLimit + REFLOG_PAGE_SIZE;
    const entriesWithLookahead = await this.git.getRecoveryReflogEntries(
      nextVisibleLimit + 1,
      this.includeAllRefs
    );
    this.reflogEntries = entriesWithLookahead.slice(0, nextVisibleLimit);
    this.reflogHasMore = entriesWithLookahead.length > nextVisibleLimit;
    this.visibleReflogLimit = nextVisibleLimit;
    this.hasLoadedReflog = true;
    this.emitter.fire();
  }

  async toggleAllRefs(): Promise<void> {
    this.includeAllRefs = !this.includeAllRefs;
    await this.refreshReflog();
  }

  get reflogScopeLabel(): string {
    return this.includeAllRefs ? 'All refs' : 'HEAD';
  }

  resolveEntry(arg?: unknown): RecoveryReflogEntry | undefined {
    if (arg instanceof RecoveryReflogEntryTreeItem) {
      return arg.entry;
    }
    if (arg instanceof RecoveryReflogFileTreeItem) {
      return arg.entry;
    }
    if (typeof arg === 'object' && arg !== null && 'entry' in arg) {
      const candidate = (arg as { entry?: RecoveryReflogEntry }).entry;
      if (candidate?.newOid) {
        return candidate;
      }
    }
    return undefined;
  }

  async getEntryFiles(entry: RecoveryReflogEntry): Promise<CommitFileChange[]> {
    const previewOid = entry.suggestedRecoveryOid ?? entry.newOid;
    const headSha = await this.git.getCurrentHeadSha();
    if (this.cachedHeadSha !== headSha) {
      this.reflogFilesCache.clear();
      this.cachedHeadSha = headSha;
    }
    const cacheKey = `${previewOid}:${headSha}`;
    const cached = this.reflogFilesCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const files = await this.git.getRecoverySnapshotFiles(previewOid, headSha);
    this.reflogFilesCache.set(cacheKey, files);
    return files;
  }

  private async getReflogChildren(): Promise<RecoveryTreeNode[]> {
    if (!this.hasLoadedReflog) {
      await this.refreshReflog();
    }

    const items: RecoveryTreeNode[] = this.reflogEntries.map(
      (entry) => new RecoveryReflogEntryTreeItem(entry)
    );
    if (this.reflogHasMore) {
      items.push(new RecoveryLoadMoreTreeItem());
    }
    return items;
  }
}
