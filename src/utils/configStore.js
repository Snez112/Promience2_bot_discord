import fs from 'fs';
import path from 'path';

const DEFAULT_CONFIG_PATH = path.join(process.cwd(), 'config', 'guilds.json');
const TEST_CONFIG_PATH = path.join(process.cwd(), 'config', 'test_guilds.json');

function resolveConfigPath(filePath) {
  if (filePath) return filePath;
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    return TEST_CONFIG_PATH;
  }
  return DEFAULT_CONFIG_PATH;
}

/**
 * Ensures configuration directory and file exist
 * @param {string} [filePath]
 */
function ensureConfigFile(filePath) {
  const targetPath = resolveConfigPath(filePath);
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, JSON.stringify({}, null, 2), 'utf8');
  }
}

/**
 * Loads all guild configs
 * @param {string} [filePath]
 * @returns {Record<string, { logChannelId?: string }>}
 */
export function loadGuildConfigs(filePath) {
  const targetPath = resolveConfigPath(filePath);
  try {
    ensureConfigFile(targetPath);
    const content = fs.readFileSync(targetPath, 'utf8');
    return JSON.parse(content || '{}');
  } catch (err) {
    console.error('❌ Lỗi đọc file config guilds:', err.message);
    return {};
  }
}

/**
 * Saves guild configs to disk
 * @param {Record<string, any>} data
 * @param {string} [filePath]
 */
export function saveGuildConfigs(data, filePath) {
  const targetPath = resolveConfigPath(filePath);
  try {
    ensureConfigFile(targetPath);
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Lỗi ghi file config guilds:', err.message);
  }
}

/**
 * Sets the log channel ID for a specific guild
 * @param {string} guildId
 * @param {string} channelId
 * @param {string} [filePath]
 */
export function setGuildLogChannel(guildId, channelId, filePath) {
  if (!guildId) return;
  const targetPath = resolveConfigPath(filePath);
  const configs = loadGuildConfigs(targetPath);
  configs[guildId] = {
    ...(configs[guildId] || {}),
    logChannelId: channelId,
  };
  saveGuildConfigs(configs, targetPath);
}

/**
 * Gets the log channel ID for a specific guild
 * @param {string} guildId
 * @param {string} [filePath]
 * @returns {string | null}
 */
export function getGuildLogChannel(guildId, filePath) {
  if (!guildId) return null;
  const targetPath = resolveConfigPath(filePath);
  const configs = loadGuildConfigs(targetPath);
  return configs[guildId]?.logChannelId || null;
}
