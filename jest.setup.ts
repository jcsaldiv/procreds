import '@testing-library/jest-native/extend-expect';

jest.mock('expo-sqlite', () => {
  type Row = Record<string, any>;
  function makeDb() {
    const tables: Record<string, Row[]> = {};
    const exec = (sql: string) => {
      const stmts = sql.split(';').map((s) => s.trim()).filter(Boolean);
      for (const stmt of stmts) {
        const m = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([^)]*(?:\([^)]*\)[^)]*)*)\)/i);
        if (m) {
          const t = m[1];
          if (!tables[t]) {
            tables[t] = [];
          }
          continue;
        }
        if (/^PRAGMA/i.test(stmt)) continue;
      }
    };
    const run = (sql: string, ...args: any[]) => {
      const s = sql.trim();
      if (/^INSERT INTO/i.test(s)) {
        const m = s.match(/INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
        if (!m) return { changes: 0, lastInsertRowId: 0 };
        const t = m[1];
        const cols = m[2].split(',').map((c: string) => c.trim());
        const row: Row = {};
        cols.forEach((c: string, idx: number) => (row[c] = args[idx]));
        tables[t] = tables[t] || [];
        tables[t].push(row);
        return { changes: 1, lastInsertRowId: tables[t].length };
      }
      if (/^DELETE FROM/i.test(s)) {
        const m = s.match(/DELETE FROM (\w+)(?:\s+WHERE\s+(.+))?/i);
        if (!m) return { changes: 0, lastInsertRowId: 0 };
        const t = m[1];
        if (!m[2]) { const c = (tables[t] || []).length; tables[t] = []; return { changes: c, lastInsertRowId: 0 }; }
        const wm = m[2].match(/(\w+)\s*=\s*\?/);
        if (!wm) return { changes: 0, lastInsertRowId: 0 };
        const before = tables[t].length;
        tables[t] = tables[t].filter((r: Row) => r[wm[1]] !== args[0]);
        return { changes: before - tables[t].length, lastInsertRowId: 0 };
      }
      if (/^UPDATE/i.test(s)) {
        const m = s.match(/UPDATE (\w+)\s+SET\s+(.+?)\s+WHERE\s+(\w+)\s*=\s*\?/i);
        if (!m) return { changes: 0, lastInsertRowId: 0 };
        const t = m[1];
        const sets = m[2].split(',').map((kv: string) => kv.trim().split(/\s*=\s*\?/)[0]);
        const whereCol = m[3];
        const whereVal = args[args.length - 1];
        const updates = args.slice(0, sets.length);
        let changes = 0;
        (tables[t] || []).forEach((r: Row) => {
          if (r[whereCol] === whereVal) { sets.forEach((c: string, i: number) => (r[c] = updates[i])); changes++; }
        });
        return { changes, lastInsertRowId: 0 };
      }
      return { changes: 0, lastInsertRowId: 0 };
    };
    const all = (sql: string, ...args: any[]) => {
      const m = sql.match(/SELECT\s+.+\s+FROM\s+(\w+)(?:\s+WHERE\s+(\w+)\s*=\s*\?)?(?:\s+ORDER\s+BY\s+.+)?/i);
      if (!m) return [];
      const t = m[1];
      const rows = tables[t] || [];
      if (m[2]) return rows.filter((r: Row) => r[m[2]] === args[0]);
      return [...rows];
    };
    const first = (sql: string, ...args: any[]) => all(sql, ...args)[0] ?? null;
    return {
      execSync: exec,
      runSync: run,
      getAllSync: all,
      getFirstSync: first,
      withTransactionSync: (cb: () => void) => cb(),
      __tables: tables,
    };
  }
  let db: any;
  return {
    openDatabaseSync: () => (db ||= makeDb()),
    __reset: () => { db = undefined; },
  };
});

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(async () => 'notif-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
    getOfferings: jest.fn(async () => ({ current: null })),
    purchasePackage: jest.fn(async () => ({ customerInfo: { entitlements: { active: { pro: {} } } } })),
    restorePurchases: jest.fn(async () => ({ entitlements: { active: {} } })),
  },
}));

// randomUUID polyfill for test environment
if (!('randomUUID' in ((globalThis as any).crypto ?? {}))) {
  (globalThis as any).crypto = { randomUUID: () => 'uuid-' + Math.random().toString(36).slice(2) };
}
