import { Widget } from '@lumino/widgets';
import { ISignal, Signal } from '@lumino/signaling';
import { UUID } from '@lumino/coreutils';
import {
  LabIcon,
  closeIcon,
  blankIcon,
  fastForwardIcon
} from '@jupyterlab/ui-components';
import alertSvgstr from '../style/jupyterlab_wall_warning.svg';
import alertMenustr from '../style/jupyterlab_wall_menu.svg';
import { AlertManager } from './alertManager';
import { AlertMessage } from './alertMessage';

const alertIcon = new LabIcon({
  name: 'jupyterlab-wall:alert',
  svgstr: alertSvgstr
});

const menuIcon = new LabIcon({
  name: 'jupyterlab-wall:menu',
  svgstr: alertMenustr
});

export class AlertHeader extends Widget {
  private readonly sidePanel: HTMLElement;
  private readonly sidePanelButtonDiv: HTMLElement;
  private readonly sidePanelOpenButton: HTMLElement;
  private readonly alertMessageOuterDiv: HTMLElement;
  private readonly alertMessageDiv: HTMLElement;
  private readonly alertCloseLabel: HTMLElement;
  private readonly alertSwitchLabel: HTMLElement;
  private readonly alertSwitchListItem: HTMLLIElement;
  private readonly alertActiveCountsLabel: HTMLElement;
  private alerts: Array<AlertMessage>;
  private readonly manager: AlertManager;
  private readonly _alertDismissed: Signal<this, AlertMessage>;
  private activeAlert: number;
  private nextAlert: number;

  public constructor(alerts: AlertMessage[], manager: AlertManager) {
    super({ node: document.createElement('div') });

    this._alertDismissed = new Signal<this, AlertMessage>(this);
    this.id = `jp-jupyterlab-wall-alert-header-${UUID.uuid4()}`;
    this.addClass('jp-jupyterlab-wall-header');
    this.title.label = 'JupyterLab Alert';
    this.title.caption = alerts[0].getMessage();
    this.alerts = Array.from(alerts);
    this.activeAlert = 0;
    this.nextAlert = this.alerts.length === 1 ? 0 : 1;
    this.manager = manager;

    this.manager.attachHeader(this);
    this.manager.alertAddedSignal.connect(this.addAlert, this);
    this.manager.alertRemovedSignal.connect(this.removeAlert, this);

    const alertDiv = document.createElement('div');
    alertDiv.classList.add('jp-jupyterlab-wall-header-icon');
    alertIcon.element({ container: alertDiv });

    this.alertMessageOuterDiv = document.createElement('div');
    this.alertMessageOuterDiv.classList.add(
      'jp-jupyterlab-wall-header-message'
    );
    this.alertMessageDiv = document.createElement('p');
    this.alertMessageOuterDiv.append(this.alertMessageDiv);

    this.sidePanel = document.createElement('div');
    this.sidePanel.classList.add('jp-jupyterlab-wall-header-sidepanel');
    this.sidePanelButtonDiv = document.createElement('div');
    this.sidePanelButtonDiv.classList.add(
      'jp-jupyterlab-wall-header-button-outer'
    );
    this.sidePanelButtonDiv.onclick = (): void => {
      this.sidePanel.classList.toggle(
        'jp-jupyterlab-wall-header-sidepanel-open'
      );
    };
    this.sidePanelOpenButton = document.createElement('div');
    this.sidePanelOpenButton.classList.add('jp-jupyterlab-wall-header-button');
    this.sidePanelOpenButton.classList.add('jp-icon-selectable-inverse');
    menuIcon.element({ container: this.sidePanelOpenButton });
    this.sidePanelButtonDiv.append(this.sidePanelOpenButton);

    const alertMenu = document.createElement('ul');
    alertMenu.classList.add('jp-jupyterlab-wall-header-menu');
    const alertCloseListItem = document.createElement('li');
    this.alertCloseLabel = document.createElement('span');
    const alertCloseIcon: HTMLElement = closeIcon.element();
    alertCloseIcon.classList.add('jp-jupyterlab-wall-header-menu-item-icon');
    alertCloseListItem.classList.add('jp-jupyterlab-wall-header-menu-item');
    alertCloseListItem.onclick = async (): Promise<void> => {
      try {
        this._alertDismissed.emit(this.alerts[this.activeAlert]);
      } catch (e) {
        console.error('Failed to get active alert and send dismissed signal');
        console.error(e);
      }
    };
    alertCloseListItem.append(alertCloseIcon);
    alertCloseListItem.append(this.alertCloseLabel);

    this.alertSwitchListItem = document.createElement('li');
    this.alertSwitchListItem.classList.add(
      'jp-jupyterlab-wall-header-menu-item'
    );
    this.alertSwitchListItem.onclick = (): void => {
      this.setActiveAlert(this.nextAlert);
    };

    const iconString = fastForwardIcon.svgstr
      .replace('width="24"', 'width="16"')
      .replace('height="24"', 'height="16"');
    const alertSwitchIcon = new LabIcon({
      name: 'jupyterlab-wall:next-alert',
      svgstr: iconString
    });
    const alertSwitchIconElement = alertSwitchIcon.element();
    alertSwitchIconElement.classList.add(
      'jp-jupyterlab-wall-header-menu-item-icon'
    );
    this.alertSwitchListItem.append(alertSwitchIconElement);
    this.alertSwitchLabel = document.createElement('span');
    this.alertSwitchLabel.textContent = '';
    this.alertSwitchListItem.append(this.alertSwitchLabel);
    const alertActiveCountsListItem = document.createElement('div');
    alertActiveCountsListItem.classList.add(
      'jp-jupyterlab-wall-header-menu-item'
    );
    const alertActiveCountsIcon = blankIcon.element();
    alertActiveCountsIcon.classList.add(
      'jp-jupyterlab-wall-header-menu-item-icon'
    );
    this.alertActiveCountsLabel = document.createElement('span');
    alertActiveCountsListItem.append(alertActiveCountsIcon);
    alertActiveCountsListItem.append(this.alertActiveCountsLabel);

    alertMenu.append(alertCloseListItem);
    alertMenu.append(this.alertSwitchListItem);
    alertMenu.append(alertActiveCountsListItem);
    this.sidePanel.append(alertMenu);

    this.setActiveAlert(0);

    this.node.append(alertDiv);
    this.node.append(this.alertMessageOuterDiv);
    this.node.append(this.sidePanelButtonDiv);
    this.node.append(this.sidePanel);
  }

  public get alertDismissed(): ISignal<this, AlertMessage> {
    return this._alertDismissed;
  }

  public getAlerts(): AlertMessage[] {
    return Array.from(this.alerts);
  }

  public addAlert = async (_: AlertManager, m: AlertMessage): Promise<void> => {
    if (this.findAlertIndex(m) > -1) {
      console.error(`attempting to add duplicate value ${m.getID()}`);
      return Promise.resolve();
    }

    if (this.findAlertIndex(m) === -1) {
      this.alerts.push(m);
      this.alerts.sort((a, b) => {
        if (a.getPriority() < b.getPriority()) {
          return 0;
        } else {
          return 1;
        }
      });
      this.setActiveAlert(0);
    }
    return Promise.resolve();
  };

  public removeAlert = async (
    _: AlertManager,
    m: AlertMessage
  ): Promise<void> => {
    if (this.alerts.length === 0) {
      console.error('trying to remove from an empty array');
      return Promise.resolve();
    }

    const i = this.findAlertIndex(m);

    if (i === -1) {
      console.error(`${m.getID()} not found for removal`);
      return;
    } else if (i < this.alerts.length) {
      this.alerts.splice(i, 1);
    }

    if (this.alerts.length > 0) {
      this.setActiveAlert(0);
    } else {
      this.close();
      this.dispose();
    }
    return Promise.resolve();
  };

  public dispose(): void {
    super.dispose();
    this.manager.detachHeader(this);
    this.manager.alertRemovedSignal.disconnect(this.addAlert, this);
    this.manager.alertAddedSignal.disconnect(this.removeAlert, this);
  }

  private setActiveAlert(i: number): void {
    const lastActive = this.activeAlert;
    if (i > -1 && i < this.alerts.length) {
      this.activeAlert = i;

      if (i === this.alerts.length - 1) {
        this.nextAlert = 0;
      } else {
        this.nextAlert = i + 1;
      }

      const message = this.alerts[this.activeAlert].getMessage();
      const alertType = this.alerts[this.activeAlert].getType();
      const nextType = this.alerts[this.nextAlert].getType();

      this.alertMessageDiv.setAttribute('title', message);
      this.alertMessageDiv.textContent = `${this.alerts[
        this.activeAlert
      ].getMessage()} - ${this.alerts[this.activeAlert].getStartDateTime()}`;
      this.alertCloseLabel.textContent = `Dismiss ${alertType}`;

      if (this.alerts.length > 1) {
        if (lastActive !== this.activeAlert) {
          // replace the node to reset the message animation
          this.alertMessageOuterDiv.removeChild(this.alertMessageDiv);
          void this.alertMessageDiv.offsetWidth;
          this.alertMessageOuterDiv.append(this.alertMessageDiv);
        }
        // make sure display:none is removed
        this.alertSwitchListItem.style.display = '';
        this.alertSwitchLabel.textContent = `View ${nextType}`;
        this.alertActiveCountsLabel.textContent = `${this.alerts.length} alerts`;
      } else {
        // hide the switch message item if there is only one message
        this.alertSwitchListItem.style.display = 'none';
        this.alertSwitchLabel.textContent = '';
        this.alertActiveCountsLabel.textContent = `${this.alerts.length} alert`;
      }
    } else {
      console.error(`${i} out of range for this.alerts in setActiveAlert`);
    }
    this.update();
  }

  private findAlertIndex(alert: AlertMessage): number {
    for (let i = this.alerts.length - 1; i >= 0; i--) {
      if (this.alerts[i].getID() === alert.getID()) {
        return i;
      }
    }
    return -1;
  }
}
