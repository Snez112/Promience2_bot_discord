import { MessageFlags } from 'discord.js';
import { buildServerEmbed, buildControlButtons } from '../ui/serverEmbed.js';
import { setGuildLogChannel, getGuildLogChannel } from '../utils/configStore.js';
import { buildLogEmbed } from '../ui/logEmbed.js';

// Danh sách các Discord User ID được phép dùng lệnh setlog và testlog
const ALLOWED_USER_IDS = (process.env.ALLOWED_USER_IDS || '645943983562031145')
  .split(',')
  .map((id) => id.trim());

function isUserAllowed(userId) {
  if (!userId) return false;
  return ALLOWED_USER_IDS.includes(String(userId));
}

/**
 * Handles incoming Discord interactions (slash commands and button clicks)
 * @param {import('discord.js').Interaction} interaction
 * @param {import('../services/serverControlService.js').ServerControlService} serverService
 */
export async function handleInteraction(interaction, serverService) {
  try {
    // Xử lý Slash Commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'server') {
        const subcommand = interaction.options.getSubcommand();
        console.log(`📩 [Slash Command] /server ${subcommand} từ user: ${interaction.user?.tag} (ID: ${interaction.user?.id}) (Guild: ${interaction.guildId || 'DM'})`);

        if (subcommand === 'testlog') {
          if (!isUserAllowed(interaction.user?.id)) {
            await interaction.reply({
              content: `❌ **Thất bại:** Bạn không có quyền thực hiện lệnh này. (ID của bạn: \`${interaction.user?.id}\`)`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const channelId = getGuildLogChannel(interaction.guildId);
          if (!channelId) {
            await interaction.reply({
              content: '⚠️ **Chưa cài đặt kênh log:** Vui lòng gõ lệnh `/server setlog` để chọn kênh nhận thông báo trước!',
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          try {
            const channel = interaction.client.channels.cache.get(channelId) || await interaction.client.channels.fetch(channelId);
            if (channel && channel.isTextBased()) {
              const testEmbed = buildLogEmbed({
                type: 'death',
                message: `${interaction.user.username} (Test Player) fell from a high place`,
              });
              await channel.send({ embeds: [testEmbed] });
              await interaction.reply({
                content: `✅ **Đã gửi thông báo log thử nghiệm thành công vào kênh:** <#${channelId}>!`,
                flags: MessageFlags.Ephemeral,
              });
            } else {
              await interaction.reply({
                content: `❌ **Không thể tìm thấy kênh log:** Kênh <#${channelId}> không khả dụng.`,
                flags: MessageFlags.Ephemeral,
              });
            }
          } catch (err) {
            await interaction.reply({
              content: `❌ **Lỗi khi gửi log thử nghiệm tới kênh:** ${err.message}`,
              flags: MessageFlags.Ephemeral,
            });
          }
          return;
        }

        if (subcommand === 'setlog') {
          if (!isUserAllowed(interaction.user?.id)) {
            await interaction.reply({
              content: `❌ **Thất bại:** Bạn không có quyền thực hiện lệnh này. (ID của bạn: \`${interaction.user?.id}\`)`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const targetChannel = interaction.options.getChannel('channel', true);
          setGuildLogChannel(interaction.guildId, targetChannel.id);

          await interaction.reply({
            content: `✅ **Đã cài đặt kênh nhận thông báo log Minecraft:** <#${targetChannel.id}>\n_(Chỉ bạn mới nhìn thấy thông tin này)_`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (subcommand === 'panel') {
          await interaction.deferReply();
          const status = await serverService.getServerStatus();
          const embed = buildServerEmbed(status);
          const buttons = buildControlButtons(status.state);
          await interaction.followUp({
            embeds: [embed],
            components: [buttons],
          });
          return;
        }

        if (subcommand === 'status') {
          await interaction.deferReply();
          const status = await serverService.getServerStatus();
          const embed = buildServerEmbed(status);
          await interaction.followUp({ embeds: [embed] });
          return;
        }

        if (subcommand === 'signal') {
          await interaction.deferReply();
          const action = interaction.options.getString('action', true);
          const resultMessage = await serverService.sendPowerSignal(action);
          const status = await serverService.getServerStatus();
          const updatedEmbed = buildServerEmbed(status);
          await interaction.followUp({
            content: resultMessage,
            embeds: [updatedEmbed],
          });
          return;
        }
      }
    }

    // Xử lý Button Clicks
    if (interaction.isButton()) {
      const customId = interaction.customId;
      console.log(`🔘 [Button Click] ${customId} từ user: ${interaction.user?.tag} (${interaction.user?.id})`);

      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      let action = customId;
      if (customId.startsWith('btn_')) {
        action = customId.replace('btn_', '');
      }

      if (['start', 'stop', 'restart', 'kill'].includes(action)) {
        const resultMessage = await serverService.sendPowerSignal(action);
        await interaction.followUp({
          content: resultMessage,
          flags: MessageFlags.Ephemeral,
        });

        if (interaction.message && interaction.message.editable) {
          try {
            const status = await serverService.getServerStatus();
            const updatedEmbed = buildServerEmbed(status);
            const updatedButtons = buildControlButtons(status.state);
            await interaction.message.edit({
              embeds: [updatedEmbed],
              components: [updatedButtons],
            });
          } catch (editError) {
            console.error('⚠️ Không thể cập nhật message chứa panel:', editError.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Lỗi xảy ra khi xử lý interaction:', error);

    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({
          content: '❌ **Lỗi:** Đã xảy ra lỗi khi thực hiện yêu cầu.',
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.followUp({
          content: '❌ **Lỗi:** Đã xảy ra lỗi khi thực hiện yêu cầu.',
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch {}
  }
}
