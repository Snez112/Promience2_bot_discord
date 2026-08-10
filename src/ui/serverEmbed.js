import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const DEFAULT_MODPACK_URL =
  'https://navillera-my.sharepoint.com/personal/na_navillera_onmicrosoft_com/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fna%5Fnavillera%5Fonmicrosoft%5Fcom%2FDocuments%2FProminence%E2%84%A2%20II%2D%20Hasturian%20Era%2Ezip&parent=%2Fpersonal%2Fna%5Fnavillera%5Fonmicrosoft%5Fcom%2FDocuments&ga=1';

const DEFAULT_LAUNCHER_URL = 'https://github.com/Diegiwg/PrismLauncher-Cracked';

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
 * Builds a rich Embed displaying server status including player count, Modpack & Launcher download links
 * @param {Object} statusData
 * @param {Object} [options]
 * @param {string} [options.title]
 * @param {string} [options.modpackUrl]
 * @param {string} [options.launcherUrl]
 */
export function buildServerEmbed(statusData, options = {}) {
  const { state, cpu, memory, disk, players } = statusData || {};
  const stateInfo = getStateInfo(state);
  const title = options.title || '🎮 Bảng Điều Khiển Server Minecraft';
  const modpackUrl = options.modpackUrl || process.env.MODPACK_URL || DEFAULT_MODPACK_URL;
  const launcherUrl = options.launcherUrl || process.env.LAUNCHER_URL || DEFAULT_LAUNCHER_URL;

  const fields = [
    { name: '⚡ TRẠNG THÁI', value: stateInfo.label, inline: true },
    { name: '👥 NGƯỜI CHƠI', value: players || '0 / 0', inline: true },
    { name: '\u200b', value: '\u200b', inline: true }, // Spacer field
    { name: '💻 TẢI CPU', value: cpu || '0%', inline: true },
    { name: '🧠 BỘ NHỚ (RAM)', value: memory || '0 MB', inline: true },
    { name: '💾 Ô ĐĨA (DISK)', value: disk || '0 MB', inline: true },
    { name: '📦 MODPACK', value: `[Tải Modpack Prominence II tại đây](${modpackUrl})`, inline: true },
    { name: '🚀 LAUNCHER', value: `[Tải Prism Launcher (Cracked)](${launcherUrl})`, inline: true },
  ];

  return new EmbedBuilder()
    .setTitle(title)
    .setColor(stateInfo.color)
    .addFields(fields)
    .setFooter({ text: 'Pikamc Control Panel • Cập nhật trực tiếp qua API' })
    .setTimestamp();
}

/**
 * Builds control buttons with dynamic disabled states and Link buttons for downloads
 * @param {string} [state]
 * @param {string} [modpackUrl]
 * @param {string} [launcherUrl]
 * @returns {ActionRowBuilder[]}
 */
export function buildControlButtons(state = 'unknown', modpackUrl, launcherUrl) {
  const normalizedState = state?.toLowerCase() || 'unknown';
  const mUrl = modpackUrl || process.env.MODPACK_URL || DEFAULT_MODPACK_URL;
  const lUrl = launcherUrl || process.env.LAUNCHER_URL || DEFAULT_LAUNCHER_URL;

  const isRunning = normalizedState === 'running';
  const isStarting = normalizedState === 'starting';
  const isStopping = normalizedState === 'stopping';
  const isOffline = normalizedState === 'offline';

  const isStartDisabled = isRunning || isStarting || isStopping;
  const isStopDisabled = isOffline || isStopping;
  const isRestartDisabled = isOffline || isStarting || isStopping;
  const isKillDisabled = isOffline;

  const controlRow = new ActionRowBuilder().addComponents(
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

  const linkRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Tải Modpack')
      .setEmoji('📦')
      .setStyle(ButtonStyle.Link)
      .setURL(mUrl),

    new ButtonBuilder()
      .setLabel('Tải Launcher')
      .setEmoji('🚀')
      .setStyle(ButtonStyle.Link)
      .setURL(lUrl)
  );

  return [controlRow, linkRow];
}
