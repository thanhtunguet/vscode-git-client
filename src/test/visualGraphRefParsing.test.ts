import * as assert from 'assert';
import { describe, it } from 'node:test';
import { getVisualGraphData } from '../services/gitService/getVisualGraphData';
import type { GitService } from '../services/gitService';

const FIELD_SEPARATOR = '|~|';
const RECORD_SEPARATOR = '|#|';

function record(refs: string, sha = 'a'.repeat(40), shortSha = 'aaaaaaa'): string {
  return (
    [
      '',
      sha,
      shortSha,
      '',
      refs,
      'Ada Lovelace',
      '2026-01-01T00:00:00+00:00',
      'Initial commit'
    ].join(FIELD_SEPARATOR) + RECORD_SEPARATOR
  );
}

function makeGit(stdout: string): GitService {
  return {
    getBranches: async () => [],
    getTags: async () => [],
    runGit: async () => ({ stdout, stderr: '' })
  } as unknown as GitService;
}

describe('getVisualGraphData ref parsing', () => {
  it('extracts tag names from "tag: refs/tags/..." decorations', async () => {
    // `git log --decorate=full` prefixes tag decorations with `tag: `, so a
    // parser matching only the bare `refs/tags/` prefix never sees any tag.
    const data = await getVisualGraphData.call(
      makeGit(record('tag: refs/tags/v1.19.3')),
      10
    );

    assert.deepStrictEqual(data.commits[0].tagNames, ['v1.19.3']);
  });

  it('extracts the checked-out branch and marks the commit as HEAD', async () => {
    const data = await getVisualGraphData.call(
      makeGit(record('HEAD -> refs/heads/main, refs/remotes/origin/main')),
      10
    );

    assert.strictEqual(data.commits[0].isHead, true);
    assert.ok(data.commits[0].branchNames.includes('main'));
  });

  it('reports both a tag and a branch pointing at the same commit', async () => {
    const data = await getVisualGraphData.call(
      makeGit(record('HEAD -> refs/heads/main, tag: refs/tags/v2.0.0')),
      10
    );

    assert.deepStrictEqual(data.commits[0].tagNames, ['v2.0.0']);
    assert.deepStrictEqual(data.commits[0].branchNames, ['main']);
  });
});
