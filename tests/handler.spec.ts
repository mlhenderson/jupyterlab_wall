import { requestAPI } from '../src/handler';
import { ServerConnection } from '@jupyterlab/services';

jest.mock('@jupyterlab/services', () => ({
  ServerConnection: {
    makeSettings: jest.fn(() => ({ baseUrl: 'http://localhost:8888/' })),
    makeRequest: jest.fn(),
    NetworkError: class extends Error {},
    ResponseError: class extends Error {
      constructor(
        public response: any,
        public message: string
      ) {
        super(message);
      }
    }
  }
}));

describe('requestAPI', () => {
  it('should return data on successful request', async () => {
    const mockResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue(JSON.stringify({ success: true }))
    };
    (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(mockResponse);

    const data = await requestAPI<any>('test');
    expect(data).toEqual({ success: true });
    expect(ServerConnection.makeRequest).toHaveBeenCalled();
  });

  it('should throw NetworkError on connection failure', async () => {
    (ServerConnection.makeRequest as jest.Mock).mockRejectedValue(
      new Error('Network failure')
    );

    await expect(requestAPI('test')).rejects.toThrow();
  });

  it('should throw ResponseError on non-ok response', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ message: 'Not Found' }))
    };
    (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(mockResponse);

    await expect(requestAPI('test')).rejects.toThrow('Not Found');
  });

  it('should handle non-JSON responses', async () => {
    const mockResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue('Not JSON')
    };
    (ServerConnection.makeRequest as jest.Mock).mockResolvedValue(mockResponse);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const data = await requestAPI<any>('test');
    expect(data).toBe('Not JSON');
    consoleSpy.mockRestore();
  });
});
