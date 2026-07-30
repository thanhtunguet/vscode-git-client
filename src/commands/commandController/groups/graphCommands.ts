import type { CommandController } from '../index';
import { asGraphItem } from '../asGraphItem';
import { asGraphFileItem } from '../asGraphFileItem';
import { toGraphCommitShas } from '../toGraphCommitShas';
import { handleGraphLoadMore } from '../handleGraphLoadMore';
import { handleGraphClearFilter } from '../handleGraphClearFilter';
import { handleGraphShowRepositoryAtRevision } from '../handleGraphShowRepositoryAtRevision';
import { handleGraphCreatePatchForRange } from '../handleGraphCreatePatchForRange';
import { handleGraphCreatePatch } from '../handleGraphCreatePatch';
import { handleGraphGoToChildCommit } from '../handleGraphGoToChildCommit';
import { handleGraphGoToParentCommit } from '../handleGraphGoToParentCommit';
import { handleGraphRebaseInteractiveFromHere } from '../handleGraphRebaseInteractiveFromHere';
import { handleGraphCompareWithCurrent } from '../handleGraphCompareWithCurrent';
import { handleGraphRevert } from '../handleGraphRevert';
import { handleGraphCherryPickRange } from '../handleGraphCherryPickRange';
import { handleGraphCreateTagHere } from '../handleGraphCreateTagHere';
import { handleGraphCreateBranchHere } from '../handleGraphCreateBranchHere';
import { handleGraphCheckoutCommit } from '../handleGraphCheckoutCommit';
import { handleGraphOpenRepositoryFileAtRevision } from '../handleGraphOpenRepositoryFileAtRevision';
import { handleGraphCopyCommitMessage } from '../handleGraphCopyCommitMessage';
import { handleGraphCopyCommitId } from '../handleGraphCopyCommitId';
import { handleGraphOpenCommitRangeDetails } from '../handleGraphOpenCommitRangeDetails';
import { handleGraphOpenDetails } from '../handleGraphOpenDetails';
import { handleGraphFilter } from '../handleGraphFilter';
import { pickCommitSha } from '../pickCommitSha';
import { orderShasForCherryPick } from '../orderShasForCherryPick';

/**
 * Groups the graph command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class GraphCommands {
  public readonly asGraphItem: OmitThisParameter<typeof asGraphItem>;
  public readonly asGraphFileItem: OmitThisParameter<typeof asGraphFileItem>;
  public readonly toGraphCommitShas: OmitThisParameter<typeof toGraphCommitShas>;
  public readonly handleGraphLoadMore: OmitThisParameter<typeof handleGraphLoadMore>;
  public readonly handleGraphClearFilter: OmitThisParameter<typeof handleGraphClearFilter>;
  public readonly handleGraphShowRepositoryAtRevision: OmitThisParameter<typeof handleGraphShowRepositoryAtRevision>;
  public readonly handleGraphCreatePatchForRange: OmitThisParameter<typeof handleGraphCreatePatchForRange>;
  public readonly handleGraphCreatePatch: OmitThisParameter<typeof handleGraphCreatePatch>;
  public readonly handleGraphGoToChildCommit: OmitThisParameter<typeof handleGraphGoToChildCommit>;
  public readonly handleGraphGoToParentCommit: OmitThisParameter<typeof handleGraphGoToParentCommit>;
  public readonly handleGraphRebaseInteractiveFromHere: OmitThisParameter<typeof handleGraphRebaseInteractiveFromHere>;
  public readonly handleGraphCompareWithCurrent: OmitThisParameter<typeof handleGraphCompareWithCurrent>;
  public readonly handleGraphRevert: OmitThisParameter<typeof handleGraphRevert>;
  public readonly handleGraphCherryPickRange: OmitThisParameter<typeof handleGraphCherryPickRange>;
  public readonly handleGraphCreateTagHere: OmitThisParameter<typeof handleGraphCreateTagHere>;
  public readonly handleGraphCreateBranchHere: OmitThisParameter<typeof handleGraphCreateBranchHere>;
  public readonly handleGraphCheckoutCommit: OmitThisParameter<typeof handleGraphCheckoutCommit>;
  public readonly handleGraphOpenRepositoryFileAtRevision: OmitThisParameter<typeof handleGraphOpenRepositoryFileAtRevision>;
  public readonly handleGraphCopyCommitMessage: OmitThisParameter<typeof handleGraphCopyCommitMessage>;
  public readonly handleGraphCopyCommitId: OmitThisParameter<typeof handleGraphCopyCommitId>;
  public readonly handleGraphOpenCommitRangeDetails: OmitThisParameter<typeof handleGraphOpenCommitRangeDetails>;
  public readonly handleGraphOpenDetails: OmitThisParameter<typeof handleGraphOpenDetails>;
  public readonly handleGraphFilter: OmitThisParameter<typeof handleGraphFilter>;
  public readonly pickCommitSha: OmitThisParameter<typeof pickCommitSha>;
  public readonly orderShasForCherryPick: OmitThisParameter<typeof orderShasForCherryPick>;

  constructor(controller: CommandController) {
    this.asGraphItem = asGraphItem.bind(controller);
    this.asGraphFileItem = asGraphFileItem.bind(controller);
    this.toGraphCommitShas = toGraphCommitShas.bind(controller);
    this.handleGraphLoadMore = handleGraphLoadMore.bind(controller);
    this.handleGraphClearFilter = handleGraphClearFilter.bind(controller);
    this.handleGraphShowRepositoryAtRevision = handleGraphShowRepositoryAtRevision.bind(controller);
    this.handleGraphCreatePatchForRange = handleGraphCreatePatchForRange.bind(controller);
    this.handleGraphCreatePatch = handleGraphCreatePatch.bind(controller);
    this.handleGraphGoToChildCommit = handleGraphGoToChildCommit.bind(controller);
    this.handleGraphGoToParentCommit = handleGraphGoToParentCommit.bind(controller);
    this.handleGraphRebaseInteractiveFromHere = handleGraphRebaseInteractiveFromHere.bind(controller);
    this.handleGraphCompareWithCurrent = handleGraphCompareWithCurrent.bind(controller);
    this.handleGraphRevert = handleGraphRevert.bind(controller);
    this.handleGraphCherryPickRange = handleGraphCherryPickRange.bind(controller);
    this.handleGraphCreateTagHere = handleGraphCreateTagHere.bind(controller);
    this.handleGraphCreateBranchHere = handleGraphCreateBranchHere.bind(controller);
    this.handleGraphCheckoutCommit = handleGraphCheckoutCommit.bind(controller);
    this.handleGraphOpenRepositoryFileAtRevision = handleGraphOpenRepositoryFileAtRevision.bind(controller);
    this.handleGraphCopyCommitMessage = handleGraphCopyCommitMessage.bind(controller);
    this.handleGraphCopyCommitId = handleGraphCopyCommitId.bind(controller);
    this.handleGraphOpenCommitRangeDetails = handleGraphOpenCommitRangeDetails.bind(controller);
    this.handleGraphOpenDetails = handleGraphOpenDetails.bind(controller);
    this.handleGraphFilter = handleGraphFilter.bind(controller);
    this.pickCommitSha = pickCommitSha.bind(controller);
    this.orderShasForCherryPick = orderShasForCherryPick.bind(controller);
  }
}
