export function applyReputation(state, factionId, amount) {
  const current = state.player.reputation[factionId] ?? 0;
  state.player.reputation[factionId] = Math.max(-100, Math.min(100, current + amount));
}

export function shouldAttackOnSight(factionId, state, factions) {
  const faction = factions[factionId];
  if (!faction) return false;
  const rep = state.player.reputation[factionId] ?? 0;
  return rep <= faction.attackThreshold;
}
