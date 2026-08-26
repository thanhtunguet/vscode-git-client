import * as assert from 'assert';
import { describe, it } from 'node:test';
import {
  parseReflogEntries,
  REFERENCE_LOG_FIELD_SEPARATOR,
  REFERENCE_LOG_RECORD_SEPARATOR
} from '../recovery/reflogParser';

function makeRecord(parts: { selectorFull: string; oid: string; message: string }): string {
  return [parts.selectorFull, parts.oid, parts.message].join(REFERENCE_LOG_FIELD_SEPARATOR);
}

describe('reflogParser', () => {
  it('uses previous OID as suggested recovery point for reset entries', () => {
    const raw =
      makeRecord({
        selectorFull: 'HEAD@{1700000000}',
        oid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        message: 'reset: moving to HEAD~1'
      }) +
      REFERENCE_LOG_RECORD_SEPARATOR +
      makeRecord({
        selectorFull: 'HEAD@{1699999900}',
        oid: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        message: 'commit: add feature'
      }) +
      REFERENCE_LOG_RECORD_SEPARATOR;

    const entries = parseReflogEntries(raw);
    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0]?.action, 'reset');
    assert.strictEqual(entries[0]?.previousOid, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    assert.strictEqual(
      entries[0]?.suggestedRecoveryOid,
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    );
    assert.strictEqual(entries[0]?.confidence, 'high');
    assert.strictEqual(entries[0]?.selector, 'HEAD@{0}');
    assert.strictEqual(entries[0]?.timestamp, 1700000000 * 1000);
  });

  it('uses current OID as suggested recovery point for non-reset entries', () => {
    const raw =
      makeRecord({
        selectorFull: 'HEAD@{1700000100}',
        oid: 'cccccccccccccccccccccccccccccccccccccccc',
        message: 'commit: refine parser'
      }) + REFERENCE_LOG_RECORD_SEPARATOR;

    const entries = parseReflogEntries(raw);
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0]?.action, 'commit');
    assert.strictEqual(
      entries[0]?.suggestedRecoveryOid,
      'cccccccccccccccccccccccccccccccccccccccc'
    );
    assert.strictEqual(entries[0]?.confidence, 'medium');
  });

  it('uses the previous OID only for rebase start and keeps later rebase steps preview-only', () => {
    const raw =
      makeRecord({
        selectorFull: 'HEAD@{1700000300}',
        oid: '1111111111111111111111111111111111111111',
        message: 'rebase (finish): returning to refs/heads/main'
      }) +
      REFERENCE_LOG_RECORD_SEPARATOR +
      makeRecord({
        selectorFull: 'HEAD@{1700000200}',
        oid: '2222222222222222222222222222222222222222',
        message: 'rebase (pick): add feature'
      }) +
      REFERENCE_LOG_RECORD_SEPARATOR +
      makeRecord({
        selectorFull: 'HEAD@{1700000100}',
        oid: '3333333333333333333333333333333333333333',
        message: 'rebase (start): checkout main~2'
      }) +
      REFERENCE_LOG_RECORD_SEPARATOR +
      makeRecord({
        selectorFull: 'HEAD@{1700000000}',
        oid: '4444444444444444444444444444444444444444',
        message: 'commit: original tip'
      }) +
      REFERENCE_LOG_RECORD_SEPARATOR;

    const entries = parseReflogEntries(raw);
    assert.strictEqual(entries[0]?.suggestedRecoveryOid, undefined);
    assert.strictEqual(entries[0]?.confidence, 'low');
    assert.strictEqual(entries[1]?.suggestedRecoveryOid, undefined);
    assert.strictEqual(
      entries[2]?.suggestedRecoveryOid,
      '4444444444444444444444444444444444444444'
    );
    assert.strictEqual(entries[2]?.confidence, 'high');
  });

  it('matches previous OIDs within the same ref when --all output is interleaved', () => {
    const raw =
      makeRecord({
        selectorFull: 'HEAD@{1700000300}',
        oid: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        message: 'reset: moving to HEAD~1'
      }) +
      REFERENCE_LOG_RECORD_SEPARATOR +
      makeRecord({
        selectorFull: 'refs/heads/topic@{1700000250}',
        oid: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        message: 'commit: topic change'
      }) +
      REFERENCE_LOG_RECORD_SEPARATOR +
      makeRecord({
        selectorFull: 'HEAD@{1700000200}',
        oid: 'cccccccccccccccccccccccccccccccccccccccc',
        message: 'commit: old head'
      }) +
      REFERENCE_LOG_RECORD_SEPARATOR;

    const entries = parseReflogEntries(raw);
    assert.strictEqual(entries[0]?.previousOid, 'cccccccccccccccccccccccccccccccccccccccc');
    assert.strictEqual(entries[1]?.selector, 'refs/heads/topic@{0}');
    assert.strictEqual(entries[2]?.selector, 'HEAD@{1}');
  });
});
