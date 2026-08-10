import WebSocket from 'ws';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PANEL_URL = process.env.BASE_URL || 'https://cp.pikamc.vn';
const SERVER_ID = process.env.SERVER_ID || '';
const API_KEY = process.env.PIKAMC_API_KEY || '';
const COOKIE = process.env.PIKAMC_COOKIE || '';

async function testWebSocket() {
  console.log(`\n🔍 [Testing WS] URL: ${PANEL_URL}/api/client/servers/${SERVER_ID}/websocket`);
  console.log(`🔑 [API Key]: ${API_KEY ? API_KEY : 'Không có'}`);
  console.log(`🍪 [Cookie]: ${COOKIE ? `${COOKIE.substring(0, 30)}...` : 'Không có'}`);

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY.trim()}`;
  }

  if (COOKIE) {
    headers['Cookie'] = COOKIE.trim();
  }

  try {
    // 1. Gọi REST API lấy socket URL và token bằng Axios
    const res = await axios.get(`${PANEL_URL}/api/client/servers/${SERVER_ID}/websocket`, {
      headers,
    });

    const data = res.data?.data || res.data;
    console.log('✅ Lấy Token & Socket URL thành công!');
    console.log('🔑 Token:', data.token ? `${data.token.substring(0, 30)}...` : 'N/A');
    console.log('📡 Socket:', data.socket);

    // 2. Thử kết nối WebSocket
    const ws = new WebSocket(data.socket, { origin: PANEL_URL });

    ws.on('open', () => {
      console.log('🟢 Đã mở cổng WebSocket! Đang gửi Auth payload...');
      ws.send(JSON.stringify({ event: 'auth', args: [data.token] }));
      ws.send(JSON.stringify({ event: 'send stats', args: [null] }));
    });

    ws.on('message', (message) => {
      const parsed = JSON.parse(message.toString());
      console.log('📩 Nhận dữ liệu từ WS:', parsed.event, parsed.args || '');

      if (parsed.event === 'auth success') {
        console.log('🎉 XÁC THỰC WEBSOCKET THÀNH CÔNG! Bot đã có thể lắng nghe sự kiện.');
      }
    });

    ws.on('error', (err) => {
      console.error('❌ Lỗi kết nối WebSocket:', err.message);
    });

    ws.on('close', (code, reason) => {
      console.log(`🔴 WebSocket đã đóng (Code: ${code}, Reason: ${reason || 'Không có'})`);
    });

  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    console.error(`\n❌ [Lỗi HTTP ${status || 'Network Error'}]:`, data ? JSON.stringify(data, null, 2) : err.message);
  }
}

testWebSocket();