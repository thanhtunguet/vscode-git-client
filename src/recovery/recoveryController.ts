import * as path from 'path';
import * as vscode from 'vscode';
import { GitCommand } from '../config/commands';
import { EditorOrchestrator } from '../editor/editorOrchestrator';
import { Logger } from '../logger';
import { GitService } from '../services/gitService';
import { StateStore } from '../state/stateStore';
import { CommitFileChange } from '../types';
import {
  RecoveryLoadMoreTreeItem,
  RecoveryReflogEntryTreeItem,
  RecoveryReflogFileTreeItem
} from './recoveryTreeItems';
import { RecoveryTreeProvider } from './recoveryTreeProvider';
import { RecoveryReflogEntry } from './recoveryTypes';

export class RecoveryController {
  constructor(
    private readonly git: GitService,
    private readonly state: StateStore,
    private readonly editor: EditorOrchestrator,
    private readonly logger: Logger,
    private readonly treeProvider: RecoveryTreeProvider
  ) {}

  async open(): Promise<void> {
    if (!(await this.ensureRepositoryScope('open Recovery Center'))) {
      return;
    }
    await vscode.commands.executeCommand(`${GitCommand.RecoveryView}.focus`);
  }

  async refreshReflog(arg?: unknown): Promise<void> {
    if (!(await this.ensureRepositoryScope('refresh reflog'))) {
      return;
    }
    if (arg instanceof RecoveryLoadMoreTreeItem) {
      await this.treeProvider.loadMoreReflog();
      return;
    }
    await this.treeProvider.refreshReflog();
  }

  async toggleAllRefs(): Promise<void> {
    if (!(await this.ensureRepositoryScope('change reflog scope'))) {
      return;
    }
    await this.treeProvider.toggleAllRefs();
    void vscode.window.showInformationMessage(
      `Recovery reflog scope: ${this.treeProvider.reflogScopeLabel}.`
    );
  }

  async scan(): Promise<void> {
    void vscode.window.showInformationMessage(
      'Unreachable object scan will be added in Phase 2. Reflog recovery is available now.'
    );
  }

  async cancelScan(): Promise<void> {
    void vscode.window.showInformationMessage('No active recovery scan to cancel.');
  }

  async preview(arg?: unknown): Promise<void> {
    if (!(await this.ensureRepositoryScope('preview recovery data'))) {
      return;
    }
    if (arg instanceof RecoveryReflogFileTreeItem) {
      await this.previewFile(arg.entry, arg.file);
      return;
    }

    const entry = this.resolveEntry(arg);
    if (!entry) {
      return;
    }

    const files = await this.treeProvider.getEntryFiles(entry);
    if (files.length === 0) {
      const previewOid = this.getPreviewOid(entry);
      void vscode.window.showInformationMessage(
        `No file differences between ${previewOid.slice(0, 8)} and HEAD.`
      );
      return;
    }

    await this.previewFile(entry, files[0]!);
  }

  async createBranch(arg?: unknown): Promise<void> {
    if (!(await this.ensureRepositoryScope('create a recovery branch'))) {
      return;
    }
    const entry = this.resolveEntry(arg);
    if (!entry) {
      return;
    }

    const commit = await this.resolveSuggestedCommit(entry);
    if (!commit) {
      return;
    }

    const suggestedName = this.suggestRecoveryBranchName(commit);
    const name = await vscode.window.showInputBox({
      title: `Create recovery branch in ${this.git.rootPath} at ${commit.slice(0, 8)}`,
      value: suggestedName,
      validateInput: (value) => {
        const candidate = value.trim();
        if (!candidate) {
          return 'Branch name is required';
        }
        return candidate.startsWith('-') ? 'Branch name cannot start with "-"' : undefined;
      }
    });
    if (!name) {
      return;
    }

    const branchName = name.trim();
    const validationError = await this.git.validateBranchName(branchName);
    if (validationError) {
      void vscode.window.showWarningMessage(validationError);
      return;
    }

    await this.git.createBranch(branchName, commit);
    await this.state.refreshAll();
    void vscode.window.showInformationMessage(
      `Created recovery branch ${branchName} at ${commit.slice(0, 8)} in ${this.git.rootPath}.`
    );
  }

  async openWorktree(arg?: unknown): Promise<void> {
    if (!(await this.ensureRepositoryScope('create a recovery worktree'))) {
      return;
    }
    const entry = this.resolveEntry(arg);
    if (!entry) {
      return;
    }

    const commit = await this.resolveSuggestedCommit(entry);
    if (!commit) {
      return;
    }

    const destination = await vscode.window.showOpenDialog({
      title: 'Select destination folder for recovery worktree',
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Use Folder'
    });
    if (!destination?.[0]) {
      return;
    }

    const target = path.join(destination[0].fsPath, `recovery-${commit.slice(0, 8)}`);
    await this.git.addDetachedWorktree(target, commit);
    await this.state.refreshWorktrees();
    void vscode.window.showInformationMessage(`Created detached recovery worktree at ${target}.`);
  }

  async cherryPick(arg?: unknown): Promise<void> {
    if (!(await this.ensureRepositoryScope('cherry-pick a recovery commit'))) {
      return;
    }
    const entry = this.resolveEntry(arg);
    if (!entry) {
      return;
    }

    const commit = await this.resolveSuggestedCommit(entry);
    if (!commit) {
      return;
    }

    const operation = await this.git.getOperationState();
    if (operation.kind !== 'none') {
      void vscode.window.showWarningMessage(
        `Cannot cherry-pick recovery commit while a ${operation.kind} operation is active.`
      );
      return;
    }

    const changes = await this.git.getChangedFiles();
    if (changes.length > 0) {
      void vscode.window.showWarningMessage(
        `Recovery cherry-pick requires a clean working tree. Commit or stash ${changes.length} current change(s) first.`
      );
      return;
    }

    const branch = await this.git.getCurrentBranch();
    const choice = await vscode.window.showWarningMessage(
      `Cherry-pick ${commit.slice(0, 8)} into ${branch}?\nRepository: ${this.git.rootPath}\nThis applies one commit's delta; it does not restore a complete snapshot.`,
      { modal: true },
      'Cherry-pick'
    );
    if (choice !== 'Cherry-pick') {
      return;
    }

    await vscode.commands.executeCommand(GitCommand.GraphCherryPick, commit);
    await this.treeProvider.refreshReflog();
  }

  private resolveEntry(arg?: unknown): RecoveryReflogEntry | undefined {
    if (arg instanceof RecoveryReflogEntryTreeItem) {
      return arg.entry;
    }
    if (arg instanceof RecoveryReflogFileTreeItem) {
      return arg.entry;
    }
    return this.treeProvider.resolveEntry(arg);
  }

  private async previewFile(entry: RecoveryReflogEntry, file: CommitFileChange): Promise<void> {
    const previewOid = this.getPreviewOid(entry);
    this.logger.info(`Recovery preview ${previewOid.slice(0, 8)} ↔ HEAD · ${file.path}`);
    await this.editor.openRecoveryFileDiff({
      fromRef: previewOid,
      toRef: 'HEAD',
      file,
      title: `${previewOid.slice(0, 8)} ↔ HEAD · ${file.path}`
    });
  }

  private getPreviewOid(entry: RecoveryReflogEntry): string {
    return entry.suggestedRecoveryOid ?? entry.newOid;
  }

  private async resolveSuggestedCommit(entry: RecoveryReflogEntry): Promise<string | undefined> {
    if (!entry.suggestedRecoveryOid) {
      void vscode.window.showWarningMessage(
        'This reflog entry is preview-only because its recovery target cannot be inferred safely.'
      );
      return undefined;
    }
    const commit = await this.git.resolveRecoveryCommit(entry.suggestedRecoveryOid);
    if (!commit) {
      void vscode.window.showWarningMessage(
        'Recovery commit is no longer available. It may have been pruned by Git GC.'
      );
    }
    return commit;
  }

  private async ensureRepositoryScope(action: string): Promise<boolean> {
    if (!(await this.git.isRepo())) {
      void vscode.window.showWarningMessage(
        `Cannot ${action}: the selected repository is no longer available.`
      );
      return false;
    }
    return true;
  }

  private suggestRecoveryBranchName(sha: string): string {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13);
    return `recovery/${timestamp}-${sha.slice(0, 8)}`;
  }
}
