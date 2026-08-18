import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@neondatabase/serverless";

const readdirSyncMock = vi.fn();
const readFileSyncMock = vi.fn();
vi.mock("fs", () => ({
  readdirSync: readdirSyncMock,
  readFileSync: readFileSyncMock,
  default: { readdirSync: readdirSyncMock, readFileSync: readFileSyncMock },
}));

const { runMigrations } = await import("./run-migrations");

function makeClient(overrides: Partial<Record<string, unknown[]>> = {}) {
  const initialLedgerRows: { filename: string }[] = (overrides.ledgerRows as { filename: string }[]) ?? [];
  const initialLedgerSize = initialLedgerRows.length;
  const ledgerRows: { filename: string }[] = [...initialLedgerRows];
  const domainTableExists = (overrides.domainTableExists as unknown as boolean) ?? true;

  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    const text = sql.trim();
    if (text.startsWith("CREATE TABLE IF NOT EXISTS schema_migrations")) {
      return { rows: [] };
    }
    if (text.startsWith("SELECT count(*)")) {
      // Reflects the ledger's state at the start of the run (before any bootstrap inserts).
      return { rows: [{ count: initialLedgerSize }] };
    }
    if (text.startsWith("SELECT to_regclass")) {
      return { rows: [{ exists: domainTableExists }] };
    }
    if (text.startsWith("SELECT filename FROM schema_migrations")) {
      return { rows: [...ledgerRows] };
    }
    if (text.startsWith("INSERT INTO schema_migrations")) {
      ledgerRows.push({ filename: params![0] as string });
      return { rows: [] };
    }
    if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") {
      return { rows: [] };
    }
    // Any actual migration file SQL.
    return { rows: [] };
  });

  return { query } as unknown as Client;
}

beforeEach(() => {
  readdirSyncMock.mockReset();
  readFileSyncMock.mockReset();
  readFileSyncMock.mockReturnValue("SELECT 1;");
});

describe("runMigrations bootstrap", () => {
  it("bootstraps by recording all existing files as applied, without executing their SQL, when the ledger is empty but domain tables already exist", async () => {
    readdirSyncMock.mockReturnValue(["0001_initial.sql", "0002_second.sql"]);
    const client = makeClient({ ledgerRows: [], domainTableExists: true });

    await runMigrations(client);

    const insertCalls = (client.query as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([sql]: [string]) => sql.trim().startsWith("INSERT INTO schema_migrations")
    );
    expect(insertCalls).toHaveLength(2);
    expect(insertCalls[0][1]).toEqual(["0001_initial.sql"]);
    expect(insertCalls[1][1]).toEqual(["0002_second.sql"]);

    // Bootstrap should not run BEGIN/transactional execution of the migration file SQL.
    const beginCalls = (client.query as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([sql]: [string]) => sql.trim() === "BEGIN"
    );
    expect(beginCalls).toHaveLength(0);
  });

  it("does not bootstrap when the ledger is empty and no domain tables exist (fresh database)", async () => {
    readdirSyncMock.mockReturnValue(["0001_initial.sql"]);
    const client = makeClient({ ledgerRows: [], domainTableExists: false });

    await runMigrations(client);

    const beginCalls = (client.query as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([sql]: [string]) => sql.trim() === "BEGIN"
    );
    expect(beginCalls).toHaveLength(1);
  });
});

describe("runMigrations pending application", () => {
  it("only executes files not already recorded in the ledger, in filename order", async () => {
    readdirSyncMock.mockReturnValue(["0001_initial.sql", "0002_second.sql", "0003_third.sql"]);
    const client = makeClient({
      ledgerRows: [{ filename: "0001_initial.sql" }],
      domainTableExists: true,
    });

    await runMigrations(client);

    const insertCalls = (client.query as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([sql]: [string]) => sql.trim().startsWith("INSERT INTO schema_migrations")
    );
    expect(insertCalls.map((call: [string, unknown[]]) => call[1][0])).toEqual([
      "0002_second.sql",
      "0003_third.sql",
    ]);
  });

  it("is a no-op when every file is already recorded in the ledger", async () => {
    readdirSyncMock.mockReturnValue(["0001_initial.sql"]);
    const client = makeClient({
      ledgerRows: [{ filename: "0001_initial.sql" }],
      domainTableExists: true,
    });

    await runMigrations(client);

    const insertCalls = (client.query as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([sql]: [string]) => sql.trim().startsWith("INSERT INTO schema_migrations")
    );
    expect(insertCalls).toHaveLength(0);
  });
});

describe("runMigrations failure handling", () => {
  it("records a filename only after its SQL succeeds, and leaves the ledger unchanged and rethrows on failure", async () => {
    readdirSyncMock.mockReturnValue(["0001_initial.sql"]);
    readFileSyncMock.mockReturnValue("BROKEN SQL;");

    const query = vi.fn(async (sql: string) => {
      const text = sql.trim();
      if (text.startsWith("CREATE TABLE IF NOT EXISTS schema_migrations")) return { rows: [] };
      if (text.startsWith("SELECT count(*)")) return { rows: [{ count: 0 }] };
      if (text.startsWith("SELECT to_regclass")) return { rows: [{ exists: false }] };
      if (text.startsWith("SELECT filename FROM schema_migrations")) return { rows: [] };
      if (text === "BEGIN") return { rows: [] };
      if (text === "ROLLBACK") return { rows: [] };
      if (text === "BROKEN SQL;") throw new Error("syntax error");
      if (text.startsWith("INSERT INTO schema_migrations")) return { rows: [] };
      return { rows: [] };
    });
    const client = { query } as unknown as Client;

    await expect(runMigrations(client)).rejects.toThrow("syntax error");

    const insertCalls = query.mock.calls.filter(([sql]: [string]) =>
      sql.trim().startsWith("INSERT INTO schema_migrations")
    );
    expect(insertCalls).toHaveLength(0);

    const rollbackCalls = query.mock.calls.filter(([sql]: [string]) => sql.trim() === "ROLLBACK");
    expect(rollbackCalls).toHaveLength(1);
  });
});
