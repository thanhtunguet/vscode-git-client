import type { CommandController } from '../index';
import { handleStageFile } from '../handleStageFile';
import { handleUnstageFile } from '../handleUnstageFile';
import { handleStagePatch } from '../handleStagePatch';
import { handleCommitTemplate } from '../handleCommitTemplate';
import { handleGenerateCommitMessage } from '../handleGenerateCommitMessage';
import { handleScmAmendFromInput } from '../handleScmAmendFromInput';

/**
 * Groups the staging command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class StagingCommands {
  public readonly handleStageFile: OmitThisParameter<typeof handleStageFile>;
  public readonly handleUnstageFile: OmitThisParameter<typeof handleUnstageFile>;
  public readonly handleStagePatch: OmitThisParameter<typeof handleStagePatch>;
  public readonly handleCommitTemplate: OmitThisParameter<typeof handleCommitTemplate>;
  public readonly handleGenerateCommitMessage: OmitThisParameter<typeof handleGenerateCommitMessage>;
  public readonly handleScmAmendFromInput: OmitThisParameter<typeof handleScmAmendFromInput>;

  constructor(controller: CommandController) {
    this.handleStageFile = handleStageFile.bind(controller);
    this.handleUnstageFile = handleUnstageFile.bind(controller);
    this.handleStagePatch = handleStagePatch.bind(controller);
    this.handleCommitTemplate = handleCommitTemplate.bind(controller);
    this.handleGenerateCommitMessage = handleGenerateCommitMessage.bind(controller);
    this.handleScmAmendFromInput = handleScmAmendFromInput.bind(controller);
  }
}
