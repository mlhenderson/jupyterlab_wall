import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IStateDB } from '@jupyterlab/statedb';
import { ICommandPalette } from '@jupyterlab/apputils';

import { requestAPI } from './handler';
import { AlertManager } from './alertManager';

/**
 * Initialization data for the jupyterlab-wall extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-wall:plugin',
  description: 'A JupyterLab extension.',
  autoStart: true,
  requires: [ICommandPalette, IStateDB],
  activate: async (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    state: IStateDB
  ) => {
    console.log('JupyterLab extension jupyterlab-wall is activated!');

    requestAPI<any>('get_example').catch(reason => {
      console.error(
        `The jupyterlab_wall server extension appears to be missing.\n${reason}`
      );
    });

    try {
      const manager = new AlertManager(app, state);
      await manager.watchAlertStatus();
    } catch (e) {
      console.error(e);
    }
  }
};

export default plugin;
