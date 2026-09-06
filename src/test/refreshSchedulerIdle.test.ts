import * as assert from 'assert';
import { describe, it } from 'node:test';
import { RefreshScheduler } from '../state/refreshScheduler';

describe('RefreshScheduler.waitForIdle', () => {
  it('waits until a scheduled refresh has completed', async () => {
    const calls: string[][] = [];
    const scheduler = new RefreshScheduler(async (scopes) => {
      calls.push([...scopes]);
    });

    const refresh = scheduler.request(['changes'], { delayMs: 0 });
    await scheduler.waitForIdle();
    await refresh;

    assert.deepStrictEqual(calls, [['changes']]);
  });
});
