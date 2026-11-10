// A tiny Cloudflare Worker that starts the Catalogue workflow on GitHub on time. GitHub's own scheduler often starts
// it hours late; Cloudflare's timer (a "Cron Trigger", free) is punctual. The Daily site update and the film-landed
// alerts then follow by themselves (they start when the Catalogue run finishes).
//
// This file is NOT part of the website: it is pasted into a separate Worker in the Cloudflare dashboard.
// Set up once (Cloudflare dashboard → Workers & Pages → Create → Worker → "Hello World" → Deploy → Edit code):
//   1. Replace the code with this file and Deploy.
//   2. Settings → Variables and Secrets → add a Secret named GITHUB_TOKEN: a GitHub fine-grained token for the
//      masalamischief repository with "Actions: Read and write" (GitHub → Settings → Developer settings →
//      Fine-grained tokens). It stays in Cloudflare; never paste it into code or chat.
//   3. Settings → Trigger Events → add a Cron Trigger:  17 2 * * *   (02:17 UTC = 7:47 am India time, every day)
// To test: in the Worker's code editor use "Trigger scheduled event", then look at GitHub → Actions for a new Catalogue run.
const REPO = "rkumar1611/masalamischief";
const WORKFLOW = "weekly-catalog.yml";

export default {
  async scheduled(event, env, ctx) {
    // Sundays (UTC) get the full rebuild, other days the quick run, as the GitHub schedule did.
    const mode = new Date(event.scheduledTime).getUTCDay() === 0 ? "full" : "quick";
    const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "masalamischief-catalogue-timer",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs: { mode } }),
    });
    if (!res.ok) console.log(`GitHub said ${res.status}: ${(await res.text()).slice(0, 200)}`);
    else console.log(`Started the Catalogue workflow (${mode}).`);
  },
  // Opening the Worker's address does nothing useful, on purpose.
  fetch() { return new Response("Masala Mischief catalogue timer.", { headers: { "content-type": "text/plain" } }); },
};
