import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { ServerControlService } from '../src/services/serverControlService.js';
import * as mcPing from '../src/utils/mcPing.js';

describe('ServerControlService with Axios', () => {
  const mockConfig = {
    apiKey: 'test_api_key_123',
    serverId: 'test_server_id',
    baseUrl: 'https://cp.pikamc.vn',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendPowerSignal', () => {
    it('should throw error if signal is invalid', async () => {
      const service = new ServerControlService(mockConfig);
      await expect(service.sendPowerSignal('invalid_signal')).rejects.toThrow(
        'Signal không hợp lệ. Các signal hợp lệ: start, stop, restart, kill'
      );
    });

    it('should throw error if apiKey is missing', async () => {
      const service = new ServerControlService({ ...mockConfig, apiKey: '' });
      await expect(service.sendPowerSignal('start')).rejects.toThrow(
        'Chưa cấu hình API Key hoặc Cookie'
      );
    });

    it('should send correct POST request to Pterodactyl API on valid signal using axios', async () => {
      const service = new ServerControlService(mockConfig);

      const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
        status: 204,
        data: {},
      });

      const result = await service.sendPowerSignal('start');

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(postSpy).toHaveBeenCalledWith(
        'https://cp.pikamc.vn/api/client/servers/test_server_id/power',
        { signal: 'start' },
        {
          headers: {
            Authorization: 'Bearer test_api_key_123',
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      expect(result).toEqual({
        success: true,
        signal: 'start',
        message: 'Đã gửi lệnh start tới server thành công.',
      });
    });

    it('should handle API error status codes correctly with axios', async () => {
      const service = new ServerControlService(mockConfig);

      vi.spyOn(axios, 'post').mockRejectedValue({
        response: {
          status: 401,
          data: 'Unauthenticated.',
        },
        message: 'Request failed with status code 401',
      });

      await expect(service.sendPowerSignal('restart')).rejects.toThrow(
        'Lỗi từ Pterodactyl API (401): Unauthenticated.'
      );
    });
  });

  describe('getServerStatus', () => {
    it('should fetch server details using axios', async () => {
      vi.spyOn(mcPing, 'pingMinecraftServer').mockRejectedValue(new Error('TCP Error'));
      const service = new ServerControlService(mockConfig);
      vi.spyOn(axios, 'get').mockImplementation((url) => {
        if (url.includes('mcstatus.io')) {
          return Promise.resolve({
            status: 200,
            data: {
              online: true,
              players: { online: 3, max: 50 },
            },
          });
        }
        if (url.endsWith('/resources')) {
          return Promise.resolve({
            status: 200,
            data: {
              attributes: {
                current_state: 'running',
                is_suspended: false,
                resources: {
                  memory_bytes: 6335078400, // ~5.9 GiB
                  cpu_absolute: 15.5,
                  disk_bytes: 10737418240, // ~10 GiB
                },
              },
            },
          });
        }
        return Promise.resolve({
          status: 200,
          data: {
            attributes: {
              limits: {
                memory: 10240, // 10 GiB
                disk: 40960, // 40 GiB
                cpu: 600,
              },
              relationships: {
                allocations: {
                  data: [
                    { attributes: { ip_alias: 'meteor.pikamc.vn', port: 25364, is_default: true } },
                  ],
                },
              },
            },
          },
        });
      });

      const status = await service.getServerStatus();

      expect(status.state).toBe('running');
      expect(status.cpu).toBe('15.5% / 600%');
      expect(status.memory).toBe('5.9 GiB / 10 GiB');
      expect(status.disk).toBe('10.0 GiB / 40 GiB');
      expect(status.players).toBe('3 / 50');
    });

    it('should fallback to mcstatus.io query even if Pterodactyl API fails with 401', async () => {
      vi.spyOn(mcPing, 'pingMinecraftServer').mockRejectedValue(new Error('TCP Error'));
      const service = new ServerControlService(mockConfig);
      vi.spyOn(axios, 'get').mockImplementation((url) => {
        if (url.includes('mcstatus.io')) {
          return Promise.resolve({
            status: 200,
            data: {
              online: true,
              players: { online: 5, max: 100 },
            },
          });
        }
        return Promise.reject({
          response: { status: 401, data: 'Unauthenticated.' },
        });
      });

      const players = await service.getOnlinePlayerCount();
      expect(players).toBe('5 / 100');

      const status = await service.getServerStatus();
      expect(status.players).toBe('5 / 100');
    });
  });
});
