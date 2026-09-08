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
 * Observes VS Code's Git SCM picker. If the extension activates after the
 * user selected a submodule, immediately report that existing selection; the
 * workspace-root repository remains the fallback when nothing is selected.
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
  let selectionCheckScheduled = false;
  let disposed = false;

  // A native SCM selection change can notify the repository that was just
  // deselected. Resolve the selected repository from the API only after that
  // change has settled, instead of assuming the event belongs to the newly
  // selected repository.
  const reportSelectedRepository = (): void => {
    if (selectionCheckScheduled) {
      return;
    }
    selectionCheckScheduled = true;
    queueMicrotask(() => {
      selectionCheckScheduled = false;
      if (disposed) {
        return;
      }
      const selectedRepository = api.repositories.find((repository) => repository.ui?.selected);
      if (selectedRepository) {
        listener(selectedRepository.rootUri);
      }
    });
  };

  const watch = (repository: SelectableVsCodeGitRepository): void => {
    const onDidChange = repository.ui?.onDidChange;
    if (!onDidChange) {
      return;
    }
    disposables.push(
      onDidChange(() => {
        reportSelectedRepository();
      })
    );
  };

  api.repositories.forEach(watch);
  reportSelectedRepository();
  if (api.onDidOpenRepository) {
    disposables.push(
      api.onDidOpenRepository((repository) => {
        watch(repository);
        reportSelectedRepository();
      })
    );
  }
  return {
    dispose: () => {
      disposed = true;
      disposables.forEach((disposable) => disposable.dispose());
    }
  };
}
