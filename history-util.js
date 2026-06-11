// ============================================================================
//  history-util.js — keeps a lightweight daily snapshot of the leaderboard so
//  the website can draw a "points over time" trend chart and a "biggest climber
//  today" callout.
//
//  This is intentionally OPTIONAL and DEFENSIVE. Both updaters call it inside a
//  try/catch, so anything that goes wrong here can never break the core
//  results.json build. It only ever appends to history.json.
// ============================================================================
const fs = require('fs');
const path = require('path');

const MAX_DAYS = 120; // keep at most ~4 months of daily snapshots

// Append (or replace) today's snapshot of everyone's points.
// `dir` = folder to write history.json into; `output` = the computeResults payload.
function appendDailySnapshot(dir, output) {
  if (!output || typeof output.points !== 'object' || output.points === null) return 0;
  const file = path.join(dir, 'history.json');
  const today = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD

  let hist = [];
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(parsed)) hist = parsed;
      else if (parsed && Array.isArray(parsed.snapshots)) hist = parsed.snapshots;
    }
  } catch (_) { hist = []; } // corrupt/old history? start fresh rather than throw

  // Coerce points to plain finite numbers.
  const points = {};
  for (const [k, v] of Object.entries(output.points)) {
    const n = Number(v);
    if (Number.isFinite(n)) points[k] = n;
  }

  const snapshot = {
    date: today,
    ts: new Date().toISOString(),
    matchesPlayed: (output.stats && Number(output.stats.matchesPlayed)) || 0,
    points,
  };

  // One entry per calendar day (UTC) — replace today's if it already exists,
  // so multiple runs in a day are idempotent.
  const idx = hist.findIndex(s => s && s.date === today);
  if (idx >= 0) hist[idx] = snapshot; else hist.push(snapshot);

  hist.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (hist.length > MAX_DAYS) hist = hist.slice(hist.length - MAX_DAYS);

  // Write in place. (Avoids rename/unlink, which some mounted/sandbox
  // filesystems disallow; the file is tiny and non-critical.)
  fs.writeFileSync(file, JSON.stringify(hist));
  return hist.length;
}

module.exports = { appendDailySnapshot };
