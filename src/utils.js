export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function random() {
  return Math.random();
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickRandom(items) {
  if (!items || !items.length) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

export function chance(probability) {
  return Math.random() < probability;
}
