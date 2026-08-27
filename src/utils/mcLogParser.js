/**
 * List of Minecraft death message keywords/patterns
 */
const DEATH_PATTERNS = [
  /was slain by/i,
  /was shot by/i,
  /was blown up by/i,
  /blew up/i,
  /hit the ground too hard/i,
  /fell from a high place/i,
  /fell off/i,
  /drowned/i,
  /tried to swim in lava/i,
  /went up in flames/i,
  /burned to death/i,
  /was suffocated/i,
  /starved to death/i,
  /was killed by/i,
  /was impaled by/i,
  /was squished by/i,
  /froze to death/i,
  /was struck by lightning/i,
  /withered away/i,
];

/**
 * Parses raw Minecraft console log lines to detect Death, Advancement, Join, and Leave events
 * @param {string} rawLine
 * @returns {{ type: 'death' | 'advancement' | 'join' | 'leave', message: string, player?: string, achievement?: string } | null}
 */
export function parseMinecraftLog(rawLine) {
  if (!rawLine || typeof rawLine !== 'string') return null;

  // Clean ANSI color codes and timestamps like [11:25:00] [Server thread/INFO]:
  const cleanLine = rawLine
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '') // remove ANSI colors
    .replace(/^\[\d{2}:\d{2}:\d{2}\]\s*\[[^\]]+\]:\s*/, '') // remove timestamp and thread prefix
    .trim();

  if (!cleanLine) return null;

  // 1. Advancement / Challenge / Goal
  const advMatch = cleanLine.match(/^([^\s]+)\s+has\s+(?:made the advancement|completed the challenge|reached the goal)\s+\[([^\]]+)\]/i);
  if (advMatch) {
    return {
      type: 'advancement',
      player: advMatch[1],
      achievement: advMatch[2],
      message: cleanLine,
    };
  }

  // 2. Join game
  const joinMatch = cleanLine.match(/^([^\s]+)\s+joined the game$/i);
  if (joinMatch) {
    return {
      type: 'join',
      player: joinMatch[1],
      message: cleanLine,
    };
  }

  // 3. Leave game
  const leaveMatch = cleanLine.match(/^([^\s]+)\s+left the game$/i);
  if (leaveMatch) {
    return {
      type: 'leave',
      player: leaveMatch[1],
      message: cleanLine,
    };
  }

  // 4. Death Messages
  const isDeath = DEATH_PATTERNS.some((pattern) => pattern.test(cleanLine));
  if (isDeath) {
    const playerMatch = cleanLine.match(/^([^\s]+)\s/);
    return {
      type: 'death',
      player: playerMatch ? playerMatch[1] : 'Người chơi',
      message: cleanLine,
    };
  }

  return null;
}
