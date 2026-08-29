import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncDb } from "./sync-db";
import { runMigrations } from "./run-migrations";

const readFileSyncMock = vi.fn();
vi.mock("fs", () => ({
  readFileSync: (...args: unknown[]) => readFileSyncMock(...args),
  default: { readFileSync: (...args: unknown[]) => readFileSyncMock(...args) },
}));

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock runMigrations
vi.mock("./run-migrations", () => ({
  runMigrations: vi.fn().mockResolvedValue(undefined),
}));

// Mock Neon Client
vi.mock("@neondatabase/serverless", () => ({
  Client: class {
    connect = vi.fn().mockResolvedValue(undefined);
    end = vi.fn().mockResolvedValue(undefined);
    query = vi.fn().mockResolvedValue({ rows: [] });
  },
  neon: vi.fn(),
}));

describe("syncDb", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    process.env.NEON_API_KEY = "test-api-key";
    process.env.DATABASE_URL = "postgres://user:pass@ep-test.aws.neon.tech/neondb";
    
    // Mock successful branch list
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        branches: [
          { id: "br-child", name: "dev", parent_id: "br-parent" },
          { id: "br-parent", name: "main" }
        ]
      })
    });

    // Mock successful restore
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    // Mock successful status check
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        branch: { current_state: "ready" }
      })
    });

    readFileSyncMock.mockReturnValue(JSON.stringify({
      projectId: "test-project",
      branch: "dev"
    }));
  });

  it("orchestrates the sync workflow: identify branch -> restore from parent -> wait -> migrate", async () => {
    // We need to mock process.exit and console.log/error to keep test output clean
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await syncDb();

    // Check branch list call
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/projects/test-project/branches"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-api-key" }) })
    );

    // Check restore call
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/branches/br-child/restore"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ source_branch_id: "br-parent" })
      })
    );

    // Check status check call
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/branches/br-child"),
      expect.not.objectContaining({ method: "POST" })
    );

    // Check migrations call
    expect(vi.mocked(runMigrations)).toHaveBeenCalled();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("successfully"));
  });

  it("fails if NEON_API_KEY is missing", async () => {
    delete process.env.NEON_API_KEY;
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await syncDb();

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("NEON_API_KEY environment variable is required"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("fails if branch has no parent", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        branches: [{ id: "br-main", name: "main" }] // No parent_id
      })
    });
    readFileSyncMock.mockReturnValue(JSON.stringify({ projectId: "test-project", branch: "main" }));
    
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await syncDb();

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("has no parent"));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
