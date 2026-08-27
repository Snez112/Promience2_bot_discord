import { SlashCommandBuilder, ChannelType } from 'discord.js';

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
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('setlog')
      .setDescription('Cài đặt kênh nhận thông báo log Minecraft (Chỉ Authorized User)')
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('Kênh nhận thông báo log')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('testlog')
      .setDescription('Gửi một tin nhắn log thử nghiệm tới kênh đã cài đặt (Chỉ Authorized User)')
  );
