import type { CommandController } from '../index';
import { classifyCherryPickIssue } from '../classifyCherryPickIssue';
import { classifyMergeIssue } from '../classifyMergeIssue';
import { classifyRebaseIssue } from '../classifyRebaseIssue';
import { startMergeOperation } from '../startMergeOperation';
import { startRebaseOperation } from '../startRebaseOperation';
import { handleRebaseConflict } from '../handleRebaseConflict';
import { handleOperationConflict } from '../handleOperationConflict';
import { showRebaseProgressFeedback } from '../showRebaseProgressFeedback';
import { openOperationConflictEditors } from '../openOperationConflictEditors';
import { handleOperationAbort } from '../handleOperationAbort';
import { handleOperationContinue } from '../handleOperationContinue';
import { handleOperationSkip } from '../handleOperationSkip';
import { handleMergeFinalize } from '../handleMergeFinalize';
import { handleMergePrevious } from '../handleMergePrevious';
import { handleMergeNext } from '../handleMergeNext';
import { handleMergeOpenConflict } from '../handleMergeOpenConflict';
import { handleConflictResolve } from '../handleConflictResolve';
import { handleConflictAcceptBoth } from '../handleConflictAcceptBoth';
import { handleConflictAcceptTheirs } from '../handleConflictAcceptTheirs';
import { handleConflictAcceptOurs } from '../handleConflictAcceptOurs';
import { pickConflictPath } from '../pickConflictPath';
import { pickConflictPathArg } from '../pickConflictPathArg';
import { handleCherryPick } from '../handleCherryPick';
import { handleCherryPickSelectedChanges } from '../handleCherryPickSelectedChanges';

/**
 * Groups the operations command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class OperationsCommands {
  public readonly classifyCherryPickIssue: OmitThisParameter<typeof classifyCherryPickIssue>;
  public readonly classifyMergeIssue: OmitThisParameter<typeof classifyMergeIssue>;
  public readonly classifyRebaseIssue: OmitThisParameter<typeof classifyRebaseIssue>;
  public readonly startMergeOperation: OmitThisParameter<typeof startMergeOperation>;
  public readonly startRebaseOperation: OmitThisParameter<typeof startRebaseOperation>;
  public readonly handleRebaseConflict: OmitThisParameter<typeof handleRebaseConflict>;
  public readonly handleOperationConflict: OmitThisParameter<typeof handleOperationConflict>;
  public readonly showRebaseProgressFeedback: OmitThisParameter<typeof showRebaseProgressFeedback>;
  public readonly openOperationConflictEditors: OmitThisParameter<typeof openOperationConflictEditors>;
  public readonly handleOperationAbort: OmitThisParameter<typeof handleOperationAbort>;
  public readonly handleOperationContinue: OmitThisParameter<typeof handleOperationContinue>;
  public readonly handleOperationSkip: OmitThisParameter<typeof handleOperationSkip>;
  public readonly handleMergeFinalize: OmitThisParameter<typeof handleMergeFinalize>;
  public readonly handleMergePrevious: OmitThisParameter<typeof handleMergePrevious>;
  public readonly handleMergeNext: OmitThisParameter<typeof handleMergeNext>;
  public readonly handleMergeOpenConflict: OmitThisParameter<typeof handleMergeOpenConflict>;
  public readonly handleConflictResolve: OmitThisParameter<typeof handleConflictResolve>;
  public readonly handleConflictAcceptBoth: OmitThisParameter<typeof handleConflictAcceptBoth>;
  public readonly handleConflictAcceptTheirs: OmitThisParameter<typeof handleConflictAcceptTheirs>;
  public readonly handleConflictAcceptOurs: OmitThisParameter<typeof handleConflictAcceptOurs>;
  public readonly pickConflictPath: OmitThisParameter<typeof pickConflictPath>;
  public readonly pickConflictPathArg: OmitThisParameter<typeof pickConflictPathArg>;
  public readonly handleCherryPick: OmitThisParameter<typeof handleCherryPick>;
  public readonly handleCherryPickSelectedChanges: OmitThisParameter<typeof handleCherryPickSelectedChanges>;

  constructor(controller: CommandController) {
    this.classifyCherryPickIssue = classifyCherryPickIssue.bind(controller);
    this.classifyMergeIssue = classifyMergeIssue.bind(controller);
    this.classifyRebaseIssue = classifyRebaseIssue.bind(controller);
    this.startMergeOperation = startMergeOperation.bind(controller);
    this.startRebaseOperation = startRebaseOperation.bind(controller);
    this.handleRebaseConflict = handleRebaseConflict.bind(controller);
    this.handleOperationConflict = handleOperationConflict.bind(controller);
    this.showRebaseProgressFeedback = showRebaseProgressFeedback.bind(controller);
    this.openOperationConflictEditors = openOperationConflictEditors.bind(controller);
    this.handleOperationAbort = handleOperationAbort.bind(controller);
    this.handleOperationContinue = handleOperationContinue.bind(controller);
    this.handleOperationSkip = handleOperationSkip.bind(controller);
    this.handleMergeFinalize = handleMergeFinalize.bind(controller);
    this.handleMergePrevious = handleMergePrevious.bind(controller);
    this.handleMergeNext = handleMergeNext.bind(controller);
    this.handleMergeOpenConflict = handleMergeOpenConflict.bind(controller);
    this.handleConflictResolve = handleConflictResolve.bind(controller);
    this.handleConflictAcceptBoth = handleConflictAcceptBoth.bind(controller);
    this.handleConflictAcceptTheirs = handleConflictAcceptTheirs.bind(controller);
    this.handleConflictAcceptOurs = handleConflictAcceptOurs.bind(controller);
    this.pickConflictPath = pickConflictPath.bind(controller);
    this.pickConflictPathArg = pickConflictPathArg.bind(controller);
    this.handleCherryPick = handleCherryPick.bind(controller);
    this.handleCherryPickSelectedChanges = handleCherryPickSelectedChanges.bind(controller);
  }
}
