import * as assert from 'assert';
import { describe, it } from 'node:test';
import { getRecoveryDiffSides } from '../editor/editorOrchestrator';

describe('recovery preview diff sides', () => {
  it('uses old and new paths for renamed files', () => {
    assert.deepStrictEqual(
      getRecoveryDiffSides({ status: 'R100', oldPath: 'src/old.ts', path: 'src/new.ts' }),
      {
        leftPath: 'src/old.ts',
        rightPath: 'src/new.ts',
        leftEmpty: false,
        rightEmpty: false
      }
    );
  });

  it('creates the correct empty side for added and deleted files', () => {
    assert.deepStrictEqual(getRecoveryDiffSides({ status: 'A', path: 'added.ts' }), {
      leftPath: 'added.ts',
      rightPath: 'added.ts',
      leftEmpty: true,
      rightEmpty: false
    });
    assert.deepStrictEqual(getRecoveryDiffSides({ status: 'D', path: 'deleted.ts' }), {
      leftPath: 'deleted.ts',
      rightPath: 'deleted.ts',
      leftEmpty: false,
      rightEmpty: true
    });
  });
});
