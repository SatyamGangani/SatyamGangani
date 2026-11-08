const fs = require("node:fs");

const username = process.env.GITHUB_USERNAME || "SatyamGangani";
const token = process.env.GITHUB_TOKEN;
const readmePath = "README.md";
const start = "<!-- CONTRIBUTIONS:START -->";
const end = "<!-- CONTRIBUTIONS:END -->";

if (!token) throw new Error("GITHUB_TOKEN is required.");

async function github(path) {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

async function main() {
  const pulls = [];
  for (let page = 1; page <= 10; page++) {
    const query = new URLSearchParams({
      q: `is:pr is:merged author:${username}`,
      sort: "updated",
      order: "desc",
      per_page: "100",
      page: String(page),
    });
    const results = await github(`search/issues?${query}`);
    pulls.push(...results.items);
    if (results.items.length < 100) break;
  }

  const external = pulls
    .filter((pr) => !pr.repository_url.endsWith(`/${username}`))
    .sort((a, b) => new Date(b.pull_request.merged_at || b.closed_at) - new Date(a.pull_request.merged_at || a.closed_at))
    .slice(0, 8);

  const section = external.length
    ? external.map((pr) => {
        const repo = pr.repository_url.split("/").slice(-2).join("/");
        const date = new Date(pr.pull_request.merged_at || pr.closed_at)
          .toISOString().slice(0, 10);
        return `- [${repo} #${pr.number}: ${pr.title.replace(/\r?\n/g, " ")}](${pr.html_url}) · ${date}`;
      }).join("\n")
    : "_No merged public pull requests found yet. Check back soon!_";

  const readme = fs.readFileSync(readmePath, "utf8");
  const block = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!block.test(readme)) throw new Error("Contribution markers not found in README.md");
  fs.writeFileSync(readmePath, readme.replace(block, `${start}\n${section}\n${end}`));
  console.log(`Updated README with ${external.length} merged contribution(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
