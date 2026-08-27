import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { setGuildLogChannel, getGuildLogChannel, loadGuildConfigs } from '../src/utils/configStore.js';

const TEST_CONFIG_PATH = path.join(process.cwd(), 'config', 'test_guilds.json');

describe('configStore', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
  });

  it('should set and get guild log channel ID correctly', () => {
    setGuildLogChannel('guild_123', 'channel_456', TEST_CONFIG_PATH);
    const channelId = getGuildLogChannel('guild_123', TEST_CONFIG_PATH);
    expect(channelId).toBe('channel_456');
  });

  it('should return null for unconfigured guild', () => {
    const channelId = getGuildLogChannel('guild_unknown', TEST_CONFIG_PATH);
    expect(channelId).toBeNull();
  });
});
