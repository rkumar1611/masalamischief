// Visitors' feedback (the /feedback page): ideas, bugs, missing films and anything else. Messages wait in D1 (table
// feedback) and are read in /admin → Feedback; nothing is shown publicly. Used by functions/api/feedback.js and admin-stats.js.

export const FEEDBACK_KINDS = {
  idea: "Idea or suggestion",
  bug: "Something's broken",
  missing: "A film or series is missing",
  other: "Something else",
};

let schemaReady = false;
export async function ensureFeedbackSchema(db) {
  if (schemaReady) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    contact TEXT,
    page TEXT,
    created INTEGER NOT NULL,
    ip_hash TEXT,
    status TEXT NOT NULL DEFAULT 'open'
  )`).run();
  schemaReady = true;
}
