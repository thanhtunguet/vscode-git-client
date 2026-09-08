import * as assert from 'assert';
import { describe, it } from 'node:test';
import * as vscode from 'vscode';
import { onRepositorySelected } from '../services/gitService/onRepositorySelected';

describe('active repository selection', () => {
  it('uses the currently selected VS Code Git SCM repository, then follows native selection changes', async () => {
    const rootRepository = vscode.Uri.file('/workspace');
    const submoduleRepository = vscode.Uri.file('/workspace/submodule');
    const rootSelection = new vscode.EventEmitter<void>();
    const submoduleSelection = new vscode.EventEmitter<void>();
    let rootSelected = false;
    let submoduleSelected = true;
    const selected: string[] = [];

    const disposable = await onRepositorySelected.call(
      {
        getVsCodeGitApi: async () => ({
          repositories: [
            {
              rootUri: rootRepository,
              ui: {
                get selected() {
                  return rootSelected;
                },
                onDidChange: rootSelection.event
              }
            },
            {
              rootUri: submoduleRepository,
              ui: {
                get selected() {
                  return submoduleSelected;
                },
                onDidChange: submoduleSelection.event
              }
            }
          ]
        })
      } as never,
      (rootUri) => selected.push(rootUri.fsPath)
    );

    await new Promise<void>((resolve) => queueMicrotask(resolve));

    assert.deepStrictEqual(selected, ['/workspace/submodule']);

    rootSelected = true;
    submoduleSelected = false;
    // VS Code can report the repository that was deselected, so the listener
    // must resolve the new selection from the full Git API snapshot.
    submoduleSelection.fire();

    await new Promise<void>((resolve) => queueMicrotask(resolve));

    assert.deepStrictEqual(selected, ['/workspace/submodule', '/workspace']);
    disposable?.dispose();
  });
});
