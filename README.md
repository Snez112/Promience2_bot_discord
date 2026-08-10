# 🤖 Discord Bot Control Pterodactyl Server (PikaMC)

Discord Bot giúp điều khiển và giám sát server Minecraft trực tiếp trên Discord thông qua **Pterodactyl API** (`cp.pikamc.vn`).

---

## 🌟 Tính Năng

- 🟢 **Bật Server (Start)**
- 🛑 **Tắt Server (Stop - chờ dừng an toàn)**
- 🔄 **Khởi Động Lại (Restart)**
- ⚡ **Tắt Ép Buộc (Kill)**
- 📊 **Xem Trạng Thái Trực Tiếp** (CPU, RAM, Storage, Status)
- 🎛️ **Bảng Điều Khiển Nút Nhấn (Interactive Button Panel)**
- ⚡ **Hỗ trợ Slash Commands** (`/server panel`, `/server status`, `/server signal`)

---

## 🛠️ Hướng Dẫn Cài Đặt

### 1. Tải về và Cài Đặt Dependencies

```bash
npm install
```

### 2. Cấu Hình File `.env`

Tạo file `.env` từ file mẫu `.env.example`:

```bash
cp .env.example .env
```

Mở file `.env` và điền các thông tin của bạn:

```env
# Discord Token & Client ID từ Discord Developer Portal
DISCORD_TOKEN=điền_token_bot_discord_ở_đây
CLIENT_ID=điền_client_id_bot_discord_ở_đây

# Pterodactyl API Key từ https://cp.pikamc.vn/account/api
PIKAMC_API_KEY=

# Server ID 
SERVER_ID=

# API Base URL (mặc định: https://cp.pikamc.vn)
BASE_URL=https://cp.pikamc.vn
```

---

## 🚀 Đăng Ký Slash Commands & Chạy Bot

### Bước 1: Đăng Ký Slash Commands
Mỗi khi khởi tạo Bot hoặc thay đổi lệnh slash, hãy chạy lệnh sau để đăng ký các lệnh với Discord:

```bash
npm run deploy-commands
```

### Bước 2: Chạy Bot

```bash
npm start
```

---

## 🧪 Chạy Kiểm Thử (Unit Tests)

Dự án được phát triển theo phương pháp **TDD (Test-Driven Development)** với **Vitest**:

```bash
npm test
```

---

## 📖 Cách Sử Dụng Trên Discord

Sau khi Bot đã chạy và thêm vào Server Discord của bạn:

1. **Gõ lệnh `/server panel`**:
   - Bot sẽ hiển thị Embed màu sắc thể hiện trạng thái server (Running/Offline/Starting/Stopping) kèm 4 nút bấm điều khiển trực quan.
2. **Gõ lệnh `/server signal action: start`** (hoặc `stop`, `restart`, `kill`):
   - Bot sẽ gửi lệnh điều khiển trực tiếp tới Pterodactyl API.
3. **Gõ lệnh `/server status`**:
   - Xem thông số chi tiết CPU, RAM, Disk và trạng thái hiện tại.
