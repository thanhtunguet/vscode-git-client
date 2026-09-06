import * as assert from 'assert';
import { afterEach, describe, it } from 'node:test';
import * as vscode from 'vscode';
import { handleRepositorySelect } from '../commands/commandController/handleRepositorySelect';
import { getRepositorySelectionRoots } from '../services/gitService/getRepositorySelectionRoots';

describe('repository selection', () => {
  let originalShowQuickPick: typeof vscode.window.showQuickPick;

  afterEach(() => {
    if (originalShowQuickPick) {
      (
        vscode.window as unknown as {
          showQuickPick: typeof vscode.window.showQuickPick;
        }
      ).showQuickPick = originalShowQuickPick;
    }
  });

  it('discovers the workspace repository and initialized nested submodules', async () => {
    const roots = await getRepositorySelectionRoots.call({
      context: { rootPath: '/workspace' },
      runGitAt: async (cwd: string, args: string[]) => {
        if (args[0] === 'submodule') {
          assert.strictEqual(cwd, '/workspace');
          return {
            stdout:
              ' abc modules/alpha (heads/main)\n-def modules/uninitialized\n ghi modules/parent/beta (heads/main)\n',
            stderr: ''
          };
        }
        assert.deepStrictEqual(args, ['rev-parse', '--show-toplevel']);
        return { stdout: cwd + '\n', stderr: '' };
      },
      samePath: (left: string, right: string) => left === right
    } as never);

    assert.deepStrictEqual(
      roots.map((root) => root.fsPath),
      ['/workspace', '/workspace/modules/alpha', '/workspace/modules/parent/beta']
    );
  });

  it('switches to the repository chosen in the quick pick', async () => {
    originalShowQuickPick = vscode.window.showQuickPick;
    const roots = [vscode.Uri.file('/workspace'), vscode.Uri.file('/workspace/modules/alpha')];
    let switchedTo: vscode.Uri | undefined;
    (
      vscode.window as unknown as {
        showQuickPick: typeof vscode.window.showQuickPick;
      }
    ).showQuickPick = (async (items: unknown) => {
      const choices = items as readonly { rootUri: vscode.Uri }[];
      return choices[1];
    }) as unknown as typeof vscode.window.showQuickPick;

    await handleRepositorySelect.call({
      git: {
        context: { rootPath: '/workspace' },
        rootPath: '/workspace',
        getRepositorySelectionRoots: async () => roots,
        samePath: (left: string, right: string) => left === right
      },
      selectRepository: async (rootUri: vscode.Uri) => {
        switchedTo = rootUri;
      }
    } as never);

    assert.strictEqual(switchedTo?.fsPath, '/workspace/modules/alpha');
  });
});
