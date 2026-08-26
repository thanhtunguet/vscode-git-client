import * as assert from 'assert';
import { describe, it } from 'node:test';
import { validateBranchName } from '../services/gitService/validateBranchName';

describe('recovery branch validation', () => {
  it('rejects option-like branch names before running Git', async () => {
    let gitCalled = false;
    const service = {
      runGit: async () => {
        gitCalled = true;
        return { stdout: '', stderr: '' };
      },
      refExists: async () => false
    };

    const result = await validateBranchName.call(service as never, '-m');

    assert.strictEqual(result, 'Branch name cannot start with "-".');
    assert.strictEqual(gitCalled, false);
  });

  it('rejects invalid and existing branch names', async () => {
    const invalid = {
      runGit: async () => {
        throw new Error('invalid ref');
      },
      refExists: async () => false
    };
    assert.strictEqual(
      await validateBranchName.call(invalid as never, 'bad..name'),
      'Invalid Git branch name.'
    );

    const existing = {
      runGit: async () => ({ stdout: '', stderr: '' }),
      refExists: async () => true
    };
    assert.strictEqual(
      await validateBranchName.call(existing as never, 'recovery/existing'),
      'Branch "recovery/existing" already exists.'
    );
  });

  it('accepts a valid unused recovery branch name', async () => {
    const service = {
      runGit: async () => ({ stdout: '', stderr: '' }),
      refExists: async () => false
    };

    assert.strictEqual(
      await validateBranchName.call(service as never, 'recovery/20260827-abc12345'),
      undefined
    );
  });
});
