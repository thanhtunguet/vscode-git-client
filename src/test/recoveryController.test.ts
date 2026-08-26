import * as assert from 'assert';
import { describe, it } from 'node:test';
import * as vscode from 'vscode';
import { RecoveryController } from '../recovery/recoveryController';
import { RecoveryReflogEntryTreeItem } from '../recovery/recoveryTreeItems';
import { RecoveryReflogEntry } from '../recovery/recoveryTypes';

const entry: RecoveryReflogEntry = {
  refName: 'HEAD',
  selector: 'HEAD@{0}',
  index: 0,
  newOid: 'a'.repeat(40),
  action: 'reset',
  message: 'reset: moving to HEAD~1',
  timestamp: 1700000000000,
  suggestedRecoveryOid: 'b'.repeat(40),
  confidence: 'high'
};

function makeController(git: Record<string, unknown>): RecoveryController {
  return new RecoveryController(
    { rootPath: '/repo-a', ...git } as never,
    {} as never,
    {} as never,
    { info: () => {} } as never,
    { refreshReflog: async () => {} } as never
  );
}

describe('RecoveryController safety guards', () => {
  it('blocks opening Recovery Center when more than one Git repository is active', async () => {
    const originalExecuteCommand = vscode.commands.executeCommand;
    const originalShowWarningMessage = vscode.window.showWarningMessage;
    let focusCalled = false;
    let warning = '';
    (
      vscode.commands as unknown as { executeCommand: typeof vscode.commands.executeCommand }
    ).executeCommand = (async <T>() => {
      focusCalled = true;
      return undefined as T;
    }) as typeof vscode.commands.executeCommand;
    (
      vscode.window as unknown as { showWarningMessage: typeof vscode.window.showWarningMessage }
    ).showWarningMessage = async (message: string) => {
      warning = message;
      return undefined;
    };

    try {
      const controller = makeController({
        getVsCodeGitApi: async () => ({
          repositories: [
            { rootUri: vscode.Uri.file('/repo-a') },
            { rootUri: vscode.Uri.file('/repo-b') }
          ]
        })
      });

      await controller.open();

      assert.strictEqual(focusCalled, false);
      assert.match(warning, /single-repository workspaces/);
    } finally {
      (
        vscode.commands as unknown as { executeCommand: typeof vscode.commands.executeCommand }
      ).executeCommand = originalExecuteCommand;
      (
        vscode.window as unknown as { showWarningMessage: typeof vscode.window.showWarningMessage }
      ).showWarningMessage = originalShowWarningMessage;
    }
  });

  it('blocks recovery cherry-pick when the working tree is dirty', async () => {
    const originalExecuteCommand = vscode.commands.executeCommand;
    const originalShowWarningMessage = vscode.window.showWarningMessage;
    let cherryPickCalled = false;
    let warning = '';
    (
      vscode.commands as unknown as { executeCommand: typeof vscode.commands.executeCommand }
    ).executeCommand = (async <T>() => {
      cherryPickCalled = true;
      return undefined as T;
    }) as typeof vscode.commands.executeCommand;
    (
      vscode.window as unknown as { showWarningMessage: typeof vscode.window.showWarningMessage }
    ).showWarningMessage = async (message: string) => {
      warning = message;
      return undefined;
    };

    try {
      const controller = makeController({
        getVsCodeGitApi: async () => ({ repositories: [{ rootUri: vscode.Uri.file('/repo-a') }] }),
        resolveRecoveryCommit: async () => entry.suggestedRecoveryOid,
        getOperationState: async () => ({ kind: 'none' }),
        getChangedFiles: async () => [{ status: ' M', path: 'src/index.ts' }]
      });

      await controller.cherryPick(new RecoveryReflogEntryTreeItem(entry));

      assert.strictEqual(cherryPickCalled, false);
      assert.match(warning, /requires a clean working tree/);
    } finally {
      (
        vscode.commands as unknown as { executeCommand: typeof vscode.commands.executeCommand }
      ).executeCommand = originalExecuteCommand;
      (
        vscode.window as unknown as { showWarningMessage: typeof vscode.window.showWarningMessage }
      ).showWarningMessage = originalShowWarningMessage;
    }
  });
});
