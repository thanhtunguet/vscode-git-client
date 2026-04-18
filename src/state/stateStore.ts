import * as vscode from 'vscode';
import { Logger } from '../logger';
import { GitService } from '../services/gitService';
import { BranchRef, ComparePair, CompareResult, GraphCommit, StashEntry, WorkingTreeChange } from '../types';

export class StateStore {
  private _branches: BranchRef[] = [];
  private _stashes: StashEntry[] = [];
  private _changes: WorkingTreeChange[] = [];
  private _graph: GraphCommit[] = [];
  private _compareResult: CompareResult | undefined;
  private _recentComparePairs: ComparePair[] = [];
  private _graphFilters: {
    branch?: string;
    author?: string;
    message?: string;
    since?: string;
    until?: string;
  } = {};
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.emitter.event;

  constructor(
    private readonly git: GitService,
    private readonly logger: Logger,
    private readonly configuration: vscode.WorkspaceConfiguration,
    private readonly workspaceState: vscode.Memento
  ) {
    const persisted = this.workspaceState.get<ComparePair[]>('intelliGit.recentComparePairs', []);
    this._recentComparePairs = Array.isArray(persisted) ? persisted : [];
  }

  get branches(): BranchRef[] {
    return this._branches;
  }

  get stashes(): StashEntry[] {
    return this._stashes;
  }

  get changes(): WorkingTreeChange[] {
    return this._changes;
  }

  get graph(): GraphCommit[] {
    return this._graph;
  }

  get compareResult(): CompareResult | undefined {
    return this._compareResult;
  }

  get recentComparePairs(): ComparePair[] {
    return [...this._recentComparePairs];
  }

  get graphFilters(): {
    branch?: string;
    author?: string;
    message?: string;
    since?: string;
    until?: string;
  } {
    return { ...this._graphFilters };
  }

  async refreshAll(): Promise<void> {
    if (!(await this.git.isRepo())) {
      this._branches = [];
      this._stashes = [];
      this._changes = [];
      this._graph = [];
      this._compareResult = undefined;
      this.emitter.fire();
      return;
    }

    const maxGraphCommits = this.configuration.get<number>('maxGraphCommits', 200);

    const [branches, stashes, changes, graph] = await Promise.all([
      this.git.getBranches(),
      this.git.getStashes(),
      this.git.getChangedFiles(),
      this.git.getGraph(maxGraphCommits, this._graphFilters)
    ]);

    this._branches = branches;
    this._stashes = stashes;
    this._changes = changes;
    this._graph = graph;
    this.emitter.fire();
  }

  async refreshBranches(): Promise<void> {
    this._branches = await this.git.getBranches();
    this.emitter.fire();
  }

  async refreshStashes(): Promise<void> {
    this._stashes = await this.git.getStashes();
    this.emitter.fire();
  }

  async refreshChanges(): Promise<void> {
    this._changes = await this.git.getChangedFiles();
    this.emitter.fire();
  }

  async refreshGraph(filters?: {
    branch?: string;
    author?: string;
    message?: string;
    since?: string;
    until?: string;
  }): Promise<void> {
    this._graphFilters = filters ? { ...filters } : this._graphFilters;
    const maxGraphCommits = this.configuration.get<number>('maxGraphCommits', 200);
    this._graph = await this.git.getGraph(maxGraphCommits, this._graphFilters);
    this.emitter.fire();
  }

  async clearGraphFilters(): Promise<void> {
    this._graphFilters = {};
    const maxGraphCommits = this.configuration.get<number>('maxGraphCommits', 200);
    this._graph = await this.git.getGraph(maxGraphCommits);
    this.emitter.fire();
  }

  async compareBranches(leftRef: string, rightRef: string): Promise<CompareResult> {
    const result = await this.git.getCompare(leftRef, rightRef);
    this._compareResult = result;
    this.pushComparePair({ left: leftRef, right: rightRef });
    this.emitter.fire();
    return result;
  }

  clearCompareResult(): void {
    this._compareResult = undefined;
    this.emitter.fire();
  }

  attachAutoRefresh(context: vscode.ExtensionContext): void {
    const watcher = vscode.workspace.createFileSystemWatcher('**/.git/{HEAD,index,refs/**,packed-refs,logs/**}');

    const onChange = async (): Promise<void> => {
      try {
        await this.refreshAll();
      } catch (error) {
        this.logger.warn(`Auto-refresh failed: ${String(error)}`);
      }
    };

    watcher.onDidCreate(onChange, this, context.subscriptions);
    watcher.onDidChange(onChange, this, context.subscriptions);
    watcher.onDidDelete(onChange, this, context.subscriptions);
    context.subscriptions.push(watcher);
  }

  private pushComparePair(pair: ComparePair): void {
    const key = `${pair.left}:::${pair.right}`;
    this._recentComparePairs = [pair, ...this._recentComparePairs.filter((item) => `${item.left}:::${item.right}` !== key)].slice(0, 10);
    void this.workspaceState.update('intelliGit.recentComparePairs', this._recentComparePairs);
  }
}
