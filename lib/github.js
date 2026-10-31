// Saving files to the site's GitHub repository from a Cloudflare function (publishing reviews, applying
// corrections). Cloudflare Pages then publishes the change. Needs the GITHUB_TOKEN secret (a fine-grained
// token for this repository only, "Contents: Read and write"); GITHUB_REPO is optional.
const BRANCH = "main";

// UTF-8 text ↔ base64 (GitHub's contents API speaks base64; atob/btoa alone break on "₹" or "é").
const fromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

export function github(env) {
  if (!env.GITHUB_TOKEN) throw new Error("Publishing isn't set up yet: add the GITHUB_TOKEN secret in Cloudflare");
  const repo = env.GITHUB_REPO || "rkumar1611/masalamischief";
  const gh = async (path, init = {}) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28", "user-agent": "masala-mischief-publisher", ...(init.body ? { "content-type": "application/json" } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (init.allow404 && res.status === 404) return null;
      throw new Error(res.status === 401 ? "GitHub didn't accept the token (expired or wrong?)"
        : res.status === 403 || res.status === 404 ? "the token can't write to this repository (check it has Contents: Read and write)"
        : `GitHub said ${res.status}: ${data.message || "error"}`);
    }
    return data;
  };

  return {
    // The latest commit on main: { sha, tree }.
    async head() {
      const ref = await gh(`/git/ref/heads/${BRANCH}`);
      const commit = await gh(`/git/commits/${ref.object.sha}`);
      return { sha: ref.object.sha, tree: commit.tree.sha };
    },
    // A file's text at that commit, or null if it doesn't exist.
    async read(path, sha) {
      const f = await gh(`/contents/${encodeURI(path)}?ref=${sha}`, { allow404: true });
      return f ? fromB64(f.content) : null;
    },
    // The site's root folder listing at that commit.
    list: (sha) => gh(`/contents/?ref=${sha}`),
    // One commit with these files ({ path: text }) on top of `head`. Not forced: if main moved on
    // meanwhile (the daily bot), GitHub refuses and nothing is lost.
    async commit(head, files, message) {
      const tree = await gh("/git/trees", {
        method: "POST",
        body: JSON.stringify({ base_tree: head.tree, tree: Object.entries(files).map(([path, content]) => ({ path, mode: "100644", type: "blob", content })) }),
      });
      const commit = await gh("/git/commits", { method: "POST", body: JSON.stringify({ message, tree: tree.sha, parents: [head.sha] }) });
      await gh(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
      return commit.sha;
    },
  };
}
