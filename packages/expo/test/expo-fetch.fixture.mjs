// Deliberate Expo native-boundary substitute. The actual sibling gateway client
// executes unchanged. These tests establish adapter behavior, not device support.
let handler;
export function setExpoFetch(next) { handler = next; }
export function fetch(input, init) {
  if (!handler) throw new Error('Unexpected Expo fetch call in deterministic test.');
  return handler(input, init);
}
