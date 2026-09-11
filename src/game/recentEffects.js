// Retain the newest IDs across snapshot overlap. Clearing the entire cache at
// capacity would replay still-live effects in the next snapshot.
export function rememberEffect(seen, id, capacity = 512) {
  if (seen.has(id)) return false;
  seen.add(id);
  while (seen.size > capacity) seen.delete(seen.values().next().value);
  return true;
}
