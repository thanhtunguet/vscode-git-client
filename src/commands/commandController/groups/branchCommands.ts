import type { CommandController } from '../index';
import { openBranchCommits } from '../openBranchCommits';
import { openBranchActionHub } from '../openBranchActionHub';
import { normalizeBranchActionHubArg } from '../normalizeBranchActionHubArg';
import { resolveBranchNameForActionHub } from '../resolveBranchNameForActionHub';
import { pickBranchName } from '../pickBranchName';
import { asBranchItem } from '../asBranchItem';
import { asBranchRemoteItem } from '../asBranchRemoteItem';
import { toBranchName } from '../toBranchName';
import { handleBranchCheckout } from '../handleBranchCheckout';
import { handleBranchCreate } from '../handleBranchCreate';
import { handleBranchDelete } from '../handleBranchDelete';
import { handleBranchRename } from '../handleBranchRename';
import { handleBranchTrack } from '../handleBranchTrack';
import { handleBranchUntrack } from '../handleBranchUntrack';
import { handleBranchSearch } from '../handleBranchSearch';
import { handleBranchSearchRefresh } from '../handleBranchSearchRefresh';
import { handleBranchOpenCommits } from '../handleBranchOpenCommits';
import { handleBranchActionHub } from '../handleBranchActionHub';
import { handleBranchCompareWithCurrent } from '../handleBranchCompareWithCurrent';
import { handleBranchRebaseOnto } from '../handleBranchRebaseOnto';
import { handleBranchMergeIntoCurrent } from '../handleBranchMergeIntoCurrent';
import { handleResetCurrentToCommit } from '../handleResetCurrentToCommit';

/**
 * Groups the branch command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class BranchCommands {
  public readonly openBranchCommits: OmitThisParameter<typeof openBranchCommits>;
  public readonly openBranchActionHub: OmitThisParameter<typeof openBranchActionHub>;
  public readonly normalizeBranchActionHubArg: OmitThisParameter<typeof normalizeBranchActionHubArg>;
  public readonly resolveBranchNameForActionHub: OmitThisParameter<typeof resolveBranchNameForActionHub>;
  public readonly pickBranchName: OmitThisParameter<typeof pickBranchName>;
  public readonly asBranchItem: OmitThisParameter<typeof asBranchItem>;
  public readonly asBranchRemoteItem: OmitThisParameter<typeof asBranchRemoteItem>;
  public readonly toBranchName: OmitThisParameter<typeof toBranchName>;
  public readonly handleBranchCheckout: OmitThisParameter<typeof handleBranchCheckout>;
  public readonly handleBranchCreate: OmitThisParameter<typeof handleBranchCreate>;
  public readonly handleBranchDelete: OmitThisParameter<typeof handleBranchDelete>;
  public readonly handleBranchRename: OmitThisParameter<typeof handleBranchRename>;
  public readonly handleBranchTrack: OmitThisParameter<typeof handleBranchTrack>;
  public readonly handleBranchUntrack: OmitThisParameter<typeof handleBranchUntrack>;
  public readonly handleBranchSearch: OmitThisParameter<typeof handleBranchSearch>;
  public readonly handleBranchSearchRefresh: OmitThisParameter<typeof handleBranchSearchRefresh>;
  public readonly handleBranchOpenCommits: OmitThisParameter<typeof handleBranchOpenCommits>;
  public readonly handleBranchActionHub: OmitThisParameter<typeof handleBranchActionHub>;
  public readonly handleBranchCompareWithCurrent: OmitThisParameter<typeof handleBranchCompareWithCurrent>;
  public readonly handleBranchRebaseOnto: OmitThisParameter<typeof handleBranchRebaseOnto>;
  public readonly handleBranchMergeIntoCurrent: OmitThisParameter<typeof handleBranchMergeIntoCurrent>;
  public readonly handleResetCurrentToCommit: OmitThisParameter<typeof handleResetCurrentToCommit>;

  constructor(controller: CommandController) {
    this.openBranchCommits = openBranchCommits.bind(controller);
    this.openBranchActionHub = openBranchActionHub.bind(controller);
    this.normalizeBranchActionHubArg = normalizeBranchActionHubArg.bind(controller);
    this.resolveBranchNameForActionHub = resolveBranchNameForActionHub.bind(controller);
    this.pickBranchName = pickBranchName.bind(controller);
    this.asBranchItem = asBranchItem.bind(controller);
    this.asBranchRemoteItem = asBranchRemoteItem.bind(controller);
    this.toBranchName = toBranchName.bind(controller);
    this.handleBranchCheckout = handleBranchCheckout.bind(controller);
    this.handleBranchCreate = handleBranchCreate.bind(controller);
    this.handleBranchDelete = handleBranchDelete.bind(controller);
    this.handleBranchRename = handleBranchRename.bind(controller);
    this.handleBranchTrack = handleBranchTrack.bind(controller);
    this.handleBranchUntrack = handleBranchUntrack.bind(controller);
    this.handleBranchSearch = handleBranchSearch.bind(controller);
    this.handleBranchSearchRefresh = handleBranchSearchRefresh.bind(controller);
    this.handleBranchOpenCommits = handleBranchOpenCommits.bind(controller);
    this.handleBranchActionHub = handleBranchActionHub.bind(controller);
    this.handleBranchCompareWithCurrent = handleBranchCompareWithCurrent.bind(controller);
    this.handleBranchRebaseOnto = handleBranchRebaseOnto.bind(controller);
    this.handleBranchMergeIntoCurrent = handleBranchMergeIntoCurrent.bind(controller);
    this.handleResetCurrentToCommit = handleResetCurrentToCommit.bind(controller);
  }
}
