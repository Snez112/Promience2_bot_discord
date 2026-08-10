import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { ServerControlService } from './services/serverControlService.js';
import { buildServerEmbed, buildControlButtons } from './ui/serverEmbed.js';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.warn('⚠️ CẢNH BÁO: DISCORD_TOKEN chưa được cài đặt trong file .env');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const serverService = new ServerControlService();

client.once('ready', (c) => {
  console.log(`🤖 Bot Discord đã sẵn sàng! Đăng nhập dưới tên: ${c.user.tag}`);
  console.log(`🆔 Server ID đang điều khiển: ${serverService.serverId}`);
  console.log(`🌐 API Base URL: ${serverService.baseUrl}`);
  console.log('⚡ Chế độ: On-Demand REST API Status Check');
});

client.on('interactionCreate', async (interaction) => {
  try {
    // Xử lý Slash Commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'server') {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'panel') {
          await interaction.deferReply();

          let statusData;
          try {
            statusData = await serverService.getServerStatus();
          } catch (err) {
            console.error('Lỗi khi lấy trạng thái server:', err.message);
            statusData = { state: 'unknown', cpu: 'N/A', memory: 'N/A', disk: 'N/A' };
          }

          const embed = buildServerEmbed(statusData, { title: '🎮 Bảng Điều Khiển Server Minecraft' });
          const buttons = buildControlButtons(statusData.state);

          await interaction.editReply({ embeds: [embed], components: [buttons] });
          return;
        }

        if (subcommand === 'status') {
          await interaction.deferReply();

          let statusData;
          try {
            statusData = await serverService.getServerStatus();
          } catch (err) {
            console.error('Lỗi khi lấy trạng thái server:', err.message);
            statusData = { state: 'unknown', cpu: 'N/A', memory: 'N/A', disk: 'N/A' };
          }

          const embed = buildServerEmbed(statusData, { title: '📊 Thông Tin Server Minecraft' });

          await interaction.editReply({ embeds: [embed] });
          return;
        }

        if (subcommand === 'signal') {
          await interaction.deferReply();
          const action = interaction.options.getString('action', true);

          try {
            const result = await serverService.sendPowerSignal(action);
            await interaction.editReply({
              content: `✅ **Thành công!** ${result.message}`,
            });
          } catch (err) {
            await interaction.editReply({
              content: `❌ **Thất bại!** ${err.message}`,
            });
          }
          return;
        }
      }
    }

    // Xử lý Button Interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId.startsWith('server_signal_')) {
        const signal = customId.replace('server_signal_', '');

        await interaction.deferReply({ ephemeral: true });

        try {
          const result = await serverService.sendPowerSignal(signal);
          await interaction.editReply({
            content: `🚀 **Đã gửi lệnh \`${signal}\` thành công!**\n_${result.message}_`,
          });

          // Cập nhật lại giao diện Embed & Nút bấm động theo trạng thái mới
          if (interaction.message) {
            try {
              const statusData = await serverService.getServerStatus();
              const embed = buildServerEmbed(statusData, { title: '🎮 Bảng Điều Khiển Server Minecraft' });
              const buttons = buildControlButtons(statusData.state);
              await interaction.message.edit({ embeds: [embed], components: [buttons] });
            } catch {
              // Bỏ qua lỗi cập nhật lại embed phụ
            }
          }
        } catch (err) {
          await interaction.editReply({
            content: `❌ **Lỗi gửi lệnh \`${signal}\`:** ${err.message}`,
          });
        }
      }
    }
  } catch (error) {
    console.error('Lỗi không xác định trong interaction handler:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Đã có lỗi xảy ra khi xử lý yêu cầu này.',
        ephemeral: true,
      });
    }
  }
});

if (token) {
  client.login(token);
} else {
  console.error('❌ Không thể khởi chạy Bot vì thiếu DISCORD_TOKEN trong file .env');
}
