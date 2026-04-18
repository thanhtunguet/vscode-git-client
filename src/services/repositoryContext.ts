import * as vscode from 'vscode';
import { RepositoryContext } from '../types';

export function getRepositoryContext(): RepositoryContext {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('Open a workspace folder containing a Git repository.');
  }

  const rootUri = folders[0].uri;
  return {
    rootUri,
    rootPath: rootUri.fsPath
  };
}
