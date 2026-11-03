export const gameCategories = Object.freeze([
  Object.freeze({ id: 'slots', label: '老虎机 / 电子' }),
  Object.freeze({ id: 'live', label: '真人' }),
  Object.freeze({ id: 'sports', label: '体育' }),
  Object.freeze({ id: 'fishing', label: '捕鱼' }),
  Object.freeze({ id: 'arcade', label: '街机 / 小游戏' }),
]);

const patterns = Object.freeze([
  ['slots', /^(slot|slots|slot game|reel|electronic|老虎机|电子|电子游艺)$/u],
  ['live', /^(live|live casino|casino live|真人|真人娱乐|百家乐|轮盘|龙虎|blackjack|baccarat|roulette|sic bo)$/u],
  ['sports', /^(sport|sports|sportsbook|betting|football|soccer|体育|体育投注)$/u],
  ['fishing', /^(fish|fishing|fishing game|捕鱼|捕鱼游戏)$/u],
  ['arcade', /^(arcade|mini|mini game|casual|棋牌|街机|小游戏|桌游|puzzle)$/u],
]);

/** Map only known provider labels. Unknown values stay uncategorized. */
export function classifyGameCategory(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/[\s_-]+/gu, ' ');
  if (!normalized || normalized.length > 80) return null;
  for (const [id, pattern] of patterns) if (pattern.test(normalized)) return id;
  return null;
}
