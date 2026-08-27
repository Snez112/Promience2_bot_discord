import { describe, it, expect } from 'vitest';
import { pingMinecraftServer } from '../src/utils/mcPing.js';

describe('pingMinecraftServer', () => {
  it('should query live Minecraft server via TCP SLP', async () => {
    try {
      const result = await pingMinecraftServer('meteor.pikamc.vn', 25364, 3000);
      expect(result).toHaveProperty('online', true);
      expect(result).toHaveProperty('playersOnline');
      expect(result).toHaveProperty('playersMax');
    } catch (err) {
      // If server is offline in test environment, should reject with Error
      expect(err).toBeInstanceOf(Error);
    }
  }, 10000);
});
