import WebSocket from 'ws';
import axios from 'axios';

/**
 * Quản lý kết nối WebSocket thời gian thực tới Pterodactyl Panel
 */
export class PterodactylWebSocket {
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

    this.state = 'unknown';
    this.cpu = '0%';
    this.memory = '0 MB';
    this.disk = '0 MB';

    this.ws = null;
    this.reconnectTimer = null;
    this.isConnected = false;
  }

  /**
   * Lấy WebSocket credentials từ REST API của Pterodactyl bằng Axios
   * GET /api/client/servers/{serverId}/websocket
   */
  async getWebsocketCredentials() {
    if (!this.apiKey && !this.cookie) {
      throw new Error('Chưa cấu hình API Key hoặc Cookie');
    }

    const url = `${this.baseUrl}/api/client/servers/${this.serverId}/websocket`;
    const maskedKey = this.apiKey.length > 8 ? `${this.apiKey.substring(0, 8)}...` : this.apiKey;

    console.log(`\n🔍 [API Request] GET ${url}`);
    if (this.apiKey) {
      console.log(`🔑 [Authorization Header]: Bearer ${maskedKey}`);
    }
    if (this.cookie) {
      console.log(`🍪 [Cookie Header]: ${this.cookie.substring(0, 30)}...`);
    }

    try {
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      if (this.cookie) {
        headers['Cookie'] = this.cookie;
      }

      const response = await axios.get(url, { headers });

      console.log(`✅ [API Success ${response.status}]: Response Data:`, JSON.stringify(response.data, null, 2));

      const data = response.data?.data || response.data;

      console.log(`🔑 [WS Token]: ${data.token ? data.token.substring(0, 30) + '...' : 'N/A'}`);
      console.log(`📡 [WS Socket URL]: ${data.socket}`);

      return {
        token: data.token,
        socket: data.socket,
      };
    } catch (error) {
      const status = error.response?.status;
      const responseBody = error.response?.data;

      console.error(`❌ [API Failed Status ${status || 'Network Error'}]:`);
      if (responseBody) {
        console.error(`📄 [Response Error Body]:`, JSON.stringify(responseBody, null, 2));
      } else {
        console.error(`📄 [Error Message]:`, error.message);
      }

      let errorDetail = error.message;
      if (responseBody) {
        errorDetail = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
      }
      throw new Error(`Không thể lấy WebSocket token (${status || 'Network Error'}): ${errorDetail}`);
    }
  }

  /**
   * Khởi tạo kết nối WebSocket thời gian thực
   */
  async connect() {
    try {
      const { token, socket } = await this.getWebsocketCredentials();

      if (this.ws) {
        try {
          this.ws.close();
        } catch {}
      }

      console.log(`🔌 Đang mở kết nối WebSocket tới: ${socket}`);
      this.ws = new WebSocket(socket, {
        origin: this.baseUrl,
      });

      this.ws.on('open', () => {
        this.isConnected = true;
        console.log('📡 [WebSocket Connected]: Đã mở kết nối thành công!');
        // Gửi tin nhắn xác thực ngay khi mở kết nối
        console.log('📤 [WebSocket Send]: Sending Auth Token...');
        this.ws.send(JSON.stringify({ event: 'auth', args: [token] }));
        // Yêu cầu lấy thông số stats & status ban đầu
        this.ws.send(JSON.stringify({ event: 'send stats', args: [null] }));
      });

      this.ws.on('message', (data) => {
        this.handleWsMessage(data.toString());
      });

      this.ws.on('error', (err) => {
        console.error('⚠️ [WebSocket Error]:', err.message);
      });

      this.ws.on('close', (code, reason) => {
        this.isConnected = false;
        console.warn(`⚠️ [WebSocket Closed] Code: ${code}, Reason: ${reason || 'N/A'}. Kết nối lại sau 5s...`);
        this.scheduleReconnect();
      });
    } catch (error) {
      console.error('❌ Lỗi khi khởi tạo kết nối WebSocket:', error.message);
      // Nếu lỗi 401 (Unauthenticated) hoặc 403 (Forbidden), không lặp lại
      if (!error.message.includes('401') && !error.message.includes('403')) {
        this.scheduleReconnect();
      } else {
        console.warn('⚠️ Dừng kết nối lại WebSocket tự động do lỗi xác thực (401/403). Vui lòng kiểm tra lại PIKAMC_API_KEY hoặc PIKAMC_COOKIE trong file .env');
      }
    }
  }

  /**
   * Xử lý tin nhắn WebSocket nhận từ Pterodactyl
   * @param {string} rawMessage
   */
  handleWsMessage(rawMessage) {
    try {
      const parsed = JSON.parse(rawMessage);
      const { event, args } = parsed || {};

      if (!event || !Array.isArray(args)) return;

      switch (event) {
        case 'status':
          this.state = args[0] || 'unknown';
          break;

        case 'stats':
          if (args[0]) {
            try {
              const stats = typeof args[0] === 'string' ? JSON.parse(args[0]) : args[0];
              this.cpu = `${(stats.cpu_absolute ?? 0).toFixed(1)}%`;
              this.memory = stats.memory_bytes
                ? `${(stats.memory_bytes / 1024 / 1024).toFixed(1)} MB`
                : '0 MB';
              this.disk = stats.disk_bytes
                ? `${(stats.disk_bytes / 1024 / 1024).toFixed(1)} MB`
                : '0 MB';
              if (stats.state) {
                this.state = stats.state;
              }
            } catch {}
          }
          break;

        case 'console output':
          if (args[0] && typeof this.consoleLogCallback === 'function') {
            this.consoleLogCallback(args[0]);
          }
          break;

        case 'token expiring':
        case 'token expired':
          console.log('🔄 [WebSocket Token Expiring]: Đang lấy token mới...');
          this.refreshToken();
          break;

        default:
          break;
      }
    } catch {
      // ignore non-json messages
    }
  }

  /**
   * Cài đặt hàm callback nhận log console thời gian thực
   * @param {(line: string) => void} callback
   */
  onConsoleLog(callback) {
    this.consoleLogCallback = callback;
  }

  /**
   * Tự làm mới Token khi nhận thông báo hết hạn từ WebSocket
   */
  async refreshToken() {
    try {
      const { token } = await this.getWebsocketCredentials();
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'auth', args: [token] }));
      }
    } catch (error) {
      console.error('Lỗi khi refresh WebSocket token:', error.message);
    }
  }

  /**
   * Lên lịch kết nối lại khi mất mạng hoặc ngắt kết nối
   */
  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  /**
   * Trả về thông tin trạng thái máy chủ hiện tại từ cache WebSocket
   * @returns {{ state: string, cpu: string, memory: string, disk: string }}
   */
  getStatus() {
    return {
      state: this.state,
      cpu: this.cpu,
      memory: this.memory,
      disk: this.disk,
    };
  }

  /**
   * Đóng kết nối WebSocket an toàn
   */
  close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
  }
}
