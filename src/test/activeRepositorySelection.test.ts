import * as assert from 'assert';
import { describe, it } from 'node:test';
import * as vscode from 'vscode';
import { onRepositorySelected } from '../services/gitService/onRepositorySelected';

describe('active repository selection', () => {
  it('follows only subsequent selections from VS Code Git SCM', async () => {
    const rootRepository = vscode.Uri.file('/workspace');
    const submoduleRepository = vscode.Uri.file('/workspace/submodule');
    const rootSelection = new vscode.EventEmitter<void>();
    const submoduleSelection = new vscode.EventEmitter<void>();
    let rootSelected = true;
    let submoduleSelected = false;
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

    assert.deepStrictEqual(selected, [], 'activation retains the workspace-root repository');

    rootSelected = false;
    submoduleSelected = true;
    rootSelection.fire();
    submoduleSelection.fire();

    assert.deepStrictEqual(selected, ['/workspace/submodule']);
    disposable?.dispose();
  });
});
