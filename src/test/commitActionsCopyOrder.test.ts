import * as assert from 'assert';
import { afterEach, describe, it } from 'node:test';
import * as vscode from 'vscode';
import { handleCommitAction } from '../views/commitActions';

describe('commit context menu copy actions', () => {
  const originalWriteText = vscode.env.clipboard.writeText;

  afterEach(() => {
    (
      vscode.env.clipboard as unknown as { writeText: typeof vscode.env.clipboard.writeText }
    ).writeText = originalWriteText;
  });

  function captureClipboard(): { text(): string } {
    let copied = '';
    (vscode.env.clipboard as unknown as { writeText(value: string): Promise<void> }).writeText =
      async (value: string) => {
        copied = value;
      };
    return { text: () => copied };
  }

  it('copies commit IDs in selection order by default', async () => {
    const clipboard = captureClipboard();

    await handleCommitAction({
      type: 'commitAction',
      action: 'copyCommitId',
      sha: 'aaa',
      shas: ['aaa', 'bbb', 'ccc']
    });

    assert.strictEqual(clipboard.text(), 'aaa\nbbb\nccc');
  });

  it('reverses commit IDs when reverseOrder is set (Shift+Click)', async () => {
    const clipboard = captureClipboard();

    await handleCommitAction({
      type: 'commitAction',
      action: 'copyCommitId',
      sha: 'aaa',
      shas: ['aaa', 'bbb', 'ccc'],
      reverseOrder: true
    });

    assert.strictEqual(clipboard.text(), 'ccc\nbbb\naaa');
  });

  it('reverses commit messages when reverseOrder is set', async () => {
    const clipboard = captureClipboard();

    await handleCommitAction({
      type: 'commitAction',
      action: 'copyCommitMessage',
      sha: 'aaa',
      shas: ['aaa', 'bbb'],
      subject: 'First',
      subjects: ['First', 'Second'],
      reverseOrder: true
    });

    assert.strictEqual(clipboard.text(), 'Second\nFirst');
  });

  it('copies only commit IDs from context menu (no duplicate copy actions)', async () => {
    const clipboard = captureClipboard();

    await handleCommitAction({
      type: 'commitAction',
      action: 'copyCommitId',
      sha: 'aaa',
      shas: ['aaa', 'bbb', 'ccc'],
      reverseOrder: true
    });

    assert.strictEqual(clipboard.text(), 'ccc\nbbb\naaa');
  });

  it('has nothing to reverse for a single-commit copy', async () => {
    const clipboard = captureClipboard();

    await handleCommitAction({
      type: 'commitAction',
      action: 'copyCommitId',
      sha: 'aaa',
      reverseOrder: true
    });

    assert.strictEqual(clipboard.text(), 'aaa');
  });
});
