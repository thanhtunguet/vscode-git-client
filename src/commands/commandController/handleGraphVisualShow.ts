import * as vscode from 'vscode';
import { type CommandController } from './index';
import { GraphVisualView } from '../../views/graphVisualView';

export async function handleGraphVisualShow(this: CommandController): Promise<void> {
  try {
    this.logger.info('Fetching visual graph data...');

    const data = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Loading visual graph...',
        cancellable: false
      },
      async () => {
        return await this.git.getVisualGraphData(500);
      }
    );

    this.logger.info(`Loaded ${data.commits.length} commits for visual graph`);

    GraphVisualView.show(this.extensionUri, data, async () => {
      return await this.git.getVisualGraphData(500);
    });
  } catch (error) {
    this.logger.error('Failed to show visual graph', error);
    throw error;
  }
}
