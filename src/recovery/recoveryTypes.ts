import { CommitFileChange } from '../types';

export type ReflogAction = 'reset' | 'rebase' | 'checkout' | 'commit' | 'branch' | 'unknown';

export interface RecoveryReflogEntry {
  readonly refName: string;
  readonly selector: string;
  readonly index: number;
  readonly newOid: string;
  readonly previousOid?: string;
  readonly action: ReflogAction;
  readonly message: string;
  readonly timestamp: number;
  readonly suggestedRecoveryOid?: string;
  readonly confidence: 'high' | 'medium' | 'low';
}

export type RecoverySnapshotFileChange = CommitFileChange;
