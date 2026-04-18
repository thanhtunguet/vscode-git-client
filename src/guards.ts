import * as vscode from 'vscode';

export async function confirmDangerousAction(options: {
  title: string;
  detail: string;
  acceptLabel?: string;
}): Promise<boolean> {
  const action = options.acceptLabel ?? 'Continue';
  const choice = await vscode.window.showWarningMessage(
    `${options.title}\n${options.detail}`,
    { modal: true },
    action
  );
  return choice === action;
}

export async function confirmNormalAction(message: string, acceptLabel = 'OK'): Promise<boolean> {
  const choice = await vscode.window.showInformationMessage(message, { modal: true }, acceptLabel);
  return choice === acceptLabel;
}
