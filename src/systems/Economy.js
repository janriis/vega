export function getPrice(itemId, locationId, day, locations, items) {
  const item = items[itemId];
  const loc = locations[locationId];
  if (!item || !loc) return 0;
  const modifier = loc.priceModifiers?.[itemId] ?? 1;
  // Gentle daily fluctuation: ±8% based on a deterministic hash
  const fluctuation = 1 + (Math.sin(day * 7.3 + itemId.charCodeAt(0) * 1.7) * 0.08);
  return Math.round(item.basePrice * modifier * fluctuation);
}

export function canBuy(itemId, locationId, playerCredits, locations) {
  const loc = locations[locationId];
  return loc?.sells?.includes(itemId) ?? false;
}

export function canSell(itemId, locationId, locations) {
  const loc = locations[locationId];
  return loc?.buys?.includes(itemId) ?? false;
}

export function executeBuy(itemId, quantity, state, locations, items) {
  const price = getPrice(itemId, state.player.location, state.world.day, locations, items);
  const total = price * quantity;
  if (state.player.credits < total) return { success: false, reason: 'Insufficient credits' };
  if (!canBuy(itemId, state.player.location, state.player.credits, locations)) return { success: false, reason: 'Not sold here' };

  state.player.credits -= total;
  const existing = state.player.ship.cargo.find(c => c.itemId === itemId);
  if (existing) existing.quantity += quantity;
  else state.player.ship.cargo.push({ itemId, quantity });
  return { success: true };
}

export function executeSell(itemId, quantity, state, locations, items) {
  if (!canSell(itemId, state.player.location, locations)) return { success: false, reason: 'Not bought here' };
  const cargoSlot = state.player.ship.cargo.find(c => c.itemId === itemId);
  if (!cargoSlot || cargoSlot.quantity < quantity) return { success: false, reason: 'Insufficient cargo' };

  const price = getPrice(itemId, state.player.location, state.world.day, locations, items);
  state.player.credits += price * quantity;
  cargoSlot.quantity -= quantity;
  if (cargoSlot.quantity === 0) state.player.ship.cargo = state.player.ship.cargo.filter(c => c.itemId !== itemId);
  return { success: true };
}
