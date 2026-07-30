import type { CommandController } from '../index';
import { asStashItem } from '../asStashItem';
import { pickStashRef } from '../pickStashRef';
import { handleStashCreate } from '../handleStashCreate';
import { handleStashApplyPop } from '../handleStashApplyPop';
import { handleStashPreviewPatch } from '../handleStashPreviewPatch';
import { handleStashRename } from '../handleStashRename';
import { handleStashDrop } from '../handleStashDrop';
import { handleStashPop } from '../handleStashPop';
import { handleStashApply } from '../handleStashApply';
import { handleStashUnshelve } from '../handleStashUnshelve';
import { handleShelveResource } from '../handleShelveResource';

/**
 * Groups the stash command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class StashCommands {
  public readonly asStashItem: OmitThisParameter<typeof asStashItem>;
  public readonly pickStashRef: OmitThisParameter<typeof pickStashRef>;
  public readonly handleStashCreate: OmitThisParameter<typeof handleStashCreate>;
  public readonly handleStashApplyPop: OmitThisParameter<typeof handleStashApplyPop>;
  public readonly handleStashPreviewPatch: OmitThisParameter<typeof handleStashPreviewPatch>;
  public readonly handleStashRename: OmitThisParameter<typeof handleStashRename>;
  public readonly handleStashDrop: OmitThisParameter<typeof handleStashDrop>;
  public readonly handleStashPop: OmitThisParameter<typeof handleStashPop>;
  public readonly handleStashApply: OmitThisParameter<typeof handleStashApply>;
  public readonly handleStashUnshelve: OmitThisParameter<typeof handleStashUnshelve>;
  public readonly handleShelveResource: OmitThisParameter<typeof handleShelveResource>;

  constructor(controller: CommandController) {
    this.asStashItem = asStashItem.bind(controller);
    this.pickStashRef = pickStashRef.bind(controller);
    this.handleStashCreate = handleStashCreate.bind(controller);
    this.handleStashApplyPop = handleStashApplyPop.bind(controller);
    this.handleStashPreviewPatch = handleStashPreviewPatch.bind(controller);
    this.handleStashRename = handleStashRename.bind(controller);
    this.handleStashDrop = handleStashDrop.bind(controller);
    this.handleStashPop = handleStashPop.bind(controller);
    this.handleStashApply = handleStashApply.bind(controller);
    this.handleStashUnshelve = handleStashUnshelve.bind(controller);
    this.handleShelveResource = handleShelveResource.bind(controller);
  }
}
