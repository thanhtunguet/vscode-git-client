import * as assert from 'assert';
import { describe, it } from 'node:test';

describe('Git parsing utilities', () => {
  it('parses branch track output', () => {
    const parseTrack = (value: string): { ahead: number; behind: number } => {
      const aheadMatch = value.match(/ahead (\d+)/);
      const behindMatch = value.match(/behind (\d+)/);
      return {
        ahead: Number(aheadMatch?.[1] ?? 0),
        behind: Number(behindMatch?.[1] ?? 0)
      };
    };

    assert.deepStrictEqual(parseTrack('[ahead 2]'), { ahead: 2, behind: 0 });
    assert.deepStrictEqual(parseTrack('[behind 3]'), { ahead: 0, behind: 3 });
    assert.deepStrictEqual(parseTrack('[ahead 1, behind 4]'), { ahead: 1, behind: 4 });
    assert.deepStrictEqual(parseTrack(''), { ahead: 0, behind: 0 });
  });

  it('parses shortstat line', () => {
    const parseShortStat = (raw: string) => {
      const line = raw
        .split('\n')
        .map((value) => value.trim())
        .find((value) => value.length > 0);

      if (!line) {
        return undefined;
      }

      const filesMatch = line.match(/(\d+)\s+files?\s+changed/);
      const insertionsMatch = line.match(/(\d+)\s+insertions?\(\+\)/);
      const deletionsMatch = line.match(/(\d+)\s+deletions?\(-\)/);

      return {
        files: Number(filesMatch?.[1] ?? 0),
        insertions: Number(insertionsMatch?.[1] ?? 0),
        deletions: Number(deletionsMatch?.[1] ?? 0)
      };
    };

    assert.deepStrictEqual(parseShortStat(' 1 file changed, 2 insertions(+), 3 deletions(-)'), {
      files: 1,
      insertions: 2,
      deletions: 3
    });
  });
});
