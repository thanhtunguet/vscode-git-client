import * as vscode from 'vscode';
import { GitCommand } from '../config/commands';
import { CommitFileChange } from '../types';
import { RecoveryReflogEntry } from './recoveryTypes';

export class RecoverySectionTreeItem extends vscode.TreeItem {
  constructor(
    public readonly kind: 'reflog' | 'commits' | 'blobs',
    label: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
    this.id = `recoverySection:${kind}`;
    this.contextValue = `recoverySection:${kind}`;
  }
}

export class RecoveryReflogEntryTreeItem extends vscode.TreeItem {
  constructor(public readonly entry: RecoveryReflogEntry) {
    super(`${entry.selector} ${entry.message}`, vscode.TreeItemCollapsibleState.Collapsed);
    const previewOid = entry.suggestedRecoveryOid ?? entry.newOid;
    this.id = `recoveryReflog:${entry.refName}:${entry.selector}:${entry.newOid}`;
    this.contextValue = entry.suggestedRecoveryOid
      ? 'recoveryReflogEntry'
      : 'recoveryReflogEntryPreviewOnly';
    this.description = previewOid.slice(0, 8);
    this.tooltip = [
      `Ref: ${entry.refName}`,
      `Selector: ${entry.selector}`,
      `Action: ${entry.action}`,
      `Before: ${entry.previousOid ?? 'unknown'}`,
      `After: ${entry.newOid}`,
      `Suggested recovery: ${entry.suggestedRecoveryOid ?? 'manual review required'}`,
      `Confidence: ${entry.confidence}`,
      entry.timestamp > 0 ? new Date(entry.timestamp).toLocaleString() : 'Time unavailable'
    ].join('\n');
    this.iconPath = new vscode.ThemeIcon('history');
    this.command = {
      title: 'Preview Recovery Snapshot',
      command: GitCommand.RecoveryPreview,
      arguments: [this]
    };
  }

  get sha(): string {
    return this.entry.suggestedRecoveryOid ?? this.entry.newOid;
  }
}

export class RecoveryReflogFileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly entry: RecoveryReflogEntry,
    public readonly file: CommitFileChange,
    workspaceRoot: string
  ) {
    const previewOid = entry.suggestedRecoveryOid ?? entry.newOid;
    super(file.path.split('/').at(-1) ?? file.path, vscode.TreeItemCollapsibleState.None);
    this.id = `recoveryReflogFile:${previewOid}:${file.path}`;
    this.contextValue = 'recoveryReflogFile';
    this.description = file.status;
    this.resourceUri = vscode.Uri.file(`${workspaceRoot}/${file.path}`);
    this.tooltip = `${file.status} ${file.path}\n${previewOid.slice(0, 8)} ↔ HEAD`;
    this.command = {
      title: 'Preview Recovery File Diff',
      command: GitCommand.RecoveryPreview,
      arguments: [this]
    };
  }
}

export class RecoveryLoadMoreTreeItem extends vscode.TreeItem {
  constructor() {
    super('Load More...', vscode.TreeItemCollapsibleState.None);
    this.id = 'recoveryLoadMore';
    this.contextValue = 'recoveryLoadMore';
    this.iconPath = new vscode.ThemeIcon('chevron-down');
    this.command = {
      title: 'Load More Recovery Entries',
      command: GitCommand.RecoveryRefreshReflog,
      arguments: [this]
    };
  }
}

export class RecoveryScanPlaceholderTreeItem extends vscode.TreeItem {
  constructor(public readonly target: 'commits' | 'blobs') {
    super('Scan Repository...', vscode.TreeItemCollapsibleState.None);
    this.id = `recoveryScan:${target}`;
    this.contextValue = 'recoveryScanPlaceholder';
    this.iconPath = new vscode.ThemeIcon('search');
    this.command = {
      title: 'Scan Repository for Unreachable Objects',
      command: GitCommand.RecoveryScan,
      arguments: [target]
    };
  }
}

export type RecoveryTreeNode =
  | RecoverySectionTreeItem
  | RecoveryReflogEntryTreeItem
  | RecoveryReflogFileTreeItem
  | RecoveryLoadMoreTreeItem
  | RecoveryScanPlaceholderTreeItem;
