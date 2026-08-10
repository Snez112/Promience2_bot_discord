import { describe, it, expect } from 'vitest';
import { buildServerEmbed, buildControlButtons } from '../src/ui/serverEmbed.js';
import { ButtonStyle } from 'discord.js';

describe('serverEmbed UI', () => {
  it('should build embed with modpack download link field', () => {
    const statusData = {
      state: 'running',
      cpu: '73.66% / 600%',
      memory: '5.9 GiB / 10 GiB',
      disk: '10 GiB / 40 GiB',
      players: '1 / 20',
    };
    const embed = buildServerEmbed(statusData, { title: '📊 Thông Tin Server Minecraft' });
    const json = embed.toJSON();

    expect(json.title).toBe('📊 Thông Tin Server Minecraft');
    expect(json.fields).toHaveLength(7); // includes spacer + modpack field
    const modpackField = json.fields.find((f) => f.name === '📦 MODPACK');
    expect(modpackField).toBeDefined();
    expect(modpackField.value).toContain('sharepoint.com');
  });

  it('should include 5 buttons with a Link button for Modpack download', () => {
    const actionRow = buildControlButtons('running');
    const json = actionRow.toJSON();

    expect(json.components).toHaveLength(5);
    const modpackButton = json.components.find((c) => c.style === ButtonStyle.Link);
    expect(modpackButton).toBeDefined();
    expect(modpackButton.url).toContain('sharepoint.com');
  });
});
