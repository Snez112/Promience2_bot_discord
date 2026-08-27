import { describe, it, expect } from 'vitest';
import { parseMinecraftLog } from '../src/utils/mcLogParser.js';

describe('mcLogParser', () => {
  it('should parse player death messages', () => {
    const log1 = '[11:25:00] [Server thread/INFO]: Steve was slain by Zombie';
    const result1 = parseMinecraftLog(log1);
    expect(result1).not.toBeNull();
    expect(result1?.type).toBe('death');
    expect(result1?.message).toBe('Steve was slain by Zombie');

    const log2 = '[11:25:00] [Server thread/INFO]: Alex fell from a high place';
    const result2 = parseMinecraftLog(log2);
    expect(result2?.type).toBe('death');
    expect(result2?.message).toBe('Alex fell from a high place');
  });

  it('should parse player advancement messages', () => {
    const log = '[11:25:00] [Server thread/INFO]: Steve has made the advancement [Suit Up]';
    const result = parseMinecraftLog(log);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('advancement');
    expect(result?.player).toBe('Steve');
    expect(result?.achievement).toBe('Suit Up');
  });

  it('should parse player join and leave messages', () => {
    const joinLog = '[11:25:00] [Server thread/INFO]: Steve joined the game';
    const joinResult = parseMinecraftLog(joinLog);
    expect(joinResult?.type).toBe('join');
    expect(joinResult?.player).toBe('Steve');

    const leaveLog = '[11:25:00] [Server thread/INFO]: Steve left the game';
    const leaveResult = parseMinecraftLog(leaveLog);
    expect(leaveResult?.type).toBe('leave');
    expect(leaveResult?.player).toBe('Steve');
  });

  it('should return null for normal server logs', () => {
    const log = '[11:25:00] [Server thread/INFO]: Preparing spawn area: 0%';
    const result = parseMinecraftLog(log);
    expect(result).toBeNull();
  });
});
