import fs from 'fs';
import path from 'path';

const DEFAULT_CONFIG_PATH = path.join(process.cwd(), 'config', 'guilds.json');

/**
 * Ensures configuration directory and file exist
 * @param {string} filePath
 */
function ensureConfigFile(filePath = DEFAULT_CONFIG_PATH) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf8');
  }
}

/**
 * Loads all guild configs
 * @param {string} filePath
 * @returns {Record<string, { logChannelId?: string }>}
 */
export function loadGuildConfigs(filePath = DEFAULT_CONFIG_PATH) {
  try {
    ensureConfigFile(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.error('❌ Lỗi đọc file config guilds:', err.message);
    return {};
  }
}

/**
 * Saves guild configs to disk
 * @param {Record<string, any>} data
 * @param {string} filePath
 */
export function saveGuildConfigs(data, filePath = DEFAULT_CONFIG_PATH) {
  try {
    ensureConfigFile(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Lỗi ghi file config guilds:', err.message);
  }
}

/**
 * Sets the log channel ID for a specific guild
 * @param {string} guildId
 * @param {string} channelId
 * @param {string} filePath
 */
export function setGuildLogChannel(guildId, channelId, filePath = DEFAULT_CONFIG_PATH) {
  if (!guildId) return;
  const configs = loadGuildConfigs(filePath);
  configs[guildId] = {
    ...(configs[guildId] || {}),
    logChannelId: channelId,
  };
  saveGuildConfigs(configs, filePath);
}

/**
 * Gets the log channel ID for a specific guild
 * @param {string} guildId
 * @param {string} filePath
 * @returns {string | null}
 */
export function getGuildLogChannel(guildId, filePath = DEFAULT_CONFIG_PATH) {
  if (!guildId) return null;
  const configs = loadGuildConfigs(filePath);
  return configs[guildId]?.logChannelId || null;
}
