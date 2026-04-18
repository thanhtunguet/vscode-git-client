import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../logger';
import { EditorOrchestrator } from '../editor/editorOrchestrator';
import { GitService } from '../services/gitService';
import { RepositoryContext } from '../types';

export class CommitFormProvider implements vscode.Disposable {
  readonly sourceControl: vscode.SourceControl;
  readonly stagedGroup: vscode.SourceControlResourceGroup;
  readonly changesGroup: vscode.SourceControlResourceGroup;

  constructor(
    private readonly git: GitService,
    private readonly editor: EditorOrchestrator,
    private readonly logger: Logger,
    private readonly repositoryContext: RepositoryContext
  ) {
    this.sourceControl = vscode.scm.createSourceControl('intelliGitCommit', 'IntelliGit Commit', repositoryContext.rootUri);
    this.sourceControl.inputBox.placeholder = 'Commit message (Ctrl/Cmd+Enter)';
    this.sourceControl.inputBox.visible = true;

    this.stagedGroup = this.sourceControl.createResourceGroup('staged', 'Staged Changes');
    this.changesGroup = this.sourceControl.createResourceGroup('changes', 'Changes');
  }

  async refresh(): Promise<void> {
    try {
      const changed = await this.git.getChangedFiles();
      const staged: vscode.SourceControlResourceState[] = [];
      const unstaged: vscode.SourceControlResourceState[] = [];

      for (const item of changed) {
        const x = item.status[0] ?? ' ';
        const y = item.status[1] ?? ' ';
        const isUntracked = x === '?' && y === '?';

        if (x !== ' ' && x !== '?') {
          staged.push(this.toResourceState(item.path, 'staged', item.status));
        }

        if (y !== ' ' || isUntracked) {
          unstaged.push(this.toResourceState(item.path, 'unstaged', item.status));
        }
      }

      this.stagedGroup.resourceStates = staged;
      this.changesGroup.resourceStates = unstaged;
    } catch (error) {
      this.logger.warn(`Commit form refresh failed: ${String(error)}`);
      this.stagedGroup.resourceStates = [];
      this.changesGroup.resourceStates = [];
    }
  }

  getCommitMessage(): string {
    return this.sourceControl.inputBox.value;
  }

  clearCommitMessage(): void {
    this.sourceControl.inputBox.value = '';
  }

  async openResourceDiff(arg: unknown): Promise<void> {
    const parsed = this.resolveResourceArg(arg);
    if (!parsed) {
      return;
    }

    const { filePath, stage } = parsed;
    if (stage === 'staged') {
      await this.editor.openDiffForFile({
        path: filePath,
        leftRef: 'HEAD',
        rightRef: 'INDEX',
        title: `HEAD ↔ INDEX · ${filePath}`
      });
      return;
    }

    await this.editor.openDiffForFile({
      path: filePath,
      leftRef: 'HEAD',
      rightRef: 'WORKTREE',
      title: `HEAD ↔ WORKTREE · ${filePath}`
    });
  }

  async stageResource(arg: unknown): Promise<void> {
    const parsed = this.resolveResourceArg(arg);
    if (!parsed) {
      return;
    }

    await this.git.stageFile(parsed.filePath);
    await this.refresh();
  }

  async unstageResource(arg: unknown): Promise<void> {
    const parsed = this.resolveResourceArg(arg);
    if (!parsed) {
      return;
    }

    await this.git.unstageFile(parsed.filePath);
    await this.refresh();
  }

  dispose(): void {
    this.sourceControl.dispose();
  }

  private toResourceState(
    filePath: string,
    stage: 'staged' | 'unstaged',
    status: string
  ): vscode.SourceControlResourceState {
    const resourceUri = vscode.Uri.joinPath(this.repositoryContext.rootUri, filePath);

    return {
      resourceUri,
      contextValue: stage === 'staged' ? 'intelliGitStagedResource' : 'intelliGitUnstagedResource',
      command: {
        command: 'intelliGit.commit.openResourceDiff',
        title: 'Open Diff',
        arguments: [
          {
            resourceUri,
            filePath,
            stage,
            status
          }
        ]
      },
      decorations: {
        tooltip: `${status} ${filePath}`
      }
    };
  }

  private resolveResourceArg(
    arg: unknown
  ): { filePath: string; stage: 'staged' | 'unstaged' } | undefined {
    if (isResourceArg(arg)) {
      return {
        filePath: arg.filePath,
        stage: arg.stage
      };
    }

    if (arg && typeof arg === 'object' && 'resourceUri' in arg) {
      const resourceUri = (arg as { resourceUri?: vscode.Uri }).resourceUri;
      const contextValue = (arg as { contextValue?: string }).contextValue;
      if (resourceUri) {
        const filePath = path.relative(this.repositoryContext.rootPath, resourceUri.fsPath).replaceAll('\\', '/');
        const stage = contextValue === 'intelliGitStagedResource' ? 'staged' : 'unstaged';
        return { filePath, stage };
      }
    }

    return undefined;
  }
}

function isResourceArg(value: unknown): value is {
  resourceUri: vscode.Uri;
  filePath: string;
  stage: 'staged' | 'unstaged';
  status: string;
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as {
    resourceUri?: vscode.Uri;
    filePath?: string;
    stage?: string;
    status?: string;
  };

  return (
    candidate.resourceUri instanceof vscode.Uri &&
    typeof candidate.filePath === 'string' &&
    (candidate.stage === 'staged' || candidate.stage === 'unstaged') &&
    typeof candidate.status === 'string'
  );
}
