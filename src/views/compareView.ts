import * as vscode from 'vscode';
import { CompareResult, GraphCommit } from '../types';

export class CompareView {
  private readonly panel: vscode.WebviewPanel;

  constructor(private readonly extensionUri: vscode.Uri) {
    this.panel = vscode.window.createWebviewPanel(
      'intelliGit.branchCompare',
      'IntelliGit: Branch Comparison',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
  }

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.Active, false);
  }

  dispose(): void {
    this.panel.dispose();
  }

  render(result: CompareResult): void {
    this.panel.title = `Compare ${result.leftRef} <> ${result.rightRef}`;
    this.panel.webview.html = renderCompareHtml(result);
  }
}

function renderCompareHtml(result: CompareResult): string {
  const leftCommits = renderCommitRows(result.commitsOnlyLeft);
  const rightCommits = renderCommitRows(result.commitsOnlyRight);
  const files = result.changedFiles
    .map((file) => `<tr><td>${escapeHtml(file.status)}</td><td>${escapeHtml(file.path)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Branch Comparison</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: var(--vscode-editor-background);
      --fg: var(--vscode-editor-foreground);
      --muted: var(--vscode-descriptionForeground);
      --border: var(--vscode-panel-border);
      --accent: var(--vscode-focusBorder);
    }
    body {
      font-family: var(--vscode-font-family);
      color: var(--fg);
      background: linear-gradient(145deg, color-mix(in srgb, var(--bg), transparent 0%), color-mix(in srgb, var(--accent), transparent 92%));
      margin: 0;
      padding: 16px;
    }
    h1 {
      margin: 0 0 4px;
      font-size: 18px;
    }
    .muted {
      color: var(--muted);
      margin-bottom: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      background: color-mix(in srgb, var(--bg), white 3%);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      text-align: left;
      border-bottom: 1px solid var(--border);
      padding: 6px 4px;
    }
    .sha {
      font-family: var(--vscode-editor-font-family);
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <h1>Branch Comparison</h1>
  <div class="muted">${escapeHtml(result.leftRef)} vs ${escapeHtml(result.rightRef)}</div>

  <div class="grid">
    <section class="card">
      <h2>Only in ${escapeHtml(result.leftRef)} (${result.commitsOnlyLeft.length})</h2>
      <table>
        <thead><tr><th>SHA</th><th>Subject</th><th>Author</th></tr></thead>
        <tbody>${leftCommits}</tbody>
      </table>
    </section>

    <section class="card">
      <h2>Only in ${escapeHtml(result.rightRef)} (${result.commitsOnlyRight.length})</h2>
      <table>
        <thead><tr><th>SHA</th><th>Subject</th><th>Author</th></tr></thead>
        <tbody>${rightCommits}</tbody>
      </table>
    </section>
  </div>

  <section class="card">
    <h2>Changed Files (${result.changedFiles.length})</h2>
    <table>
      <thead><tr><th>Status</th><th>Path</th></tr></thead>
      <tbody>${files || '<tr><td colspan="2">No changed files</td></tr>'}</tbody>
    </table>
  </section>
</body>
</html>`;
}

function renderCommitRows(commits: GraphCommit[]): string {
  if (commits.length === 0) {
    return '<tr><td colspan="3">No commits</td></tr>';
  }

  return commits
    .map(
      (commit) =>
        `<tr><td class="sha">${escapeHtml(commit.shortSha)}</td><td>${escapeHtml(commit.subject)}</td><td>${escapeHtml(commit.author)}</td></tr>`
    )
    .join('');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
