// Bumps the ?v=N cache-busting number on every page (and the README note), so browsers fetch the new
// assets/data.js after an update. Used by the daily scripts in this folder.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);

export function bumpVersion() {
  const files = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
  const v = Math.max(...files.map((f) => +(readFileSync(new URL(f, ROOT), "utf8").match(/\?v=(\d+)/) || [, 0])[1]));
  for (const f of files) {
    const p = new URL(f, ROOT);
    writeFileSync(p, readFileSync(p, "utf8").replace(/\?v=\d+/g, `?v=${v + 1}`));
  }
  const readme = new URL("README.md", ROOT);
  writeFileSync(readme, readFileSync(readme, "utf8")
    .replace(/bump the `\?v=\d+` number/, `bump the \`?v=${v + 1}\` number`)
    .replace(/\(e\.g\. to `\?v=\d+`\)/, `(e.g. to \`?v=${v + 2}\`)`));
  return v + 1;
}
