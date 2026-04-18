import * as vscode from 'vscode';
import { GitService } from '../services/gitService';
import { CommitFileChange } from '../types';

interface FileClickMessage {
  readonly type: 'fileClick';
  readonly sha: string;
  readonly filePath: string;
}

interface FileTreeNode {
  name: string;
  path: string;
  children: Map<string, FileTreeNode>;
  isFile: boolean;
  status?: string;
}

export class CommitFilesViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  static readonly viewId = 'intelliGit.commitView';

  private view: vscode.WebviewView | undefined;
  private currentCommit: { sha: string; subject: string } | undefined;

  constructor(
    private readonly git: GitService,
    private readonly onFileClick: (sha: string, filePath: string) => Promise<void>
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.onDidReceiveMessage(async (message: unknown) => {
      try {
        if (isFileClickMessage(message)) {
          await this.onFileClick(message.sha, message.filePath);
        }
      } catch (error) {
        void vscode.window.showErrorMessage(`IntelliGit: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    void this.render();
  }

  async showCommit(sha: string, subject: string): Promise<void> {
    this.currentCommit = { sha, subject };
    await this.render();
    await vscode.commands.executeCommand(`${CommitFilesViewProvider.viewId}.focus`);
  }

  async clear(): Promise<void> {
    this.currentCommit = undefined;
    await this.render();
  }

  dispose(): void {
    this.view = undefined;
    this.currentCommit = undefined;
  }

  private async render(): Promise<void> {
    if (!this.view) {
      return;
    }

    if (!this.currentCommit) {
      this.view.webview.html = renderEmptyHtml();
      return;
    }

    const files = await this.git.getFilesInCommitWithStatus(this.currentCommit.sha);
    this.view.webview.html = renderCommitFilesHtml(this.currentCommit.sha, this.currentCommit.subject, files);
  }
}

function renderEmptyHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --muted: var(--vscode-descriptionForeground);
    }
    body {
      margin: 0;
      padding: 12px;
      height: 100vh;
      box-sizing: border-box;
      display: grid;
      place-items: center;
      color: var(--muted);
      background: var(--bg);
      font: var(--vscode-font-size) var(--vscode-font-family);
      text-align: center;
    }
  </style>
</head>
<body>
  <div>Select a commit in Compare view to show changed files.</div>
</body>
</html>`;
}

function renderCommitFilesHtml(sha: string, subject: string, files: CommitFileChange[]): string {
  const tree = buildFileTree(files);
  const rows = renderFileTreeNodes(sha, tree, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Commit View</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --muted: var(--vscode-descriptionForeground);
      --border: var(--vscode-panel-border);
      --list-hover: var(--vscode-list-hoverBackground);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size, 13px);
      color: var(--fg);
      background: var(--bg);
      padding: 8px 0;
      height: 100vh;
      overflow-y: auto;
    }
    .header {
      padding: 4px 12px 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 4px;
    }
    .header .sha {
      font-family: var(--vscode-editor-font-family);
      font-size: 11px;
      color: var(--muted);
    }
    .header .subject {
      font-size: 13px;
      font-weight: 600;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tree-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px 2px 6px;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    .tree-row:hover { background: var(--list-hover); }
    .icon {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      color: var(--vscode-foreground);
      opacity: 0.9;
    }
    .icon-folder {
      color: var(--vscode-symbolIcon-folderForeground);
      opacity: 1;
    }
    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
    .status {
      width: 14px;
      text-align: right;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
      margin-left: 8px;
      font-family: var(--vscode-editor-font-family);
    }
    .status.modified { color: var(--vscode-gitDecoration-modifiedResourceForeground); }
    .status.deleted { color: var(--vscode-gitDecoration-deletedResourceForeground); }
    .status.untracked { color: var(--vscode-gitDecoration-untrackedResourceForeground); }
    .status.unknown { color: var(--muted); }
    .indent { display: inline-block; width: 16px; flex-shrink: 0; }
    .folder-toggle {
      display: inline-flex;
      align-items: center;
      width: 16px;
      flex-shrink: 0;
      color: var(--muted);
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="sha">${escapeHtml(sha)}</div>
    <div class="subject">${escapeHtml(subject)}</div>
  </div>
  <div id="tree">${rows}</div>
  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('tree').addEventListener('click', (event) => {
      const row = event.target.closest('.tree-row');
      if (!row) return;
      if (row.classList.contains('folder')) {
        const key = row.getAttribute('data-key');
        const children = document.querySelectorAll('[data-parent="' + key + '"]');
        const isOpen = row.getAttribute('data-open') === 'true';
        row.setAttribute('data-open', isOpen ? 'false' : 'true');
        row.querySelector('.folder-toggle').textContent = isOpen ? '▶' : '▼';
        children.forEach((child) => {
          child.style.display = isOpen ? 'none' : '';
        });
        return;
      }
      if (row.classList.contains('file')) {
        const sha = row.getAttribute('data-sha');
        const filePath = row.getAttribute('data-path');
        vscode.postMessage({ type: 'fileClick', sha, filePath });
      }
    });
  </script>
</body>
</html>`;
}

function buildFileTree(files: CommitFileChange[]): FileTreeNode {
  const root: FileTreeNode = { name: '', path: '', children: new Map(), isFile: false };
  for (const file of files) {
    const filePath = file.path;
    const parts = filePath.split('/');
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!node.children.has(part)) {
        const childPath = parts.slice(0, i + 1).join('/');
        node.children.set(part, {
          name: part,
          path: childPath,
          children: new Map(),
          isFile: i === parts.length - 1,
          status: i === parts.length - 1 ? file.status : undefined
        });
      }
      node = node.children.get(part)!;
      if (i === parts.length - 1) {
        node.status = file.status;
      }
    }
  }
  return root;
}

function renderFileTreeNodes(sha: string, node: FileTreeNode, depth: number): string {
  let html = '';
  const indent = '<span class="indent"></span>'.repeat(depth);
  const sorted = [...node.children.values()].sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  for (const child of sorted) {
    if (child.isFile) {
      const { label, cssClass } = statusBadge(child.status);
      html += `<div class="tree-row file" data-sha="${escapeHtml(sha)}" data-path="${escapeHtml(child.path)}">${indent}<span class="icon">${fileIcon()}</span><span class="label">${escapeHtml(child.name)}</span><span class="status ${cssClass}" title="${escapeHtml(statusTitle(child.status))}">${label}</span></div>`;
    } else {
      const key = escapeHtml(child.path);
      html += `<div class="tree-row folder" data-key="${key}" data-open="true">${indent}<span class="folder-toggle">▼</span><span class="icon icon-folder">${folderIcon()}</span><span class="label">${escapeHtml(child.name)}</span></div>`;
      const childrenHtml = renderFileTreeNodes(sha, child, depth + 1);
      html += childrenHtml.replace(/<div class="tree-row/g, `<div data-parent="${key}" class="tree-row`);
    }
  }
  return html;
}

function folderIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M14.5 4H8.707L7.146 2.439A.5.5 0 0 0 6.793 2.25H1.5A1.5 1.5 0 0 0 0 3.75v8.5A1.5 1.5 0 0 0 1.5 13.75h13A1.5 1.5 0 0 0 16 12.25V5.5A1.5 1.5 0 0 0 14.5 4z"/></svg>`;
}

function fileIcon(): string {
  return `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M9 1.75 13.75 6.5V14a1 1 0 0 1-1 1h-9.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.25z"/><path fill="var(--vscode-editor-background)" d="M9 1.75V6.5h4.75z" opacity="0.45"/></svg>`;
}

function statusBadge(statusRaw?: string): { label: string; cssClass: string } {
  const status = normalizedStatus(statusRaw);
  if (status === 'M') return { label: 'M', cssClass: 'modified' };
  if (status === 'D') return { label: 'D', cssClass: 'deleted' };
  if (status === 'A') return { label: 'U', cssClass: 'untracked' };
  return { label: status, cssClass: 'unknown' };
}

function statusTitle(statusRaw?: string): string {
  const status = normalizedStatus(statusRaw);
  if (status === 'M') return 'Modified';
  if (status === 'D') return 'Deleted';
  if (status === 'A') return 'Untracked';
  if (status === 'R') return 'Renamed';
  if (status === 'C') return 'Copied';
  return status || 'Unknown';
}

function normalizedStatus(statusRaw?: string): string {
  const token = (statusRaw ?? '').trim();
  if (!token) return '?';
  return token[0].toUpperCase();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isFileClickMessage(value: unknown): value is FileClickMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const c = value as Record<string, unknown>;
  return c.type === 'fileClick' && typeof c.sha === 'string' && typeof c.filePath === 'string';
}
