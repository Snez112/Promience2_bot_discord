import { describe, it, expect } from 'vitest';
import { buildServerEmbed, buildControlButtons } from '../src/ui/serverEmbed.js';
import { ButtonStyle } from 'discord.js';

describe('serverEmbed UI', () => {
  it('should build embed with modpack and launcher download link fields', () => {
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
    expect(json.fields.length).toBeGreaterThanOrEqual(8); // includes fields + modpack + launcher
    
    const modpackField = json.fields.find((f) => f.name === '📦 MODPACK');
    expect(modpackField).toBeDefined();
    expect(modpackField.value).toContain('sharepoint.com');

    const launcherField = json.fields.find((f) => f.name === '🚀 LAUNCHER');
    expect(launcherField).toBeDefined();
    expect(launcherField.value).toContain('https://github.com/Diegiwg/PrismLauncher-Cracked');
  });

  it('should include action rows with Link buttons for Modpack and Launcher downloads', () => {
    const actionRows = buildControlButtons('running');
    expect(Array.isArray(actionRows)).toBe(true);

    const components = actionRows.flatMap((row) => row.toJSON().components);
    expect(components.length).toBe(6);

    const linkButtons = components.filter((c) => c.style === ButtonStyle.Link);
    expect(linkButtons).toHaveLength(2);

    const modpackButton = linkButtons.find((b) => b.label === 'Tải Modpack');
    expect(modpackButton).toBeDefined();
    expect(modpackButton.url).toContain('sharepoint.com');

    const launcherButton = linkButtons.find((b) => b.label === 'Tải Launcher');
    expect(launcherButton).toBeDefined();
    expect(launcherButton.url).toBe('https://github.com/Diegiwg/PrismLauncher-Cracked');
  });
});
