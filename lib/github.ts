// Thin wrapper around the GitHub REST API used to raise (or comment on)
// issues in this project's GitHub repository on behalf of users reporting a
// problem through the app's Help button.
//
// Authentication uses a single service-account personal access token
// (GITHUB_TOKEN) so that end users never need a GitHub account of their own
// — every issue/comment is posted anonymously as that service account.

const GITHUB_API_BASE = "https://api.github.com";

export interface GithubIssueSummary {
  number: number;
  title: string;
  body: string;
  htmlUrl: string;
}

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token) {
    throw new Error("GITHUB_TOKEN is not set");
  }
  if (!repo) {
    throw new Error("GITHUB_REPO is not set");
  }

  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`GITHUB_REPO must be in "owner/repo" format, got "${repo}"`);
  }

  return { token, owner, name };
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function parseErrorBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return response.statusText;
  }
}

// Searches OPEN issues in the configured repo matching `query` (plain
// keywords — GitHub's search syntax also works). Used to gather a small set
// of candidate issues that an AI screening step can then judge for semantic
// duplicates before we decide whether to open a new issue.
export async function searchOpenIssues(query: string, limit = 5): Promise<GithubIssueSummary[]> {
  const { token, owner, name } = getConfig();

  const q = encodeURIComponent(`repo:${owner}/${name} is:issue is:open ${query}`);
  const response = await fetch(`${GITHUB_API_BASE}/search/issues?q=${q}&per_page=${limit}`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`GitHub issue search failed (${response.status}): ${await parseErrorBody(response)}`);
  }

  const data = await response.json();
  const items: unknown[] = Array.isArray(data?.items) ? data.items : [];

  return items.map((item) => {
    const issue = item as { number: number; title: string; body: string | null; html_url: string };
    return {
      number: issue.number,
      title: issue.title,
      body: issue.body ?? "",
      htmlUrl: issue.html_url,
    };
  });
}

// Opens a brand-new issue in the configured repo, authored by the service
// account.
export async function createIssue(title: string, body: string): Promise<GithubIssueSummary> {
  const { token, owner, name } = getConfig();

  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${name}/issues`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ title, body }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create GitHub issue (${response.status}): ${await parseErrorBody(response)}`);
  }

  const data = await response.json();
  return {
    number: data.number,
    title: data.title,
    body: data.body ?? "",
    htmlUrl: data.html_url,
  };
}

// Adds a comment (as the service account) to an existing issue, used when a
// new report is judged to be a duplicate of one already open.
export async function commentOnIssue(issueNumber: number, body: string): Promise<void> {
  const { token, owner, name } = getConfig();

  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${name}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    throw new Error(`Failed to comment on GitHub issue #${issueNumber} (${response.status}): ${await parseErrorBody(response)}`);
  }
}
