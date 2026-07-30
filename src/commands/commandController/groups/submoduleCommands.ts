import type { CommandController } from '../index';
import { handleSubmoduleDeinit } from '../handleSubmoduleDeinit';
import { handleSubmoduleStagePointerChange } from '../handleSubmoduleStagePointerChange';
import { handleSubmoduleDiffPointer } from '../handleSubmoduleDiffPointer';
import { handleSubmodulePullTrackedBranch } from '../handleSubmodulePullTrackedBranch';
import { handleSubmoduleCheckoutRecorded } from '../handleSubmoduleCheckoutRecorded';
import { handleSubmoduleOpenTerminal } from '../handleSubmoduleOpenTerminal';
import { handleSubmoduleOpenInNewWindow } from '../handleSubmoduleOpenInNewWindow';
import { handleSubmoduleOpen } from '../handleSubmoduleOpen';
import { handleSubmoduleSyncAll } from '../handleSubmoduleSyncAll';
import { handleSubmoduleSync } from '../handleSubmoduleSync';
import { handleSubmoduleUpdateRecursive } from '../handleSubmoduleUpdateRecursive';
import { handleSubmoduleUpdateAll } from '../handleSubmoduleUpdateAll';
import { handleSubmoduleUpdate } from '../handleSubmoduleUpdate';
import { handleSubmoduleInitAll } from '../handleSubmoduleInitAll';
import { handleSubmoduleInit } from '../handleSubmoduleInit';
import { handleSubmoduleRefresh } from '../handleSubmoduleRefresh';

/**
 * Groups the submodule command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class SubmoduleCommands {
  public readonly handleSubmoduleDeinit: OmitThisParameter<typeof handleSubmoduleDeinit>;
  public readonly handleSubmoduleStagePointerChange: OmitThisParameter<typeof handleSubmoduleStagePointerChange>;
  public readonly handleSubmoduleDiffPointer: OmitThisParameter<typeof handleSubmoduleDiffPointer>;
  public readonly handleSubmodulePullTrackedBranch: OmitThisParameter<typeof handleSubmodulePullTrackedBranch>;
  public readonly handleSubmoduleCheckoutRecorded: OmitThisParameter<typeof handleSubmoduleCheckoutRecorded>;
  public readonly handleSubmoduleOpenTerminal: OmitThisParameter<typeof handleSubmoduleOpenTerminal>;
  public readonly handleSubmoduleOpenInNewWindow: OmitThisParameter<typeof handleSubmoduleOpenInNewWindow>;
  public readonly handleSubmoduleOpen: OmitThisParameter<typeof handleSubmoduleOpen>;
  public readonly handleSubmoduleSyncAll: OmitThisParameter<typeof handleSubmoduleSyncAll>;
  public readonly handleSubmoduleSync: OmitThisParameter<typeof handleSubmoduleSync>;
  public readonly handleSubmoduleUpdateRecursive: OmitThisParameter<typeof handleSubmoduleUpdateRecursive>;
  public readonly handleSubmoduleUpdateAll: OmitThisParameter<typeof handleSubmoduleUpdateAll>;
  public readonly handleSubmoduleUpdate: OmitThisParameter<typeof handleSubmoduleUpdate>;
  public readonly handleSubmoduleInitAll: OmitThisParameter<typeof handleSubmoduleInitAll>;
  public readonly handleSubmoduleInit: OmitThisParameter<typeof handleSubmoduleInit>;
  public readonly handleSubmoduleRefresh: OmitThisParameter<typeof handleSubmoduleRefresh>;

  constructor(controller: CommandController) {
    this.handleSubmoduleDeinit = handleSubmoduleDeinit.bind(controller);
    this.handleSubmoduleStagePointerChange = handleSubmoduleStagePointerChange.bind(controller);
    this.handleSubmoduleDiffPointer = handleSubmoduleDiffPointer.bind(controller);
    this.handleSubmodulePullTrackedBranch = handleSubmodulePullTrackedBranch.bind(controller);
    this.handleSubmoduleCheckoutRecorded = handleSubmoduleCheckoutRecorded.bind(controller);
    this.handleSubmoduleOpenTerminal = handleSubmoduleOpenTerminal.bind(controller);
    this.handleSubmoduleOpenInNewWindow = handleSubmoduleOpenInNewWindow.bind(controller);
    this.handleSubmoduleOpen = handleSubmoduleOpen.bind(controller);
    this.handleSubmoduleSyncAll = handleSubmoduleSyncAll.bind(controller);
    this.handleSubmoduleSync = handleSubmoduleSync.bind(controller);
    this.handleSubmoduleUpdateRecursive = handleSubmoduleUpdateRecursive.bind(controller);
    this.handleSubmoduleUpdateAll = handleSubmoduleUpdateAll.bind(controller);
    this.handleSubmoduleUpdate = handleSubmoduleUpdate.bind(controller);
    this.handleSubmoduleInitAll = handleSubmoduleInitAll.bind(controller);
    this.handleSubmoduleInit = handleSubmoduleInit.bind(controller);
    this.handleSubmoduleRefresh = handleSubmoduleRefresh.bind(controller);
  }
}
