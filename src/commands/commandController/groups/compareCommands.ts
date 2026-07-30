import type { CommandController } from '../index';
import { openDiffWorkflow } from '../openDiffWorkflow';
import { openCompareWorkflow } from '../openCompareWorkflow';
import { openDirectoryTimeline } from '../openDirectoryTimeline';
import { handleDiffOpen } from '../handleDiffOpen';
import { handleCompareOpen } from '../handleCompareOpen';
import { handleCompareWithRevision } from '../handleCompareWithRevision';
import { handleDirectoryTimelineOpen } from '../handleDirectoryTimelineOpen';

/**
 * Groups the compare command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class CompareCommands {
  public readonly openDiffWorkflow: OmitThisParameter<typeof openDiffWorkflow>;
  public readonly openCompareWorkflow: OmitThisParameter<typeof openCompareWorkflow>;
  public readonly openDirectoryTimeline: OmitThisParameter<typeof openDirectoryTimeline>;
  public readonly handleDiffOpen: OmitThisParameter<typeof handleDiffOpen>;
  public readonly handleCompareOpen: OmitThisParameter<typeof handleCompareOpen>;
  public readonly handleCompareWithRevision: OmitThisParameter<typeof handleCompareWithRevision>;
  public readonly handleDirectoryTimelineOpen: OmitThisParameter<typeof handleDirectoryTimelineOpen>;

  constructor(controller: CommandController) {
    this.openDiffWorkflow = openDiffWorkflow.bind(controller);
    this.openCompareWorkflow = openCompareWorkflow.bind(controller);
    this.openDirectoryTimeline = openDirectoryTimeline.bind(controller);
    this.handleDiffOpen = handleDiffOpen.bind(controller);
    this.handleCompareOpen = handleCompareOpen.bind(controller);
    this.handleCompareWithRevision = handleCompareWithRevision.bind(controller);
    this.handleDirectoryTimelineOpen = handleDirectoryTimelineOpen.bind(controller);
  }
}
