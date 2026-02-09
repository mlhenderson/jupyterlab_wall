import { AlertManager, ACTIVE_ALERTS } from '../src/alertManager';
import { AlertMessage } from '../src/alertMessage';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { IStateDB } from '@jupyterlab/statedb';
import { Signal } from '@lumino/signaling';

// Mock requestAPI
jest.mock('../src/handler', () => ({
  requestAPI: jest.fn()
}));

import { requestAPI } from '../src/handler';

describe('AlertManager', () => {
  let app: jest.Mocked<JupyterFrontEnd>;
  let state: jest.Mocked<IStateDB>;
  let manager: AlertManager;

  beforeEach(() => {
    app = {
      commands: {
        commandExecuted: new Signal<any, any>({} as any)
      },
      shell: {
        widgets: jest.fn(() => ({
          next: jest.fn(() => ({ value: undefined, done: true }))
        }))
      }
    } as any;

    state = {
      fetch: jest.fn(),
      save: jest.fn()
    } as any;

    manager = new AlertManager(app, state);
  });

  it('should initialize correctly', () => {
    expect(manager).toBeDefined();
    expect(manager.getPollInterval()).toBeGreaterThanOrEqual(5000);
    expect(manager.getPollInterval()).toBeLessThanOrEqual(6000);
  });

  describe('_getServiceAlerts', () => {
    it('should fetch alerts from API and convert to AlertMessage objects', async () => {
      const mockData = {
        data: {
          alert1: {
            active: true,
            message: 'msg1',
            priority: 1,
            start: '2024-01-01T00:00:00Z'
          },
          alert2: {
            active: false,
            message: 'msg2',
            priority: 2,
            start: '2024-01-01T00:00:00Z'
          }
        }
      };
      (requestAPI as jest.Mock).mockResolvedValue(mockData);

      const alerts = await (manager as any)._getServiceAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0]).toBeInstanceOf(AlertMessage);
      expect(alerts[0].getID()).toBe('alert1_2024-01-01T00:00:00.000Z');
    });

    it('should return empty array on API error', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (requestAPI as jest.Mock).mockResolvedValue(null);
      let alerts = await (manager as any)._getServiceAlerts();
      expect(alerts).toEqual([]);

      (requestAPI as jest.Mock).mockResolvedValue(undefined);
      alerts = await (manager as any)._getServiceAlerts();
      expect(alerts).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe('_getSavedAlerts', () => {
    it('should fetch saved alerts from StateDB', async () => {
      const savedData = {
        id1: {
          type: 'type1',
          message: 'msg1',
          priority: 1,
          start: '2024-01-01T00:00:00Z'
        }
      };
      state.fetch.mockResolvedValue(savedData);

      const alerts = await (manager as any)._getSavedAlerts(ACTIVE_ALERTS);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].getType()).toBe('type1');
    });

    it('should return empty array if no saved alerts', async () => {
      state.fetch.mockResolvedValue(undefined);
      const alerts = await (manager as any)._getSavedAlerts(ACTIVE_ALERTS);
      expect(alerts).toEqual([]);
    });
  });

  describe('_saveAlerts', () => {
    it('should save alerts to StateDB', async () => {
      const alerts = [new AlertMessage('t1', 'm1', 1, '2024-01-01T00:00:00Z')];
      state.save.mockResolvedValue(undefined);

      const result = await (manager as any)._saveAlerts(alerts, ACTIVE_ALERTS);
      expect(result).toBe(true);
      expect(state.save).toHaveBeenCalledWith(
        ACTIVE_ALERTS,
        expect.any(Object)
      );

      state.save.mockRejectedValue(new Error('Save Error'));
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const resultFail = await (manager as any)._saveAlerts(
        alerts,
        ACTIVE_ALERTS
      );
      expect(resultFail).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('_handleIncomingAlerts', () => {
    it('should correctly process new, dismissed, and obsolete alerts', async () => {
      // 1. Setup mock data
      const serviceAlertsData = {
        data: {
          alert1: {
            active: true,
            message: 'm1',
            priority: 1,
            start: '2024-01-01T00:00:00Z'
          },
          alert2: {
            active: true,
            message: 'm2',
            priority: 2,
            start: '2024-01-01T00:00:00Z'
          }
        }
      };
      (requestAPI as jest.Mock).mockResolvedValue(serviceAlertsData);

      // Previous active alerts: only alert1
      state.fetch.mockImplementation(key => {
        if (key === 'jupyterlab-wall:activeAlerts') {
          return Promise.resolve({
            'alert1_2024-01-01T00:00:00.000Z': {
              type: 'alert1',
              message: 'm1',
              priority: 1,
              start: '2024-01-01T00:00:00Z'
            }
          });
        }
        return Promise.resolve(undefined);
      });

      const addSpy = jest.fn();
      manager.alertAddedSignal.connect(addSpy);

      // Mock save to avoid errors
      state.save.mockResolvedValue(undefined);

      // 2. Execute
      await (manager as any)._handleIncomingAlerts();

      // 3. Verify: alert2 should be added, alert1 should not (already active)
      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy.mock.calls[0][1].getType()).toBe('alert2');
    });
  });
});
