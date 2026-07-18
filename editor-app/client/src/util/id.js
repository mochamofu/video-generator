export function uid(prefix) {
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `${prefix}_${rand}`;
}
