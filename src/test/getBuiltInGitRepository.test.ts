import * as assert from 'assert';
import { describe, it } from 'node:test';
import * as vscode from 'vscode';
import { getBuiltInGitRepository } from '../commands/commandController/getBuiltInGitRepository';

describe('getBuiltInGitRepository', () => {
  it('does not fall back to the first open repository', async () => {
    const originalGetExtension = vscode.extensions.getExtension;
    const otherRepository = { rootUri: vscode.Uri.file('/other'), inputBox: { value: '' } };
    (
      vscode.extensions as unknown as {
        getExtension: typeof vscode.extensions.getExtension;
      }
    ).getExtension = () =>
      ({
        isActive: true,
        exports: {
          getAPI: () => ({
            getRepository: () => null,
            repositories: [otherRepository]
          })
        }
      }) as never;

    try {
      const repository = await getBuiltInGitRepository.call({
        git: { gitRoot: '/selected' }
      } as never);
      assert.strictEqual(repository, undefined);
    } finally {
      (
        vscode.extensions as unknown as {
          getExtension: typeof vscode.extensions.getExtension;
        }
      ).getExtension = originalGetExtension;
    }
  });
});
