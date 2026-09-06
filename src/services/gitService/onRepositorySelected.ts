import type { GitService } from './index';
import * as vscode from 'vscode';

interface SelectableVsCodeGitRepository {
  readonly rootUri: vscode.Uri;
  readonly ui?: {
    readonly selected: boolean;
    readonly onDidChange?: vscode.Event<void>;
  };
}

interface SelectableVsCodeGitApi {
  readonly repositories: readonly SelectableVsCodeGitRepository[];
  readonly onDidOpenRepository?: vscode.Event<SelectableVsCodeGitRepository>;
}

/**
 * Observes VS Code's Git SCM picker. The current selection is intentionally
 * not emitted: activation begins at the workspace-root repository.
 */
export async function onRepositorySelected(
  this: GitService,
  listener: (rootUri: vscode.Uri) => void
): Promise<vscode.Disposable | undefined> {
  const api = (await this.getVsCodeGitApi()) as SelectableVsCodeGitApi | undefined;
  if (!api) {
    return undefined;
  }

  const disposables: vscode.Disposable[] = [];
  const watch = (repository: SelectableVsCodeGitRepository): void => {
    const onDidChange = repository.ui?.onDidChange;
    if (!onDidChange) {
      return;
    }
    disposables.push(
      onDidChange(() => {
        if (repository.ui?.selected) {
          listener(repository.rootUri);
        }
      })
    );
  };

  api.repositories.forEach(watch);
  if (api.onDidOpenRepository) {
    disposables.push(
      api.onDidOpenRepository((repository) => {
        watch(repository);
        if (repository.ui?.selected) {
          listener(repository.rootUri);
        }
      })
    );
  }
  return {
    dispose: () => disposables.forEach((disposable) => disposable.dispose())
  };
}
