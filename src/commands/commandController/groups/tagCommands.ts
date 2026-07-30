import type { CommandController } from '../index';
import { asTagItem } from '../asTagItem';
import { toTagRef } from '../toTagRef';
import { toTagRevision } from '../toTagRevision';
import { handleTagCreateCurrent } from '../handleTagCreateCurrent';
import { handleTagCreatePatch } from '../handleTagCreatePatch';
import { handleTagCompareWithCurrent } from '../handleTagCompareWithCurrent';
import { handleTagShowRepositoryAtRevision } from '../handleTagShowRepositoryAtRevision';
import { handleTagCopyRevisionNumber } from '../handleTagCopyRevisionNumber';
import { handleTagCheckout } from '../handleTagCheckout';
import { handleTagCheckoutNewBranch } from '../handleTagCheckoutNewBranch';
import { handleTagOpenCommits } from '../handleTagOpenCommits';

/**
 * Groups the tag command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class TagCommands {
  public readonly asTagItem: OmitThisParameter<typeof asTagItem>;
  public readonly toTagRef: OmitThisParameter<typeof toTagRef>;
  public readonly toTagRevision: OmitThisParameter<typeof toTagRevision>;
  public readonly handleTagCreateCurrent: OmitThisParameter<typeof handleTagCreateCurrent>;
  public readonly handleTagCreatePatch: OmitThisParameter<typeof handleTagCreatePatch>;
  public readonly handleTagCompareWithCurrent: OmitThisParameter<typeof handleTagCompareWithCurrent>;
  public readonly handleTagShowRepositoryAtRevision: OmitThisParameter<typeof handleTagShowRepositoryAtRevision>;
  public readonly handleTagCopyRevisionNumber: OmitThisParameter<typeof handleTagCopyRevisionNumber>;
  public readonly handleTagCheckout: OmitThisParameter<typeof handleTagCheckout>;
  public readonly handleTagCheckoutNewBranch: OmitThisParameter<typeof handleTagCheckoutNewBranch>;
  public readonly handleTagOpenCommits: OmitThisParameter<typeof handleTagOpenCommits>;

  constructor(controller: CommandController) {
    this.asTagItem = asTagItem.bind(controller);
    this.toTagRef = toTagRef.bind(controller);
    this.toTagRevision = toTagRevision.bind(controller);
    this.handleTagCreateCurrent = handleTagCreateCurrent.bind(controller);
    this.handleTagCreatePatch = handleTagCreatePatch.bind(controller);
    this.handleTagCompareWithCurrent = handleTagCompareWithCurrent.bind(controller);
    this.handleTagShowRepositoryAtRevision = handleTagShowRepositoryAtRevision.bind(controller);
    this.handleTagCopyRevisionNumber = handleTagCopyRevisionNumber.bind(controller);
    this.handleTagCheckout = handleTagCheckout.bind(controller);
    this.handleTagCheckoutNewBranch = handleTagCheckoutNewBranch.bind(controller);
    this.handleTagOpenCommits = handleTagOpenCommits.bind(controller);
  }
}
