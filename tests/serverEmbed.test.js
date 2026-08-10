import { describe, it, expect } from 'vitest';
import { buildServerEmbed, buildControlButtons } from '../src/ui/serverEmbed.js';

describe('serverEmbed UI', () => {
  it('should build embed without URL link and support custom title', () => {
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
    expect(json.url).toBeUndefined(); // no clickable URL link
    expect(json.color).toBe(0x2ecc71); // green color for running status
    expect(json.fields).toHaveLength(6);
    expect(json.fields[0].name).toBe('⚡ TRẠNG THÁI');
    expect(json.fields[1].name).toBe('👥 NGƯỜI CHƠI');
    expect(json.fields[3].name).toBe('💻 TẢI CPU');
    expect(json.fields[4].name).toBe('🧠 BỘ NHỚ (RAM)');
    expect(json.fields[5].name).toBe('💾 Ô ĐĨA (DISK)');
  });

  it('should disable Start button when server is running', () => {
    const actionRow = buildControlButtons('running');
    const json = actionRow.toJSON();

    const startButton = json.components.find((c) => c.custom_id === 'server_signal_start');
    const stopButton = json.components.find((c) => c.custom_id === 'server_signal_stop');

    expect(startButton.disabled).toBe(true);
    expect(stopButton.disabled).toBe(false);
  });

  it('should disable Stop and Restart buttons when server is offline', () => {
    const actionRow = buildControlButtons('offline');
    const json = actionRow.toJSON();

    const startButton = json.components.find((c) => c.custom_id === 'server_signal_start');
    const stopButton = json.components.find((c) => c.custom_id === 'server_signal_stop');
    const restartButton = json.components.find((c) => c.custom_id === 'server_signal_restart');

    expect(startButton.disabled).toBe(false);
    expect(stopButton.disabled).toBe(true);
    expect(restartButton.disabled).toBe(true);
  });
});
