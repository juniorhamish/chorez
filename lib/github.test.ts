import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commentOnIssue, createIssue, searchOpenIssues } from "./github";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.GITHUB_TOKEN = "test-token";
  process.env.GITHUB_REPO = "juniorhamish/chorez";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_REPO;
});

describe("config validation", () => {
  it("throws when GITHUB_TOKEN is not set", async () => {
    delete process.env.GITHUB_TOKEN;
    await expect(searchOpenIssues("foo")).rejects.toThrow("GITHUB_TOKEN is not set");
  });

  it("throws when GITHUB_REPO is not set", async () => {
    delete process.env.GITHUB_REPO;
    await expect(searchOpenIssues("foo")).rejects.toThrow("GITHUB_REPO is not set");
  });

  it("throws when GITHUB_REPO isn't in owner/repo format", async () => {
    process.env.GITHUB_REPO = "not-a-valid-repo";
    await expect(searchOpenIssues("foo")).rejects.toThrow(/owner\/repo/);
  });
});

describe("searchOpenIssues", () => {
  it("queries the GitHub search API scoped to the configured repo and open issues", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [] }), { status: 200 })
    );

    await searchOpenIssues("dark mode broken");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("search/issues");
    expect(decodeURIComponent(url)).toContain("repo:juniorhamish/chorez is:issue is:open dark mode broken");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("maps returned items to GithubIssueSummary", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ number: 42, title: "Bug", body: "It breaks", html_url: "https://github.com/x/y/issues/42" }],
        }),
        { status: 200 }
      )
    );

    const results = await searchOpenIssues("bug");

    expect(results).toEqual([
      { number: 42, title: "Bug", body: "It breaks", htmlUrl: "https://github.com/x/y/issues/42" },
    ]);
  });

  it("throws with the response body when the request fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Bad credentials", { status: 401 }));

    await expect(searchOpenIssues("bug")).rejects.toThrow(/401/);
  });
});

describe("createIssue", () => {
  it("POSTs to the repo's issues endpoint with the title and body", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ number: 7, title: "New bug", body: "Details", html_url: "https://github.com/x/y/issues/7" }),
        { status: 201 }
      )
    );

    const result = await createIssue("New bug", "Details");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/juniorhamish/chorez/issues");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toEqual({ title: "New bug", body: "Details" });
    expect(result).toEqual({ number: 7, title: "New bug", body: "Details", htmlUrl: "https://github.com/x/y/issues/7" });
  });

  it("throws when GitHub rejects the request", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Validation failed", { status: 422 }));

    await expect(createIssue("Title", "Body")).rejects.toThrow(/422/);
  });
});

describe("commentOnIssue", () => {
  it("POSTs a comment to the issue's comments endpoint", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 201 }));

    await commentOnIssue(42, "Me too!");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/juniorhamish/chorez/issues/42/comments");
    expect(JSON.parse(options.body as string)).toEqual({ body: "Me too!" });
  });

  it("throws when GitHub rejects the request", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

    await expect(commentOnIssue(42, "Me too!")).rejects.toThrow(/404/);
  });
});
