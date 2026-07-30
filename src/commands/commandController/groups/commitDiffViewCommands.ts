import type { CommandController } from '../index';
import { openCommitDetails } from '../openCommitDetails';
import { openSelectedFileDiffs } from '../openSelectedFileDiffs';
import { openCommitActionContextDiffs } from '../openCommitActionContextDiffs';
import { asCommitViewFileItem } from '../asCommitViewFileItem';
import { asCommitRangeFileItem } from '../asCommitRangeFileItem';
import { asRevisionViewFileItem } from '../asRevisionViewFileItem';
import { asWorkingTreeCompareFileItem } from '../asWorkingTreeCompareFileItem';
import { asFileResourceUri } from '../asFileResourceUri';
import { toExplorerResourceUris } from '../toExplorerResourceUris';
import { toRepoFilePath } from '../toRepoFilePath';
import { toCommitSha } from '../toCommitSha';
import { toCommitSubject } from '../toCommitSubject';
import { resolveCommitSubject } from '../resolveCommitSubject';
import { resolveSelectedCommitFiles } from '../resolveSelectedCommitFiles';
import { toSelectedChangeTarget } from '../toSelectedChangeTarget';
import { toSelectedItems } from '../toSelectedItems';
import { extractSelectableItem } from '../extractSelectableItem';
import { handleCommitViewClose } from '../handleCommitViewClose';
import { handleCommitAmend } from '../handleCommitAmend';
import { handleEditCommitMessage } from '../handleEditCommitMessage';
import { handleFileBlameOpen } from '../handleFileBlameOpen';
import { handleOpenFileDiff } from '../handleOpenFileDiff';
import { handleWorkingTreeCompareOpenFileDiff } from '../handleWorkingTreeCompareOpenFileDiff';
import { handleCompareWithRevisionSwapDirection } from '../handleCompareWithRevisionSwapDirection';

/**
 * Groups the commitdiffview command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class CommitDiffViewCommands {
  public readonly openCommitDetails: OmitThisParameter<typeof openCommitDetails>;
  public readonly openSelectedFileDiffs: OmitThisParameter<typeof openSelectedFileDiffs>;
  public readonly openCommitActionContextDiffs: OmitThisParameter<typeof openCommitActionContextDiffs>;
  public readonly asCommitViewFileItem: OmitThisParameter<typeof asCommitViewFileItem>;
  public readonly asCommitRangeFileItem: OmitThisParameter<typeof asCommitRangeFileItem>;
  public readonly asRevisionViewFileItem: OmitThisParameter<typeof asRevisionViewFileItem>;
  public readonly asWorkingTreeCompareFileItem: OmitThisParameter<typeof asWorkingTreeCompareFileItem>;
  public readonly asFileResourceUri: OmitThisParameter<typeof asFileResourceUri>;
  public readonly toExplorerResourceUris: OmitThisParameter<typeof toExplorerResourceUris>;
  public readonly toRepoFilePath: OmitThisParameter<typeof toRepoFilePath>;
  public readonly toCommitSha: OmitThisParameter<typeof toCommitSha>;
  public readonly toCommitSubject: OmitThisParameter<typeof toCommitSubject>;
  public readonly resolveCommitSubject: OmitThisParameter<typeof resolveCommitSubject>;
  public readonly resolveSelectedCommitFiles: OmitThisParameter<typeof resolveSelectedCommitFiles>;
  public readonly toSelectedChangeTarget: OmitThisParameter<typeof toSelectedChangeTarget>;
  public readonly toSelectedItems: OmitThisParameter<typeof toSelectedItems>;
  public readonly extractSelectableItem: OmitThisParameter<typeof extractSelectableItem>;
  public readonly handleCommitViewClose: OmitThisParameter<typeof handleCommitViewClose>;
  public readonly handleCommitAmend: OmitThisParameter<typeof handleCommitAmend>;
  public readonly handleEditCommitMessage: OmitThisParameter<typeof handleEditCommitMessage>;
  public readonly handleFileBlameOpen: OmitThisParameter<typeof handleFileBlameOpen>;
  public readonly handleOpenFileDiff: OmitThisParameter<typeof handleOpenFileDiff>;
  public readonly handleWorkingTreeCompareOpenFileDiff: OmitThisParameter<typeof handleWorkingTreeCompareOpenFileDiff>;
  public readonly handleCompareWithRevisionSwapDirection: OmitThisParameter<typeof handleCompareWithRevisionSwapDirection>;

  constructor(controller: CommandController) {
    this.openCommitDetails = openCommitDetails.bind(controller);
    this.openSelectedFileDiffs = openSelectedFileDiffs.bind(controller);
    this.openCommitActionContextDiffs = openCommitActionContextDiffs.bind(controller);
    this.asCommitViewFileItem = asCommitViewFileItem.bind(controller);
    this.asCommitRangeFileItem = asCommitRangeFileItem.bind(controller);
    this.asRevisionViewFileItem = asRevisionViewFileItem.bind(controller);
    this.asWorkingTreeCompareFileItem = asWorkingTreeCompareFileItem.bind(controller);
    this.asFileResourceUri = asFileResourceUri.bind(controller);
    this.toExplorerResourceUris = toExplorerResourceUris.bind(controller);
    this.toRepoFilePath = toRepoFilePath.bind(controller);
    this.toCommitSha = toCommitSha.bind(controller);
    this.toCommitSubject = toCommitSubject.bind(controller);
    this.resolveCommitSubject = resolveCommitSubject.bind(controller);
    this.resolveSelectedCommitFiles = resolveSelectedCommitFiles.bind(controller);
    this.toSelectedChangeTarget = toSelectedChangeTarget.bind(controller);
    this.toSelectedItems = toSelectedItems.bind(controller);
    this.extractSelectableItem = extractSelectableItem.bind(controller);
    this.handleCommitViewClose = handleCommitViewClose.bind(controller);
    this.handleCommitAmend = handleCommitAmend.bind(controller);
    this.handleEditCommitMessage = handleEditCommitMessage.bind(controller);
    this.handleFileBlameOpen = handleFileBlameOpen.bind(controller);
    this.handleOpenFileDiff = handleOpenFileDiff.bind(controller);
    this.handleWorkingTreeCompareOpenFileDiff = handleWorkingTreeCompareOpenFileDiff.bind(controller);
    this.handleCompareWithRevisionSwapDirection = handleCompareWithRevisionSwapDirection.bind(controller);
  }
}
