import WebSocket from 'ws';
import axios from 'axios';

/**
 * Service quản lý kết nối WebSocket tới Pterodactyl Server Console & Stats
 */
export class PterodactylWebSocket {
  /**
   * @param {Object} options
   * @param {string} options.apiKey
   * @param {string} options.cookie
   * @param {string} options.serverId
   * @param {string} options.baseUrl
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey || '';
    this.cookie = options.cookie || '';
    this.serverId = options.serverId || '';
    this.baseUrl = (options.baseUrl || 'https://cp.pikamc.vn').replace(/\/+$/, '');

    this.ws = null;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.tokenRefreshInterval = null;

    // Cache thông số server từ WebSocket
    this.state = 'unknown';
    this.cpu = '0%';
    this.memory = '0 MB';
    this.disk = '0 MB';

    this.consoleLogCallback = null;
  }

  /**
   * Lấy WebSocket credentials (token & socket URL) từ API Client
   */
  async getWebsocketCredentials() {
    if (!this.apiKey && !this.cookie) {
      throw new Error('Chưa cấu hình API Key hoặc Cookie');
    }

    const url = `${this.baseUrl}/api/client/servers/${this.serverId}/websocket`;

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
      const data = response.data?.data || response.data;

      return {
        token: data.token,
        socket: data.socket,
      };
    } catch (error) {
      const status = error.response?.status;
      const responseBody = error.response?.data;

      let errorDetail = error.message;
      if (responseBody) {
        if (Array.isArray(responseBody.errors) && responseBody.errors.length > 0) {
          errorDetail = responseBody.errors.map((e) => e.detail || e.code || e.title).join(', ');
        } else if (typeof responseBody === 'string') {
          errorDetail = responseBody;
        }
      }

      throw new Error(`Không thể lấy WebSocket token (${status || 'Network Error'}): ${errorDetail}`);
    }
  }

  /**
   * Đăng ký callback nhận console log thời gian thực
   * @param {function(string): void} callback
   */
  onConsoleLog(callback) {
    this.consoleLogCallback = callback;
  }

  /**
   * Khởi tạo kết nối WebSocket
   */
  async connect() {
    if (!this.apiKey && !this.cookie) return;
    if (!this.serverId) return;

    try {
      const { token, socket } = await this.getWebsocketCredentials();

      if (this.ws) {
        try {
          this.ws.close();
        } catch {}
      }

      this.ws = new WebSocket(socket, {
        origin: this.baseUrl,
      });

      this.ws.on('open', () => {
        this.isConnected = true;
        console.log('📡 [WebSocket Connected]: Đã mở kết nối thành công!');
        // Gửi tin nhắn xác thực ngay khi mở kết nối
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
        if (code !== 1000) {
          console.warn(`⚠️ [WebSocket Closed] Code: ${code}, Reason: ${reason || 'N/A'}. Kết nối lại sau 5s...`);
          this.scheduleReconnect();
        }
      });

      this.startTokenRefreshLoop();
    } catch (error) {
      console.error('❌ Lỗi khi khởi tạo kết nối WebSocket:', error.message);
      if (error.message.includes('401') || error.message.includes('403')) {
        console.warn('⚠️ Dừng kết nối lại WebSocket tự động do lỗi xác thực (401/403). Vui lòng kiểm tra lại PIKAMC_API_KEY hoặc PIKAMC_COOKIE trong file .env');
        return;
      }
      this.scheduleReconnect();
    }
  }

  /**
   * Xử lý tin nhắn đến từ WebSocket
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
          this.refreshToken();
          break;
      }
    } catch {}
  }

  /**
   * Lên lịch tự động làm mới WebSocket Token định kỳ (Pterodactyl Token hết hạn sau 10-15 phút)
   */
  startTokenRefreshLoop() {
    this.stopTokenRefreshLoop();
    // Làm mới token mỗi 10 phút (600,000ms)
    this.tokenRefreshInterval = setInterval(() => {
      if (this.isConnected) {
        this.refreshToken();
      }
    }, 10 * 60 * 1000);
  }

  stopTokenRefreshLoop() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  /**
   * Làm mới token WebSocket bằng cách lấy token mới và gửi lệnh auth
   */
  async refreshToken() {
    try {
      const { token } = await this.getWebsocketCredentials();
      if (this.ws && this.isConnected) {
        this.ws.send(JSON.stringify({ event: 'auth', args: [token] }));
      }
    } catch (error) {
      console.error('Lỗi khi refresh WebSocket token:', error.message);
    }
  }

  /**
   * Lên lịch kết nối lại khi bị đứt mạng/socket đóng
   */
  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  /**
   * Trả về thông số trạng thái server hiện tại lưu trong cache
   */
  getStatus() {
    return {
      state: this.state,
      cpu: this.cpu,
      memory: this.memory,
      disk: this.disk,
      players: null,
    };
  }

  /**
   * Đóng kết nối WebSocket
   */
  close() {
    this.stopTokenRefreshLoop();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.isConnected = false;
  }
}
