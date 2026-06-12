// ============================================================================
//  Manual score overlay.
//
//  WHY THIS EXISTS:
//  The free openfootball feed is the source of truth, but it can lag — it
//  sometimes lists fixtures for hours/days before publishing the actual score.
//  When that happens the scoreboard would show zeros even though matches were
//  played. This overlay lets us fill those gaps with manually-verified scores
//  (see manual-scores.json) until the feed catches up.
//
//  DESIGN (safe + additive):
//   - The live feed ALWAYS wins. We only attach a manual score to a match that
//     has no full-time score in the feed yet. So once openfootball publishes a
//     real score, the manual entry is ignored automatically.
//   - If manual-scores.json is missing, empty, or malformed, the feed is
//     returned completely unchanged. This function NEVER throws.
//   - Matching is by date + team1 + team2 exactly as they appear in the feed
//     (including play-off placeholders such as "UEFA Path D winner").
// ============================================================================
const fs = require('fs');
const path = require('path');

function norm(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
function keyOf(m) { return `${norm(m.date)}|${norm(m.team1)}|${norm(m.team2)}`; }
function hasFeedScore(m) {
  return !!(m && m.score && Array.isArray(m.score.ft) &&
    Number.isFinite(Number(m.score.ft[0])) && Number.isFinite(Number(m.score.ft[1])));
}

// matches: the array from the openfootball feed. dir: folder holding manual-scores.json.
// Returns a NEW array (originals untouched) with manual scores merged into gaps.
function applyManualScores(matches, dir) {
  try {
    if (!Array.isArray(matches)) return matches;
    const file = path.join(dir || __dirname, 'manual-scores.json');
    if (!fs.existsSync(file)) return matches;

    const txt = fs.readFileSync(file, 'utf8');
    if (!txt || !txt.trim()) return matches;

    const data = JSON.parse(txt);
    const overrides = Array.isArray(data) ? data
      : (data && Array.isArray(data.matches) ? data.matches : []);
    if (!overrides.length) return matches;

    const byKey = new Map();
    overrides.forEach(o => {
      if (o && o.score && Array.isArray(o.score.ft)) byKey.set(keyOf(o), o.score);
    });
    if (!byKey.size) return matches;

    let applied = 0;
    const out = matches.map(m => {
      if (m && typeof m === 'object' && !hasFeedScore(m)) {
        const s = byKey.get(keyOf(m));
        if (s && Array.isArray(s.ft)) { applied++; return Object.assign({}, m, { score: s }); }
      }
      return m;
    });

    if (applied && process.env.MANUAL_SCORES_QUIET !== '1') {
      console.log(`manual-scores: filled ${applied} match${applied === 1 ? '' : 'es'} the feed hasn't scored yet.`);
    }
    return out;
  } catch (e) {
    console.warn('manual-scores: overlay skipped (' + e.message + ').');
    return matches;
  }
}

module.exports = { applyManualScores };
