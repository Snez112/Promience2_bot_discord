import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { serverCommand } from './commands/serverCommand.js';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('❌ Lỗi: Bạn chưa cung cấp DISCORD_TOKEN hoặc CLIENT_ID trong file .env');
  process.exit(1);
}

const commands = [serverCommand.toJSON()];
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔄 Đang đăng ký các slash command với Discord...');

    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log('✅ Đã đăng ký thành công các slash command!');
  } catch (error) {
    console.error('❌ Có lỗi xảy ra khi đăng ký slash command:', error);
  }
})();
