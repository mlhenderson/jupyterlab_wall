import { AlertHeader } from '../src/alertHeader';
import { AlertMessage } from '../src/alertMessage';
import { AlertManager } from '../src/alertManager';

describe('AlertHeader', () => {
  let manager: jest.Mocked<AlertManager>;
  let alerts: AlertMessage[];
  let header: AlertHeader;

  beforeEach(() => {
    manager = {
      attachHeader: jest.fn(),
      detachHeader: jest.fn(),
      alertAddedSignal: { connect: jest.fn(), disconnect: jest.fn() },
      alertRemovedSignal: { connect: jest.fn(), disconnect: jest.fn() }
    } as any;

    alerts = [
      new AlertMessage('type1', 'message1', 1, '2024-01-01T00:00:00Z'),
      new AlertMessage('type2', 'message2', 2, '2024-01-01T00:00:00Z')
    ];

    header = new AlertHeader(alerts, manager);
  });

  it('should initialize correctly with alerts', () => {
    expect(header.getAlerts()).toHaveLength(2);
    expect(
      header.node.querySelector('.jp-jupyterlab-wall-header-message p')
        ?.textContent
    ).toContain('message1');
  });

  it('should switch between alerts', () => {
    const messageNode = header.node.querySelector(
      '.jp-jupyterlab-wall-header-message p'
    );

    // Switch to next
    (header as any).setActiveAlert(1);
    expect(messageNode?.textContent).toContain('message2');

    // Cycle back to first
    (header as any).setActiveAlert(0);
    expect(messageNode?.textContent).toContain('message1');
  });

  it('should emit dismissed signal when an alert is dismissed', () => {
    const spy = jest.fn();
    header.alertDismissed.connect(spy);

    // Simulate click on dismiss (manually calling the internal method for unit test)
    const dismissItem = header.node.querySelector(
      '.jp-jupyterlab-wall-header-menu-item'
    );
    (dismissItem as any).onclick();

    expect(spy).toHaveBeenCalledWith(header, alerts[0]);
  });

  it('should add an alert correctly', async () => {
    const newAlert = new AlertMessage(
      'type3',
      'message3',
      0,
      '2024-01-01T00:00:00Z'
    );
    await header.addAlert(manager, newAlert);

    expect(header.getAlerts()).toHaveLength(3);
    // Should be at index 0 because priority is 0
    expect(header.getAlerts()[0].getType()).toBe('type3');
  });

  it('should remove an alert correctly', async () => {
    await header.removeAlert(manager, alerts[0]);
    expect(header.getAlerts()).toHaveLength(1);
    expect(header.getAlerts()[0].getType()).toBe('type2');
  });

  it('should dispose correctly', () => {
    header.dispose();
    expect(manager.detachHeader).toHaveBeenCalledWith(header);
  });
});
