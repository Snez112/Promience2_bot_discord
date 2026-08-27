import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { serverCommand } from './commands/serverCommand.js';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Lỗi: Bạn chưa cung cấp DISCORD_TOKEN hoặc CLIENT_ID trong file .env');
  process.exit(1);
}

const commands = [serverCommand.toJSON()];
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔄 Đang làm sạch và đăng ký lại các slash command với Discord...');

    if (guildId) {
      // 1. Xóa hết các command ở cấp Global để tránh bị trùng lặp lệnh
      await rest.put(Routes.applicationCommands(clientId), { body: [] });
      console.log('🧹 Đã dọn dẹp các lệnh Global cũ để tránh trùng lặp.');

      // 2. Đăng ký duy nhất bộ lệnh mới vào Guild ID
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log(`✅ Đã đăng ký thành công bộ lệnh duy nhất cho Guild ID (${guildId}) [Cập nhật tức thì 0s]!`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      console.log('✅ Đã đăng ký thành công các slash command toàn cầu (Global)!');
    }
  } catch (error) {
    console.error('❌ Có lỗi xảy ra khi đăng ký slash command:', error);
  }
})();
