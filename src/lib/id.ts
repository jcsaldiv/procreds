export function newId(): string {
  return (globalThis as any).crypto.randomUUID();
}
