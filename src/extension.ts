import * as vscode from 'vscode';
import { CommandController } from './commands/commandController';
import { EditorOrchestrator } from './editor/editorOrchestrator';
import { VirtualGitContentProvider } from './editor/virtualGitContentProvider';
import { Logger } from './logger';
import { BranchTreeProvider } from './providers/branchTreeProvider';
import { GraphTreeProvider } from './providers/graphTreeProvider';
import { StashTreeProvider } from './providers/stashTreeProvider';
import { GitService } from './services/gitService';
import { getRepositoryContext } from './services/repositoryContext';
import { StateStore } from './state/stateStore';
import { CommitFilesViewProvider } from './views/commitFilesViewProvider';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = new Logger();
  context.subscriptions.push({ dispose: () => logger.dispose() });

  const configuration = vscode.workspace.getConfiguration('intelliGit');

  let repositoryContext;
  try {
    repositoryContext = getRepositoryContext();
  } catch (error) {
    logger.warn(String(error));
    void vscode.window.showWarningMessage('IntelliGit: Open a workspace folder to enable the extension.');
  }

  if (!repositoryContext) {
    // Register empty providers so the views appear in the SCM panel.
    // VS Code hides declared views permanently if no data provider is ever registered.
    const emptyProvider: vscode.TreeDataProvider<vscode.TreeItem> = {
      onDidChangeTreeData: new vscode.EventEmitter<void>().event,
      getTreeItem: (el) => el,
      getChildren: () => []
    };
    context.subscriptions.push(
      vscode.window.createTreeView('intelliGit.branches', { treeDataProvider: emptyProvider }),
      vscode.window.createTreeView('intelliGit.stashes', { treeDataProvider: emptyProvider }),
      vscode.window.createTreeView('intelliGit.graph', { treeDataProvider: emptyProvider }),
      vscode.window.registerWebviewViewProvider(CommitFilesViewProvider.viewId, {
        resolveWebviewView: () => {
          // no-op placeholder for empty workspace context
        }
      })
    );
    return;
  }

  const gitService = new GitService(repositoryContext, logger, configuration);
  const stateStore = new StateStore(gitService, logger, configuration, context.workspaceState);

  const branchProvider = new BranchTreeProvider(stateStore);
  const stashProvider = new StashTreeProvider(stateStore);
  const graphProvider = new GraphTreeProvider(stateStore, gitService);

  const branchView = vscode.window.createTreeView('intelliGit.branches', {
    treeDataProvider: branchProvider,
    showCollapseAll: true
  });
  const stashView = vscode.window.createTreeView('intelliGit.stashes', {
    treeDataProvider: stashProvider,
    showCollapseAll: true
  });
  const graphView = vscode.window.createTreeView('intelliGit.graph', {
    treeDataProvider: graphProvider,
    showCollapseAll: true
  });

  context.subscriptions.push(branchView, stashView, graphView);

  const virtualProvider = new VirtualGitContentProvider();
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('intelligit', virtualProvider));

  const commitFilesView = new CommitFilesViewProvider(gitService, async (sha, filePath) => {
    const leftUri = vscode.Uri.parse(`intelligit:${encodeURIComponent(`${sha}^`)}/${filePath.replaceAll('\\', '/')}`);
    const rightUri = vscode.Uri.parse(`intelligit:${encodeURIComponent(sha)}/${filePath.replaceAll('\\', '/')}`);
    const leftContent = await gitService.getFileContentFromRef(`${sha}^`, filePath);
    const rightContent = await gitService.getFileContentFromRef(sha, filePath);
    virtualProvider.setContent(leftUri, leftContent);
    virtualProvider.setContent(rightUri, rightContent);

    await vscode.commands.executeCommand('vscode.setEditorLayout', {
      orientation: 0,
      groups: [{ size: 0.34 }, { size: 0.66 }]
    });

    await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, `${sha.slice(0, 8)} parent ↔ commit · ${filePath}`, {
      preview: false,
      preserveFocus: true,
      viewColumn: vscode.ViewColumn.Two
    });
  });
  context.subscriptions.push(commitFilesView);
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(CommitFilesViewProvider.viewId, commitFilesView));

  const editor = new EditorOrchestrator(gitService, stateStore, virtualProvider, commitFilesView);
  const commandController = new CommandController(gitService, stateStore, editor, logger, branchProvider);
  commandController.register(context);

  stateStore.attachAutoRefresh(context);

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async () => {
      await stateStore.refreshAll();
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      await stateStore.refreshAll();
    })
  );

  try {
    await stateStore.refreshAll();
    logger.info('IntelliGit activated.');
  } catch (error) {
    logger.error('Initial refresh failed', error);
    void vscode.window.showWarningMessage('IntelliGit activated with partial state. Check output channel for details.');
  }
}

export function deactivate(): void {
  // no-op
}
