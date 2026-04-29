export function getPrice(itemId, locationId, day, locations, items) {
  const item = items[itemId];
  const loc = locations[locationId];
  if (!item || !loc) return 0;
  const modifier = loc.priceModifiers?.[itemId] ?? 1;
  // Gentle daily fluctuation: ±8% based on a deterministic hash
  const fluctuation = 1 + (Math.sin(day * 7.3 + itemId.charCodeAt(0) * 1.7) * 0.08);
  return Math.round(item.basePrice * modifier * fluctuation);
}

export function canBuy(itemId, locationId, locations) {
  const loc = locations[locationId];
  return loc?.sells?.includes(itemId) ?? false;
}

export function canSell(itemId, locationId, locations) {
  const loc = locations[locationId];
  return loc?.buys?.includes(itemId) ?? false;
}

export function executeBuy(itemId, quantity, state, locations, items, locationId) {
  const loc = locationId || state.player.location;
  if (!canBuy(itemId, loc, locations)) return { success: false, reason: 'Not sold here' };
  const price = getPrice(itemId, loc, state.world.day, locations, items);
  const total = price * quantity;
  if (state.player.credits < total) return { success: false, reason: 'Insufficient credits' };

  // Check cargo capacity
  const usedSlots = state.player.ship.cargo.reduce((sum, c) => sum + c.quantity, 0);
  const maxSlots = state.player.ship.cargoSlots || 20;
  if (usedSlots + quantity > maxSlots) return { success: false, reason: 'Cargo hold full' };

  state.player.credits -= total;
  const existing = state.player.ship.cargo.find(c => c.itemId === itemId);
  if (existing) existing.quantity += quantity;
  else state.player.ship.cargo.push({ itemId, quantity });
  return { success: true };
}

export function executeSell(itemId, quantity, state, locations, items, locationId) {
  const loc = locationId || state.player.location;
  if (!canSell(itemId, loc, locations)) return { success: false, reason: 'Not bought here' };
  const cargoSlot = state.player.ship.cargo.find(c => c.itemId === itemId);
  if (!cargoSlot || cargoSlot.quantity < quantity) return { success: false, reason: 'Insufficient cargo' };

  const price = getPrice(itemId, loc, state.world.day, locations, items);
  state.player.credits += price * quantity;
  cargoSlot.quantity -= quantity;
  if (cargoSlot.quantity === 0) state.player.ship.cargo = state.player.ship.cargo.filter(c => c.itemId !== itemId);
  return { success: true };
}
