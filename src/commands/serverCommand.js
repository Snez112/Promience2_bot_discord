import { SlashCommandBuilder } from 'discord.js';

export const serverCommand = new SlashCommandBuilder()
  .setName('server')
  .setDescription('Quản lý và điều khiển máy chủ Minecraft (PikaMC)')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('panel')
      .setDescription('Mở Bảng Điều Khiển nút bấm để điều khiển server')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('status')
      .setDescription('Xem trạng thái hiện tại của máy chủ')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('signal')
      .setDescription('Gửi lệnh điều khiển trực tiếp tới máy chủ')
      .addStringOption((option) =>
        option
          .setName('action')
          .setDescription('Lệnh cần gửi')
          .setRequired(true)
          .addChoices(
            { name: '🟢 Start (Bật)', value: 'start' },
            { name: '🛑 Stop (Tắt an toàn)', value: 'stop' },
            { name: '🔄 Restart (Khởi động lại)', value: 'restart' },
            { name: '⚡ Kill (Tắt ép buộc)', value: 'kill' }
          )
      )
  );
