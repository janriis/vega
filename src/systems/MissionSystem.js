export function getAvailableMissions(locationId, state, allMissions) {
  return Object.values(allMissions).filter(m => {
    if (m.giverLocation !== locationId) return false;
    if (state.world.missions.completed.includes(m.id)) return false;
    if (state.world.missions.active.includes(m.id)) return false;
    if (m.requiresFlag && !state.story.flags[m.requiresFlag]) return false;
    // Ending missions only available in chapter 3
    if (m.id.startsWith('story_ending') && state.story.chapter < 3) return false;
    return true;
  });
}

export function isMissionComplete(missionId, state, allMissions) {
  const m = allMissions[missionId];
  if (!m) return false;
  if (m.type === 'cargo_delivery') {
    return state.player.location === m.cargo.destination &&
      state.player.ship.cargo.some(c => c.itemId === m.cargo.itemId && c.quantity >= m.cargo.quantity);
  }
  if (m.type === 'intel_courier' || m.type === 'story') {
    return state.player.location === m.destination;
  }
  if (m.type === 'combat_bounty') {
    return state.story.flags[m.completionFlag + '_kill'] === true;
  }
  return false;
}

export function completeMission(missionId, state, allMissions) {
  const m = allMissions[missionId];
  if (!m) return;
  state.player.credits += m.reward;
  state.story.flags[m.completionFlag] = true;
  state.world.missions.active = state.world.missions.active.filter(id => id !== missionId);
  state.world.missions.completed.push(missionId);
  Object.entries(m.reputationReward || {}).forEach(([faction, amount]) => {
    state.player.reputation[faction] = Math.max(-100, Math.min(100, (state.player.reputation[faction] || 0) + amount));
  });
}
