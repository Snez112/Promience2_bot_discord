import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { PterodactylWebSocket } from '../src/services/pterodactylWebSocket.js';

describe('PterodactylWebSocket with Axios', () => {
  const mockConfig = {
    apiKey: 'test_api_key_123',
    serverId: 'test_server_id',
    baseUrl: 'https://cp.pikamc.vn',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWebsocketCredentials', () => {
    it('should fetch websocket credentials using axios', async () => {
      const pteroWs = new PterodactylWebSocket(mockConfig);

      const axiosSpy = vi.spyOn(axios, 'get').mockResolvedValue({
        status: 200,
        data: {
          data: {
            token: 'ws_test_token_abc',
            socket: 'wss://cp.pikamc.vn/api/client/servers/test_server_id/ws',
          },
        },
      });

      const creds = await pteroWs.getWebsocketCredentials();

      expect(axiosSpy).toHaveBeenCalledWith(
        'https://cp.pikamc.vn/api/client/servers/test_server_id/websocket',
        {
          headers: {
            Authorization: 'Bearer test_api_key_123',
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(creds).toEqual({
        token: 'ws_test_token_abc',
        socket: 'wss://cp.pikamc.vn/api/client/servers/test_server_id/ws',
      });
    });
  });

  describe('WebSocket message parsing & status cache', () => {
    it('should parse status and stats events correctly', () => {
      const pteroWs = new PterodactylWebSocket(mockConfig);

      // Handle status event
      pteroWs.handleWsMessage(JSON.stringify({
        event: 'status',
        args: ['running'],
      }));

      expect(pteroWs.getStatus().state).toBe('running');

      // Handle stats event
      pteroWs.handleWsMessage(JSON.stringify({
        event: 'stats',
        args: [JSON.stringify({
          cpu_absolute: 25.4,
          memory_bytes: 2147483648,
          disk_bytes: 5368709120,
        })],
      }));

      const status = pteroWs.getStatus();
      expect(status.state).toBe('running');
      expect(status.cpu).toBe('25.4%');
      expect(status.memory).toBe('2048.0 MB');
      expect(status.disk).toBe('5120.0 MB');
    });
  });
});
