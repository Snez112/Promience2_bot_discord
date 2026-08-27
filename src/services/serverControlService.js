import axios from 'axios';
import { PterodactylWebSocket } from './pterodactylWebSocket.js';
import { pingMinecraftServer } from '../utils/mcPing.js';

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
  /**
   * Lấy chi tiết thông tin cấu hình và allocations của máy chủ
   */
  async getServerDetails() {
    if (this.serverDetails) return this.serverDetails;

    const url = `${this.baseUrl}/api/client/servers/${this.serverId}?include=allocations`;
    console.log(`🔍 [getServerDetails] Đang lấy thông tin server (${this.serverId}) từ ${url}`);
    try {
      const headers = { Accept: 'application/json' };
      if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
      if (this.cookie) headers['Cookie'] = this.cookie;

      const response = await axios.get(url, { headers });
      this.serverDetails = response.data?.attributes || null;
      console.log(`✅ [getServerDetails] Thành công lấy thông tin cấu hình server "${this.serverDetails?.name || this.serverId}"`);
      return this.serverDetails;
    } catch (error) {
      const status = error.response?.status;
      console.error(`❌ [getServerDetails] Lỗi khi gọi Pterodactyl API (${status || 'Network Error'}):`, error.message);
      return null;
    }
  }

  /**
   * Truy vấn số người chơi đang online (Ưu tiên Direct TCP Socket -> Web APIs Fallback)
   */
  async getOnlinePlayerCount() {
    try {
      const details = await this.getServerDetails();
      const allocations = details?.relationships?.allocations?.data || [];
      const primaryAlloc = allocations.find(a => a.attributes?.is_default) || allocations[0];

      const ip = process.env.SERVER_IP || primaryAlloc?.attributes?.ip_alias || primaryAlloc?.attributes?.ip || 'meteor.pikamc.vn';
      const port = Number(process.env.SERVER_PORT || primaryAlloc?.attributes?.port || 25364);

      // 1. Ưu tiên: Kết nối TCP trực tiếp từ Bot tới Server Minecraft (Nhanh nhất & Không phụ thuộc Web API ngoài)
      try {
        console.log(`⚡ [getOnlinePlayerCount] Kiểm tra trực tiếp qua TCP Socket SLP (${ip}:${port})...`);
        const mcStatus = await pingMinecraftServer(ip, port, 3000);
        if (mcStatus && mcStatus.online) {
          const result = `${mcStatus.playersOnline} / ${mcStatus.playersMax}`;
          console.log(`✅ [getOnlinePlayerCount] (Direct TCP SLP) Người chơi online: ${result}`);
          return result;
        }
      } catch (tcpErr) {
        console.warn(`⚠️ [getOnlinePlayerCount] Direct TCP SLP thất bại (${tcpErr.message}), thử qua Web APIs dự phòng...`);
      }

      // 2. Dự phòng 1: Thử qua mcstatus.io
      try {
        console.log(`🎮 [getOnlinePlayerCount] Đang kiểm tra người chơi qua mcstatus.io (${ip}:${port})`);
        const response = await axios.get(`https://api.mcstatus.io/v2/status/java/${ip}:${port}`, {
          timeout: 3000,
        });

        if (response.data?.online && response.data?.players) {
          const result = `${response.data.players.online} / ${response.data.players.max}`;
          console.log(`✅ [getOnlinePlayerCount] (mcstatus.io) Người chơi online: ${result}`);
          return result;
        }
      } catch (err) {
        console.warn(`⚠️ [getOnlinePlayerCount] mcstatus.io bị lỗi (${err.response?.status || err.message}), chuyển sang API dự phòng (mcsrvstat.us)...`);
      }

      // 3. Dự phòng 2: Fallback qua mcsrvstat.us
      try {
        console.log(`🎮 [getOnlinePlayerCount] Đang kiểm tra người chơi qua mcsrvstat.us (${ip}:${port})`);
        const response = await axios.get(`https://api.mcsrvstat.us/2/${ip}:${port}`, {
          timeout: 4000,
        });

        if (response.data?.online && response.data?.players) {
          const result = `${response.data.players.online} / ${response.data.players.max}`;
          console.log(`✅ [getOnlinePlayerCount] (mcsrvstat.us) Người chơi online: ${result}`);
          return result;
        }
      } catch (err) {
        console.warn(`⚠️ [getOnlinePlayerCount] mcsrvstat.us bị lỗi:`, err.message);
      }

      console.log(`ℹ️ [getOnlinePlayerCount] Server offline hoặc các API status không phản hồi (${ip}:${port})`);
      return '0 / 0';
    } catch (error) {
      console.warn(`⚠️ [getOnlinePlayerCount] Không thể lấy thông tin người chơi:`, error.message);
      return '0 / 0';
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
    console.log(`🚀 [sendPowerSignal] Đang gửi signal "${signal}" tới server ${this.serverId} tại ${url}`);

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
      console.log(`✅ [sendPowerSignal] Gửi signal "${signal}" thành công!`);

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
      console.error(`❌ [sendPowerSignal] Lỗi từ Pterodactyl API (${status || 'Network Error'}):`, errorDetail);
      throw new Error(`Lỗi từ Pterodactyl API (${status || 'Network Error'}): ${errorDetail}`);
    }
  }

  /**
   * Lấy thông tin trạng thái tài nguyên và số người chơi của máy chủ
   * @returns {Promise<{ state: string, memory: string, cpu: string, disk: string, players?: string }>}
   */
  async getServerStatus() {
    if (!this.apiKey && !this.cookie) {
      console.error('❌ [getServerStatus] Chưa cấu hình API Key hoặc Cookie trong file .env');
      throw new Error('Chưa cấu hình API Key hoặc Cookie');
    }

    const details = await this.getServerDetails();
    const limits = details?.limits || null;
    const url = `${this.baseUrl}/api/client/servers/${this.serverId}/resources`;
    console.log(`📊 [getServerStatus] Đang lấy tài nguyên server (${this.serverId}) từ ${url}`);

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

      console.log(`✅ [getServerStatus] Lấy thông tin thành công: State=${state}, RAM=${memory}, CPU=${cpu}, Disk=${disk}`);
      return { state, cpu, memory, disk, players };
    } catch (error) {
      const status = error.response?.status;
      console.error(`❌ [getServerStatus] Lỗi khi gọi API resources (${status || 'Network Error'}):`, error.message);
      console.log('🔄 [getServerStatus] Thử chuyển sang WebSocket / Direct status fallback...');
      const fallbackStatus = this.pteroWs.getStatus();
      if (!fallbackStatus.players || fallbackStatus.players === '0 / 0') {
        fallbackStatus.players = await this.getOnlinePlayerCount();
      }
      return fallbackStatus;
    }
  }
}
