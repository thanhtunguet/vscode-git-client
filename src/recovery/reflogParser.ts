import { RecoveryReflogEntry, ReflogAction } from './recoveryTypes';

const FIELD_SEPARATOR = '\u001f';
const RECORD_SEPARATOR = '\u001e';

interface ParsedRawReflogRecord {
  readonly selectorFull: string;
  readonly refName: string;
  readonly newOid: string;
  readonly message: string;
  readonly timestamp: number;
}

function classifyReflogAction(message: string): ReflogAction {
  const normalized = message.trim().toLowerCase();
  if (normalized.startsWith('reset:')) {
    return 'reset';
  }
  if (normalized.startsWith('rebase')) {
    return 'rebase';
  }
  if (normalized.startsWith('checkout:')) {
    return 'checkout';
  }
  if (normalized.startsWith('commit')) {
    return 'commit';
  }
  if (normalized.startsWith('branch:')) {
    return 'branch';
  }
  return 'unknown';
}

function parseDatedSelector(selectorFull: string): { refName: string; timestamp: number } {
  const marker = selectorFull.lastIndexOf('@{');
  const refName = marker >= 0 ? selectorFull.slice(0, marker) : selectorFull;
  const seconds = marker >= 0 ? Number(selectorFull.slice(marker + 2, -1).split(' ')[0]) : 0;
  return {
    refName,
    timestamp: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0
  };
}

function parseRawRecords(stdout: string): ParsedRawReflogRecord[] {
  return stdout
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [selectorFull, newOid, message] = record.split(FIELD_SEPARATOR);
      const selector = parseDatedSelector(selectorFull ?? '');
      return {
        selectorFull: selectorFull ?? '',
        refName: selector.refName,
        newOid: newOid ?? '',
        message: message ?? '',
        timestamp: selector.timestamp
      };
    })
    .filter((record) => Boolean(record.selectorFull && record.newOid));
}

export function parseReflogEntries(stdout: string): RecoveryReflogEntry[] {
  const records = parseRawRecords(stdout);
  const entries: RecoveryReflogEntry[] = [];
  const olderOidByRef = new Map<string, string>();
  const previousOidByRecord = new Map<number, string>();
  const reflogIndexByRef = new Map<string, number>();

  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (!record) {
      continue;
    }
    const olderOid = olderOidByRef.get(record.refName);
    if (olderOid) {
      previousOidByRecord.set(index, olderOid);
    }
    olderOidByRef.set(record.refName, record.newOid.trim());
  }

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) {
      continue;
    }

    const action = classifyReflogAction(record.message);
    const previousOid = previousOidByRecord.get(index);
    const normalizedMessage = record.message.trim().toLowerCase();
    const isRebaseStart =
      /^rebase(?: -i)? \(start\):/.test(normalizedMessage) ||
      normalizedMessage.startsWith('rebase: checkout');
    const isUnsafeRebaseStep = action === 'rebase' && !isRebaseStart;
    const refIndex = reflogIndexByRef.get(record.refName) ?? 0;
    reflogIndexByRef.set(record.refName, refIndex + 1);

    let suggestedRecoveryOid: string | undefined;
    let confidence: RecoveryReflogEntry['confidence'] = 'low';
    if (action === 'reset' || isRebaseStart) {
      suggestedRecoveryOid = previousOid;
      confidence = previousOid ? 'high' : 'low';
    } else if (!isUnsafeRebaseStep && action !== 'unknown') {
      suggestedRecoveryOid = record.newOid.trim();
      confidence = 'medium';
    }

    entries.push({
      refName: record.refName,
      selector: `${record.refName}@{${refIndex}}`,
      index: refIndex,
      newOid: record.newOid.trim(),
      previousOid,
      action,
      message: record.message,
      timestamp: record.timestamp,
      suggestedRecoveryOid,
      confidence
    });
  }

  return entries;
}

export const REFERENCE_LOG_FIELD_SEPARATOR = FIELD_SEPARATOR;
export const REFERENCE_LOG_RECORD_SEPARATOR = RECORD_SEPARATOR;
