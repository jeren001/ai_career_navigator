export function aiInteger(name, fallback, min, max = Number.MAX_SAFE_INTEGER) {
  const raw = process.env[name]?.trim();
  const value = Number(raw);
  return /^\d+$/.test(raw ?? '') && Number.isSafeInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}
