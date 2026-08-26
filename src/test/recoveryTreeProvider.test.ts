import * as assert from 'assert';
import { describe, it } from 'node:test';
import { RecoveryTreeProvider } from '../recovery/recoveryTreeProvider';
import { RecoveryReflogEntry } from '../recovery/recoveryTypes';

function makeEntry(index: number): RecoveryReflogEntry {
  const oid = index.toString(16).padStart(40, '0');
  return {
    refName: 'HEAD',
    selector: `HEAD@{${index}}`,
    index,
    newOid: oid,
    action: 'commit',
    message: `commit: ${index}`,
    timestamp: 1700000000000 - index * 1000,
    suggestedRecoveryOid: oid,
    confidence: 'medium'
  };
}

describe('RecoveryTreeProvider', () => {
  it('reloads the full visible prefix with one lookahead record when loading more', async () => {
    const limits: number[] = [];
    const git = {
      getRecoveryReflogEntries: async (limit: number) => {
        limits.push(limit);
        return Array.from({ length: limit }, (_, index) => makeEntry(index));
      },
      getCurrentHeadSha: async () => 'f'.repeat(40),
      getRecoverySnapshotFiles: async () => []
    };
    const provider = new RecoveryTreeProvider(git as never, '/repo');

    await provider.refreshReflog();
    await provider.loadMoreReflog();

    assert.deepStrictEqual(limits, [51, 101]);
    const roots = await provider.getChildren();
    const reflogChildren = await provider.getChildren(roots[0]);
    assert.strictEqual(reflogChildren.length, 101, '100 entries plus Load More');
  });

  it('invalidates snapshot-file cache when HEAD changes', async () => {
    let head = 'a'.repeat(40);
    let snapshotCalls = 0;
    const git = {
      getRecoveryReflogEntries: async () => [],
      getCurrentHeadSha: async () => head,
      getRecoverySnapshotFiles: async () => {
        snapshotCalls += 1;
        return [{ status: 'M', path: 'src/index.ts' }];
      }
    };
    const provider = new RecoveryTreeProvider(git as never, '/repo');
    const entry = makeEntry(0);

    await provider.getEntryFiles(entry);
    await provider.getEntryFiles(entry);
    head = 'b'.repeat(40);
    await provider.getEntryFiles(entry);

    assert.strictEqual(snapshotCalls, 2);
  });
});
