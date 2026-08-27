import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import { ServerControlService } from './services/serverControlService.js';
import { handleInteraction } from './handlers/interactionHandler.js';
import { parseMinecraftLog } from './utils/mcLogParser.js';
import { buildLogEmbed } from './ui/logEmbed.js';
import { loadGuildConfigs } from './utils/configStore.js';
import http from 'http';

dotenv.config();
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.warn('⚠️ CẢNH BÁO: DISCORD_TOKEN chưa được cài đặt trong file .env');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const serverService = new ServerControlService();

client.once(Events.ClientReady, async (c) => {
  console.log(`🤖 Bot Discord đã sẵn sàng! Đăng nhập dưới tên: ${c.user.tag}`);
  console.log(`🆔 Server ID đang điều khiển: ${serverService.serverId}`);
  console.log(`🌐 API Base URL: ${serverService.baseUrl}`);
  console.log('⚡ Chế độ: On-Demand REST API Status Check + Live WebSocket Log Monitoring');

  // Lắng nghe log thời gian thực từ WebSocket Pterodactyl
  serverService.pteroWs.onConsoleLog(async (rawLine) => {
    const parsed = parseMinecraftLog(rawLine);
    if (!parsed) return;

    console.log(`📣 [Minecraft Event Detected] Loại: ${parsed.type.toUpperCase()} | Nội dung: "${parsed.message}"`);

    const embed = buildLogEmbed(parsed);
    if (!embed) return;

    const configs = loadGuildConfigs();
    for (const [guildId, config] of Object.entries(configs)) {
      if (!config.logChannelId) continue;
      try {
        const channel = client.channels.cache.get(config.logChannelId) || await client.channels.fetch(config.logChannelId);
        if (channel && channel.isTextBased()) {
          await channel.send({ embeds: [embed] });
          console.log(`✅ [Log Sent] Đã gửi thông báo log thành công tới kênh #${channel.name || config.logChannelId}`);
        }
      } catch (err) {
        if (err.message?.includes('Missing Access') || err.code === 50001) {
          console.error(`❌ [Log Error] Bot thiếu quyền trong kênh ${config.logChannelId}! Vui lòng cho phép Bot có quyền "View Channel" & "Send Messages" & "Embed Links".`);
        } else {
          console.error(`❌ Không thể gửi log tới kênh ${config.logChannelId}:`, err.message);
        }
      }
    }
  });

  // Khởi chạy kết nối WebSocket theo dõi log live
  try {
    await serverService.initWebSocket();
  } catch (wsErr) {
    console.warn('⚠️ Dừng bật WebSocket live log monitor do chưa có API Key/Cookie:', wsErr.message);
  }
});

client.on(Events.Error, (error) => {
  console.error('❌ Lỗi từ Discord Client:', error);
});

client.on(Events.InteractionCreate, async (interaction) => {
  await handleInteraction(interaction, serverService);
});

const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Prominece2 V4.0.2 bot is running');
});
server.listen(PORT, '0.0.0.0', () => {
  console.log('HTTP listening on', PORT);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));

if (token) {
  client.login(token);
} else {
  console.error('❌ Không thể khởi chạy Bot vì thiếu DISCORD_TOKEN trong file .env');
}
