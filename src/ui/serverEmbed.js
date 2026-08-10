import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

/**
 * Visual badge & color mapper for server power state
 */
function getStateInfo(state) {
  switch (state?.toLowerCase()) {
    case 'running':
      return { label: '🟢 RUNNING', color: 0x2ecc71 };
    case 'starting':
      return { label: '🟡 STARTING', color: 0xf1c40f };
    case 'stopping':
      return { label: '🟠 STOPPING', color: 0xe67e22 };
    case 'offline':
      return { label: '🔴 OFFLINE', color: 0xe74c3c };
    default:
      return { label: `⚪ ${state ? state.toUpperCase() : 'UNKNOWN'}`, color: 0x2b2d31 };
  }
}

/**
 * Builds a rich Embed displaying server status without clickable URL
 * @param {Object} statusData
 * @param {Object} [options]
 * @param {string} [options.title]
 */
export function buildServerEmbed(statusData, options = {}) {
  const { state, cpu, memory, disk, players } = statusData || {};
  const stateInfo = getStateInfo(state);
  const title = options.title || '🎮 Bảng Điều Khiển Server Minecraft';

  const fields = [
    { name: '⚡ TRẠNG THÁI', value: stateInfo.label, inline: true },
    { name: '👥 NGƯỜI CHƠI', value: players || '0 / 0', inline: true },
    { name: '\u200b', value: '\u200b', inline: true }, // Spacer field
    { name: '💻 TẢI CPU', value: cpu || '0%', inline: true },
    { name: '🧠 BỘ NHỚ (RAM)', value: memory || '0 MB', inline: true },
    { name: '💾 Ô ĐĨA (DISK)', value: disk || '0 MB', inline: true },
  ];

  return new EmbedBuilder()
    .setTitle(title)
    .setColor(stateInfo.color)
    .addFields(fields)
    .setFooter({ text: 'Pikamc Control Panel • Cập nhật trực tiếp qua API' })
    .setTimestamp();
}

/**
 * Builds control buttons with dynamic disabled states according to current server power state
 * @param {string} [state]
 */
export function buildControlButtons(state = 'unknown') {
  const normalizedState = state?.toLowerCase() || 'unknown';

  const isRunning = normalizedState === 'running';
  const isStarting = normalizedState === 'starting';
  const isStopping = normalizedState === 'stopping';
  const isOffline = normalizedState === 'offline';

  const isStartDisabled = isRunning || isStarting || isStopping;
  const isStopDisabled = isOffline || isStopping;
  const isRestartDisabled = isOffline || isStarting || isStopping;
  const isKillDisabled = isOffline;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('server_signal_start')
      .setLabel('Bật Server (Start)')
      .setEmoji('🟢')
      .setStyle(ButtonStyle.Success)
      .setDisabled(isStartDisabled),

    new ButtonBuilder()
      .setCustomId('server_signal_stop')
      .setLabel('Tắt Server (Stop)')
      .setEmoji('🛑')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isStopDisabled),

    new ButtonBuilder()
      .setCustomId('server_signal_restart')
      .setLabel('Khởi Động Lại (Restart)')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isRestartDisabled),

    new ButtonBuilder()
      .setCustomId('server_signal_kill')
      .setLabel('Tắt Ép Buộc (Kill)')
      .setEmoji('⚡')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isKillDisabled)
  );
}
