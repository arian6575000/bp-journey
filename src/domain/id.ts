export function createId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand()}-${rand()}`;
}
