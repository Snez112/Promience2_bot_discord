import { EmbedBuilder } from 'discord.js';

/**
 * Builds a Discord Embed for Minecraft server events (Death, Advancement, Join, Leave)
 * @param {{ type: 'death' | 'advancement' | 'join' | 'leave', message: string, player?: string, achievement?: string }} parsed
 * @returns {EmbedBuilder | null}
 */
export function buildLogEmbed(parsed) {
  if (!parsed || !parsed.type) return null;

  const embed = new EmbedBuilder().setTimestamp();

  switch (parsed.type) {
    case 'death':
      embed
        .setColor('#ED4245') // Dark Red
        .setTitle('💀 Thông Báo Tử Trận')
        .setDescription(`**${parsed.message}**`)
        .setFooter({ text: 'PikaMC Control Panel • Log Event' });
      break;

    case 'advancement':
      embed
        .setColor('#FEE75C') // Gold Yellow
        .setTitle('🏆 Thành Tựu Mới!')
        .setDescription(`Người chơi **${parsed.player}** vừa đạt được thành tựu: **[${parsed.achievement}]**`)
        .setFooter({ text: 'PikaMC Control Panel • Advancement Event' });
      break;

    case 'join':
      embed
        .setColor('#57F287') // Green
        .setTitle('🟢 Tham Gia Server')
        .setDescription(`Người chơi **${parsed.player}** đã tham gia thế giới!`)
        .setFooter({ text: 'PikaMC Control Panel • Player Join' });
      break;

    case 'leave':
      embed
        .setColor('#95A5A6') // Grey
        .setTitle('🔴 Rời Server')
        .setDescription(`Người chơi **${parsed.player}** đã rời thế giới!`)
        .setFooter({ text: 'PikaMC Control Panel • Player Leave' });
      break;

    default:
      return null;
  }

  return embed;
}
