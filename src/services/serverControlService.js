import axios from 'axios';
import { PterodactylWebSocket } from './pterodactylWebSocket.js';

/**
 * Format số bytes sang dạng GiB hoặc MB chuẩn Pterodactyl
 */
function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '0 MB';
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(1)} GiB`;
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(0)} MB`;
}

/**
 * Format số MB từ server limits sang dạng GiB hoặc MB
 */
function formatMbToGb(mb) {
  if (!mb) return null;
  const gb = mb / 1024;
  if (gb >= 1) {
    return Number.isInteger(gb) ? `${gb} GiB` : `${gb.toFixed(1)} GiB`;
  }
  return `${mb} MB`;
}

/**
 * Service quản lý giao tiếp với Pterodactyl API để điều khiển máy chủ bằng Axios.
 */
export class ServerControlService {
  /**
   * @param {Object} [options]
   * @param {string} [options.apiKey]
   * @param {string} [options.cookie]
   * @param {string} [options.serverId]
   * @param {string} [options.baseUrl]
   */
  constructor(options = {}) {
    this.apiKey = (options.apiKey ?? process.env.PIKAMC_API_KEY ?? '').trim().replace(/^["']|["']$/g, '');
    this.cookie = (options.cookie ?? process.env.PIKAMC_COOKIE ?? process.env.PTERODACTYL_COOKIE ?? '').trim();
    this.serverId = (options.serverId ?? process.env.SERVER_ID ?? '').trim().replace(/^["']|["']$/g, '');
    this.baseUrl = (options.baseUrl ?? process.env.BASE_URL ?? 'https://cp.pikamc.vn').trim().replace(/\/+$/, '');

    this.serverDetails = null;

    this.pteroWs = new PterodactylWebSocket({
      apiKey: this.apiKey,
      cookie: this.cookie,
      serverId: this.serverId,
      baseUrl: this.baseUrl,
    });
  }

  /**
   * Validates and returns allowed signals
   */
  static ALLOWED_SIGNALS = ['start', 'stop', 'restart', 'kill'];

  /**
   * Kết nối WebSocket thời gian thực
   */
  async initWebSocket() {
    await this.pteroWs.connect();
  }

  /**
   * Lấy chi tiết thông tin cấu hình và allocations của máy chủ
   */
  async getServerDetails() {
    if (this.serverDetails) return this.serverDetails;

    const url = `${this.baseUrl}/api/client/servers/${this.serverId}?include=allocations`;
    try {
      const headers = { Accept: 'application/json' };
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
      if (this.cookie) headers['Cookie'] = this.cookie;

      const response = await axios.get(url, { headers });
      this.serverDetails = response.data?.attributes || null;
      return this.serverDetails;
    } catch {
      return null;
    }
  }

  /**
   * Truy vấn số người chơi đang online qua Minecraft Java Status Protocol (mcstatus.io)
   */
  async getOnlinePlayerCount() {
    try {
      const details = await this.getServerDetails();
      const allocations = details?.relationships?.allocations?.data || [];
      const primaryAlloc = allocations.find(a => a.attributes?.is_default) || allocations[0];

      const ip = primaryAlloc?.attributes?.ip_alias || primaryAlloc?.attributes?.ip || 'meteor.pikamc.vn';
      const port = primaryAlloc?.attributes?.port || 25364;

      const response = await axios.get(`https://api.mcstatus.io/v2/status/java/${ip}:${port}`, {
        timeout: 3000,
      });

      if (response.data?.online && response.data?.players) {
        return `${response.data.players.online} / ${response.data.players.max}`;
      }
      return '0 / 0';
    } catch {
      return null;
    }
  }

  /**
   * Gửi tín hiệu điều khiển nguồn tới server bằng Axios
   * @param {'start' | 'stop' | 'restart' | 'kill'} signal
   * @returns {Promise<{ success: boolean, signal: string, message: string }>}
   */
  async sendPowerSignal(signal) {
    if (!ServerControlService.ALLOWED_SIGNALS.includes(signal)) {
      throw new Error(`Signal không hợp lệ. Các signal hợp lệ: ${ServerControlService.ALLOWED_SIGNALS.join(', ')}`);
    }

    if (!this.apiKey && !this.cookie) {
      throw new Error('Chưa cấu hình API Key hoặc Cookie');
    }

    const url = `${this.baseUrl}/api/client/servers/${this.serverId}/power`;

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      if (this.cookie) {
        headers['Cookie'] = this.cookie;
      }

      await axios.post(url, { signal }, { headers });

      return {
        success: true,
        signal,
        message: `Đã gửi lệnh ${signal} tới server thành công.`,
      };
    } catch (error) {
      const status = error.response?.status;
      let errorDetail = error.message;
      if (error.response?.data) {
        const data = error.response.data;
        errorDetail = data.errors?.[0]?.detail || data.message || (typeof data === 'string' ? data : JSON.stringify(data));
      }
      throw new Error(`Lỗi từ Pterodactyl API (${status || 'Network Error'}): ${errorDetail}`);
    }
  }

  /**
   * Lấy thông tin trạng thái tài nguyên và số người chơi của máy chủ
   * @returns {Promise<{ state: string, memory: string, cpu: string, disk: string, players?: string }>}
   */
  async getServerStatus() {
    if (!this.apiKey && !this.cookie) {
      throw new Error('Chưa cấu hình API Key hoặc Cookie');
    }

    const details = await this.getServerDetails();
    const limits = details?.limits || null;
    const url = `${this.baseUrl}/api/client/servers/${this.serverId}/resources`;

    try {
      const headers = {
        'Accept': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      if (this.cookie) {
        headers['Cookie'] = this.cookie;
      }

      const response = await axios.get(url, { headers });

      const attrs = response.data?.attributes || {};
      const resources = attrs.resources || {};

      const state = attrs.current_state || 'unknown';

      let cpu = `${(resources.cpu_absolute ?? 0).toFixed(1)}%`;
      if (limits?.cpu && limits.cpu > 0) {
        cpu += ` / ${limits.cpu}%`;
      }

      let memory = formatBytes(resources.memory_bytes);
      const memoryLimitMb = resources.memory_limit_bytes
        ? resources.memory_limit_bytes / 1024 / 1024
        : limits?.memory;
      if (memoryLimitMb && memoryLimitMb > 0) {
        memory += ` / ${formatMbToGb(memoryLimitMb)}`;
      }

      let disk = formatBytes(resources.disk_bytes);
      const diskLimitMb = limits?.disk;
      if (diskLimitMb && diskLimitMb > 0) {
        disk += ` / ${formatMbToGb(diskLimitMb)}`;
      }

      let players = null;
      if (state === 'running') {
        players = await this.getOnlinePlayerCount();
      }

      return { state, cpu, memory, disk, players };
    } catch {
      return this.pteroWs.getStatus();
    }
  }
}
