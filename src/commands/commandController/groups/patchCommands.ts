import type { CommandController } from '../index';
import { pickPatchOutputTarget } from '../pickPatchOutputTarget';
import { pickPatchSource } from '../pickPatchSource';
import { readPatchFromFile } from '../readPatchFromFile';
import { applyPatchToWorkingTree } from '../applyPatchToWorkingTree';
import { handleApplyPatch } from '../handleApplyPatch';
import { handleCreatePatchSelectedChanges } from '../handleCreatePatchSelectedChanges';
import { handleRevertSelectedChanges } from '../handleRevertSelectedChanges';

/**
 * Groups the patch command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class PatchCommands {
  public readonly pickPatchOutputTarget: OmitThisParameter<typeof pickPatchOutputTarget>;
  public readonly pickPatchSource: OmitThisParameter<typeof pickPatchSource>;
  public readonly readPatchFromFile: OmitThisParameter<typeof readPatchFromFile>;
  public readonly applyPatchToWorkingTree: OmitThisParameter<typeof applyPatchToWorkingTree>;
  public readonly handleApplyPatch: OmitThisParameter<typeof handleApplyPatch>;
  public readonly handleCreatePatchSelectedChanges: OmitThisParameter<typeof handleCreatePatchSelectedChanges>;
  public readonly handleRevertSelectedChanges: OmitThisParameter<typeof handleRevertSelectedChanges>;

  constructor(controller: CommandController) {
    this.pickPatchOutputTarget = pickPatchOutputTarget.bind(controller);
    this.pickPatchSource = pickPatchSource.bind(controller);
    this.readPatchFromFile = readPatchFromFile.bind(controller);
    this.applyPatchToWorkingTree = applyPatchToWorkingTree.bind(controller);
    this.handleApplyPatch = handleApplyPatch.bind(controller);
    this.handleCreatePatchSelectedChanges = handleCreatePatchSelectedChanges.bind(controller);
    this.handleRevertSelectedChanges = handleRevertSelectedChanges.bind(controller);
  }
}
