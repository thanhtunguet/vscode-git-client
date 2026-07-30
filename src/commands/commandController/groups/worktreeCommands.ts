import type { CommandController } from '../index';
import { pickWorktreeRevision } from '../pickWorktreeRevision';
import { pickWorktreeTargetPath } from '../pickWorktreeTargetPath';
import { handleWorktreeOpenTerminal } from '../handleWorktreeOpenTerminal';
import { handleWorktreeRevealInFinder } from '../handleWorktreeRevealInFinder';
import { handleWorktreePrune } from '../handleWorktreePrune';
import { handleWorktreePrunePreview } from '../handleWorktreePrunePreview';
import { handleWorktreeUnlock } from '../handleWorktreeUnlock';
import { handleWorktreeLock } from '../handleWorktreeLock';
import { handleWorktreeRemoveForce } from '../handleWorktreeRemoveForce';
import { handleWorktreeRemove } from '../handleWorktreeRemove';
import { handleWorktreeAddDetached } from '../handleWorktreeAddDetached';
import { handleWorktreeAddNewBranch } from '../handleWorktreeAddNewBranch';
import { handleWorktreeAddFromBranch } from '../handleWorktreeAddFromBranch';
import { handleWorktreeOpenInNewWindow } from '../handleWorktreeOpenInNewWindow';
import { handleWorktreeOpen } from '../handleWorktreeOpen';
import { handleWorktreeRefresh } from '../handleWorktreeRefresh';

/**
 * Groups the worktree command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class WorktreeCommands {
  public readonly pickWorktreeRevision: OmitThisParameter<typeof pickWorktreeRevision>;
  public readonly pickWorktreeTargetPath: OmitThisParameter<typeof pickWorktreeTargetPath>;
  public readonly handleWorktreeOpenTerminal: OmitThisParameter<typeof handleWorktreeOpenTerminal>;
  public readonly handleWorktreeRevealInFinder: OmitThisParameter<typeof handleWorktreeRevealInFinder>;
  public readonly handleWorktreePrune: OmitThisParameter<typeof handleWorktreePrune>;
  public readonly handleWorktreePrunePreview: OmitThisParameter<typeof handleWorktreePrunePreview>;
  public readonly handleWorktreeUnlock: OmitThisParameter<typeof handleWorktreeUnlock>;
  public readonly handleWorktreeLock: OmitThisParameter<typeof handleWorktreeLock>;
  public readonly handleWorktreeRemoveForce: OmitThisParameter<typeof handleWorktreeRemoveForce>;
  public readonly handleWorktreeRemove: OmitThisParameter<typeof handleWorktreeRemove>;
  public readonly handleWorktreeAddDetached: OmitThisParameter<typeof handleWorktreeAddDetached>;
  public readonly handleWorktreeAddNewBranch: OmitThisParameter<typeof handleWorktreeAddNewBranch>;
  public readonly handleWorktreeAddFromBranch: OmitThisParameter<typeof handleWorktreeAddFromBranch>;
  public readonly handleWorktreeOpenInNewWindow: OmitThisParameter<typeof handleWorktreeOpenInNewWindow>;
  public readonly handleWorktreeOpen: OmitThisParameter<typeof handleWorktreeOpen>;
  public readonly handleWorktreeRefresh: OmitThisParameter<typeof handleWorktreeRefresh>;

  constructor(controller: CommandController) {
    this.pickWorktreeRevision = pickWorktreeRevision.bind(controller);
    this.pickWorktreeTargetPath = pickWorktreeTargetPath.bind(controller);
    this.handleWorktreeOpenTerminal = handleWorktreeOpenTerminal.bind(controller);
    this.handleWorktreeRevealInFinder = handleWorktreeRevealInFinder.bind(controller);
    this.handleWorktreePrune = handleWorktreePrune.bind(controller);
    this.handleWorktreePrunePreview = handleWorktreePrunePreview.bind(controller);
    this.handleWorktreeUnlock = handleWorktreeUnlock.bind(controller);
    this.handleWorktreeLock = handleWorktreeLock.bind(controller);
    this.handleWorktreeRemoveForce = handleWorktreeRemoveForce.bind(controller);
    this.handleWorktreeRemove = handleWorktreeRemove.bind(controller);
    this.handleWorktreeAddDetached = handleWorktreeAddDetached.bind(controller);
    this.handleWorktreeAddNewBranch = handleWorktreeAddNewBranch.bind(controller);
    this.handleWorktreeAddFromBranch = handleWorktreeAddFromBranch.bind(controller);
    this.handleWorktreeOpenInNewWindow = handleWorktreeOpenInNewWindow.bind(controller);
    this.handleWorktreeOpen = handleWorktreeOpen.bind(controller);
    this.handleWorktreeRefresh = handleWorktreeRefresh.bind(controller);
  }
}
