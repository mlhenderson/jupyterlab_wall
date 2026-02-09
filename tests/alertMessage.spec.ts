import { AlertMessage } from '../src/alertMessage';

describe('AlertMessage', () => {
  const type = 'test_type';
  const message = 'test_message';
  const priority = 1;
  const start = '2024-01-01T00:00:00.000Z';

  it('should initialize correctly', () => {
    const alert = new AlertMessage(type, message, priority, start);
    expect(alert.getType()).toBe(type);
    expect(alert.getMessage()).toBe(message);
    expect(alert.getPriority()).toBe(priority);
    expect(alert.getStartDateTime().toISOString()).toBe(start);
  });

  it('should generate a unique ID based on type and start date', () => {
    const alert = new AlertMessage(type, message, priority, start);
    expect(alert.getID()).toBe(`${type}_${start}`);
  });

  it('should convert to JSON correctly', () => {
    const alert = new AlertMessage(type, message, priority, start);
    const json = alert.toJSON();
    expect(json.type).toBe(type);
    expect(json.message).toBe(message);
    expect(json.priority).toBe(priority);
    expect(json.start).toBe(start);
  });
});
