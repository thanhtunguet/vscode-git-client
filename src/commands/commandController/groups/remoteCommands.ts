import type { CommandController } from '../index';
import { sshPull } from '../sshPull';
import { handleGitSshPullCustom } from '../handleGitSshPullCustom';
import { handleGitSshPullBitbucket } from '../handleGitSshPullBitbucket';
import { handleGitSshPullGitlab } from '../handleGitSshPullGitlab';
import { handleGitSshPullGithub } from '../handleGitSshPullGithub';
import { handleGitFetchPrune } from '../handleGitFetchPrune';
import { handleGitPullWithPreview } from '../handleGitPullWithPreview';
import { handleGitPushWithPreview } from '../handleGitPushWithPreview';
import { handlePushAllUpToHere } from '../handlePushAllUpToHere';
import { handleRemoteAdd } from '../handleRemoteAdd';
import { handleRemoteDelete } from '../handleRemoteDelete';
import { handleRemoteFetch } from '../handleRemoteFetch';
import { handleRemoteFetchAll } from '../handleRemoteFetchAll';
import { handleSetRemoteUrl } from '../handleSetRemoteUrl';

/**
 * Groups the remote command handlers that were
 * previously flat members of `CommandController`. Each member is bound to the
 * shared controller instance in the constructor body (not as a field
 * initializer — field initializers run before parameter-property assignment
 * under useDefineForClassFields, so `this.controller` would be undefined at
 * that point), so cross-group `this.xxx` references inside the handler files
 * keep resolving exactly as before this split.
 */
export class RemoteCommands {
  public readonly sshPull: OmitThisParameter<typeof sshPull>;
  public readonly handleGitSshPullCustom: OmitThisParameter<typeof handleGitSshPullCustom>;
  public readonly handleGitSshPullBitbucket: OmitThisParameter<typeof handleGitSshPullBitbucket>;
  public readonly handleGitSshPullGitlab: OmitThisParameter<typeof handleGitSshPullGitlab>;
  public readonly handleGitSshPullGithub: OmitThisParameter<typeof handleGitSshPullGithub>;
  public readonly handleGitFetchPrune: OmitThisParameter<typeof handleGitFetchPrune>;
  public readonly handleGitPullWithPreview: OmitThisParameter<typeof handleGitPullWithPreview>;
  public readonly handleGitPushWithPreview: OmitThisParameter<typeof handleGitPushWithPreview>;
  public readonly handlePushAllUpToHere: OmitThisParameter<typeof handlePushAllUpToHere>;
  public readonly handleRemoteAdd: OmitThisParameter<typeof handleRemoteAdd>;
  public readonly handleRemoteDelete: OmitThisParameter<typeof handleRemoteDelete>;
  public readonly handleRemoteFetch: OmitThisParameter<typeof handleRemoteFetch>;
  public readonly handleRemoteFetchAll: OmitThisParameter<typeof handleRemoteFetchAll>;
  public readonly handleSetRemoteUrl: OmitThisParameter<typeof handleSetRemoteUrl>;

  constructor(controller: CommandController) {
    this.sshPull = sshPull.bind(controller);
    this.handleGitSshPullCustom = handleGitSshPullCustom.bind(controller);
    this.handleGitSshPullBitbucket = handleGitSshPullBitbucket.bind(controller);
    this.handleGitSshPullGitlab = handleGitSshPullGitlab.bind(controller);
    this.handleGitSshPullGithub = handleGitSshPullGithub.bind(controller);
    this.handleGitFetchPrune = handleGitFetchPrune.bind(controller);
    this.handleGitPullWithPreview = handleGitPullWithPreview.bind(controller);
    this.handleGitPushWithPreview = handleGitPushWithPreview.bind(controller);
    this.handlePushAllUpToHere = handlePushAllUpToHere.bind(controller);
    this.handleRemoteAdd = handleRemoteAdd.bind(controller);
    this.handleRemoteDelete = handleRemoteDelete.bind(controller);
    this.handleRemoteFetch = handleRemoteFetch.bind(controller);
    this.handleRemoteFetchAll = handleRemoteFetchAll.bind(controller);
    this.handleSetRemoteUrl = handleSetRemoteUrl.bind(controller);
  }
}
