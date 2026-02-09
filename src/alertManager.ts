import { ISignal, Signal } from '@lumino/signaling';
import { JupyterFrontEnd, LabShell } from '@jupyterlab/application';
import { IStateDB } from '@jupyterlab/statedb';
import { MainAreaWidget, Notification } from '@jupyterlab/apputils';
import { AlertMessage } from './alertMessage';
import { AlertHeader } from './alertHeader';
import { requestAPI } from './handler';
import { Mutex } from './utils';

// state string keys for saving and fetching saved alerts
export const ACTIVE_ALERTS = 'jupyterlab-wall:activeAlerts';
export const DISMISSED_ALERTS = 'jupyterlab-wall:dismissedAlerts';

/* JupyterLab commands that correspond to MainAreaWidget tab creation */
export const TRIGGER_COMMANDS = [
  'code-viewer:open',
  'console:open',
  'console:create',
  'docmanager:clone',
  'docmanager:new-untitled',
  'docmanager:open',
  'fileeditor:create-new',
  'fileeditor:create-new-markdown-file',
  'launcher:create',
  'notebook:create-new',
  'terminal:create-new'
];

export class AlertManager extends Object {
  private readonly _alertAddedSignal: Signal<this, AlertMessage> = new Signal<
    this,
    AlertMessage
  >(this);
  private readonly _alertRemovedSignal: Signal<this, AlertMessage> = new Signal<
    this,
    AlertMessage
  >(this);
  private readonly stateMutex: Mutex;
  private app: JupyterFrontEnd;
  private state: IStateDB;
  private pollInterval: number;

  public constructor(app: JupyterFrontEnd, state: IStateDB) {
    super();
    this.app = app;
    this.state = state;
    this.stateMutex = new Mutex();
    this.pollInterval = 5000 + Math.floor(Math.random() * 1001);

    this.app.commands.commandExecuted.connect(async (_, args) => {
      // make sure new tabs opened after alerts have started will get a header
      if (TRIGGER_COMMANDS.indexOf(args.id) > -1) {
        await args.result;
        await this._handleNewHeaders();
      }
      return Promise.resolve(args);
    });
  }

  public getPollInterval(): number {
    return this.pollInterval;
  }

  async watchAlertStatus(): Promise<void> {
    this._handleIncomingAlerts();
    setInterval(this._handleIncomingAlerts, this.pollInterval);
  }

  public get alertAddedSignal(): ISignal<this, AlertMessage> {
    return this._alertAddedSignal;
  }

  public get alertRemovedSignal(): ISignal<this, AlertMessage> {
    return this._alertRemovedSignal;
  }

  public attachHeader(h: AlertHeader): void {
    h.alertDismissed.connect(this._dismissAlert, this);
  }

  public detachHeader(h: AlertHeader): void {
    h.alertDismissed.disconnect(this._dismissAlert, this);
  }

  public _handleIncomingAlerts = async (): Promise<void> => {
    const serviceAlerts: AlertMessage[] = await this._getServiceAlerts();

    // get the current active alerts in widgets
    const prevServiceAlerts: AlertMessage[] =
      await this._getSavedAlerts(ACTIVE_ALERTS);

    // exit if nothing to do
    if (serviceAlerts.length === 0 && prevServiceAlerts.length === 0) {
      return;
    }

    const dismissedAlerts: AlertMessage[] =
      await this._getSavedAlerts(DISMISSED_ALERTS);

    // clean out obsolete alerts from widgets
    prevServiceAlerts.forEach(value => {
      for (let i = serviceAlerts.length - 1; i >= 0; i--) {
        if (value.getID() === serviceAlerts[i].getID()) {
          return;
        }
      }
      for (let i = dismissedAlerts.length - 1; i >= 0; i--) {
        if (value.getID() === dismissedAlerts[i].getID()) {
          return;
        }
      }
      this._alertRemovedSignal.emit(value);
    });

    // clean out dismissed alerts that are no longer active
    const updatedDismissedAlerts: AlertMessage[] = Array.from(
      dismissedAlerts
    ).filter(value => {
      for (let i = serviceAlerts.length - 1; i >= 0; i--) {
        if (serviceAlerts[i].getID() === value.getID()) {
          return true;
        }
      }
      return false;
    });
    await this._saveAlerts(updatedDismissedAlerts, DISMISSED_ALERTS);

    // drop pre-existing and dismissed alerts before sending
    const existingTabAlerts: AlertMessage[] = Array.from(serviceAlerts).filter(
      value => {
        for (let i = updatedDismissedAlerts.length - 1; i >= 0; i--) {
          if (updatedDismissedAlerts[i].getID() === value.getID()) {
            return false;
          }
        }
        for (let i = prevServiceAlerts.length - 1; i >= 0; i--) {
          if (prevServiceAlerts[i].getID() === value.getID()) {
            return false;
          }
        }
        return true;
      }
    );

    // save the current set of alerts to state
    await this._saveAlerts(serviceAlerts, ACTIVE_ALERTS);

    for (const value of existingTabAlerts) {
      this._alertAddedSignal.emit(value);
      await this._handleNewHeaders();
      this._sendNotification(value);
    }

    return Promise.resolve();
  };

  private async _handleNewHeaders(): Promise<void> {
    // get the current active alerts in widgets
    const serviceAlerts: AlertMessage[] =
      await this._getSavedAlerts(ACTIVE_ALERTS);

    // exit if nothing to do
    if (serviceAlerts.length === 0) {
      return;
    }

    // clean out dismissed alerts that are no longer active
    const dismissedAlerts: AlertMessage[] =
      await this._getSavedAlerts(DISMISSED_ALERTS);

    // drop any dismissed alerts from incoming alerts for widgets
    const newTabAlerts: AlertMessage[] = Array.from(serviceAlerts).filter(
      value => {
        for (let i = dismissedAlerts.length - 1; i >= 0; i--) {
          if (dismissedAlerts[i].getID() === value.getID()) {
            return false;
          }
        }
        return true;
      }
    );

    if (newTabAlerts.length === 0) {
      return;
    }

    const shell = this.app.shell as LabShell;
    const widgets = shell.widgets();
    let w = null;
    const processWidgets = () => {
      w = widgets.next().value;
      try {
        console.log(w);
        if (
          w instanceof MainAreaWidget &&
          !w.isDisposed &&
          w.contentHeader.widgets.length === 0
        ) {
          // create a new widget with current alerts
          const widget: AlertHeader = new AlertHeader(newTabAlerts, this);
          w.contentHeader.direction = 'left-to-right';
          w.contentHeader.addWidget(widget);
        }
      } catch (reason) {
        console.error(`Unexpected error adding alert to tab.\n${reason}`);
      }
      if (w !== undefined) {
        setTimeout(processWidgets, 1);
      }
    };
    processWidgets();
    return Promise.resolve();
  }

  private async _getServiceAlerts(): Promise<AlertMessage[]> {
    // fetch alert status from the backend service
    return requestAPI<any>('should_alert').then(async result => {
      try {
        if (result === null || result === undefined) {
          return [];
        }
        const alertMessages: AlertMessage[] = [];
        for (const k in result.data) {
          if (result.data[k]['active']) {
            const message = new AlertMessage(
              k,
              result.data[k].message,
              result.data[k].priority,
              result.data[k].start
            );
            alertMessages.push(message);
          }
        }
        return alertMessages;
      } catch (e) {
        console.error('should_alert request failed');
        console.error(e);
        return [];
      }
    });
  }

  private async _dismissAlert(_: AlertHeader, m: AlertMessage): Promise<void> {
    const dismissedAlerts: AlertMessage[] =
      await this._getSavedAlerts(DISMISSED_ALERTS);
    dismissedAlerts.push(m);
    await this._saveAlerts(dismissedAlerts, DISMISSED_ALERTS);
    this._alertRemovedSignal.emit(m);
    return Promise.resolve();
  }

  private async _getSavedAlerts(alertsKey: string): Promise<AlertMessage[]> {
    return this.state
      .fetch(alertsKey)
      .then(alertsValue => {
        if (alertsValue === undefined) {
          return [];
        }

        const alertsJSON: { [k: string]: any } = JSON.parse(
          JSON.stringify(alertsValue)
        );
        const alerts: AlertMessage[] = [];
        for (const k in alertsJSON) {
          alerts.push(
            new AlertMessage(
              alertsJSON[k].type,
              alertsJSON[k].message,
              alertsJSON[k].priority,
              alertsJSON[k].start
            )
          );
        }
        return alerts;
      })
      .catch(e => {
        console.error(`_fetchAlerts(${alertsKey}) fetch failed`);
        console.error(e);
        return [];
      });
  }

  private async _saveAlerts(
    alerts: AlertMessage[],
    alertsKey: string
  ): Promise<boolean> {
    await this.stateMutex.lock();
    const alertsJSON: { [k: string]: any } = {};
    alerts.forEach(value => (alertsJSON[value.getID()] = value.toJSON()));

    const result = await this.state
      .save(alertsKey, alertsJSON)
      .then(_ => {
        return true;
      })
      .catch(e => {
        console.error(`_saveAlerts(${alerts}, ${alertsKey}) error`);
        console.error(e);
        return false;
      });
    this.stateMutex.unlock();
    return Promise.resolve(result);
  }

  private _sendNotification(data: AlertMessage): void {
    Notification.warning(
      'Alert - ' +
        data.getMessage() +
        '     ' +
        data.getStartDateTime().toISOString()
    );
  }
}
