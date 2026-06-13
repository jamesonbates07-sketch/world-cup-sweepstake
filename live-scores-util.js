// ============================================================================
//  Live score overlay — ESPN's free, key-free public scoreboard API.
//
//  WHY THIS EXISTS:
//  The openfootball feed publishes fixtures but is slow to publish SCORES (and
//  still uses play-off placeholder names). This module pulls the real, final
//  scores straight from ESPN's public men's World Cup scoreboard
//  (league slug: fifa.world) and merges them onto the fixtures, so the live
//  site updates itself every day with no manual entry and no API key.
//
//  DESIGN (safe + additive — mirrors manual-scores-util):
//   - Only attaches a score to a match that has NO full-time score yet, so the
//     openfootball feed and the manual overlay always take precedence.
//   - Matches ESPN games to fixtures by CANONICAL team names using the very same
//     canonicalTeam() the scorer uses — so play-off placeholders ("UEFA Path A
//     winner" -> "Bosnia and Herzegovina") and name variants ("Czechia" ->
//     "Czech Republic", "USA" -> "United States") line up automatically.
//   - Only uses FINISHED games (status completed). In-progress games are ignored.
//   - On ANY network/parse/shape error it returns the matches UNCHANGED and never
//     throws, so a bad ESPN response can never break the build or wipe the board.
// ============================================================================

const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

function norm(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

// Match has a usable full-time score already?
function hasFeedScore(m) {
  return !!(m && m.score && Array.isArray(m.score.ft) &&
    Number.isFinite(Number(m.score.ft[0])) && Number.isFinite(Number(m.score.ft[1])));
}

// "2026-06-12" -> "20260612"
function compact(d) { return String(d == null ? '' : d).slice(0, 10).replace(/-/g, ''); }

// The ESPN date window to query: earliest fixture date .. today (UTC).
function dateWindow(matches) {
  const dates = matches.map(m => compact(m && m.date)).filter(s => /^\d{8}$/.test(s)).sort();
  const start = dates[0] || '20260611';
  const now = new Date();
  const end = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
  return { start, end: end >= start ? end : start };
}

// Parse an ESPN scoreboard payload into finished games:
// [{ dateCompact, home:{name,score,pen}, away:{name,score,pen} }, ...]
function parseEspn(json) {
  const out = [];
  const events = (json && Array.isArray(json.events)) ? json.events : [];
  for (const ev of events) {
    const comp = (ev && Array.isArray(ev.competitions)) ? ev.competitions[0] : null;
    if (!comp) continue;
    const type = (comp.status && comp.status.type) || (ev.status && ev.status.type) || {};
    const completed = type.completed === true || norm(type.state) === 'post';
    if (!completed) continue; // only final scores
    const cs = Array.isArray(comp.competitors) ? comp.competitors : [];
    if (cs.length < 2) continue;
    const home = cs.find(c => norm(c.homeAway) === 'home') || cs[0];
    const away = cs.find(c => norm(c.homeAway) === 'away') || cs[1];
    if (!home || !away) continue;
    const hs = Number(home.score), as = Number(away.score);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;
    const teamName = (c) => (c && c.team && (c.team.displayName || c.team.name || c.team.shortDisplayName)) || '';
    const pen = (c) => (c && c.shootoutScore != null && Number.isFinite(Number(c.shootoutScore))) ? Number(c.shootoutScore) : null;
    out.push({
      dateCompact: compact((comp.date || ev.date || '').slice(0, 10)),
      home: { name: teamName(home), score: hs, pen: pen(home) },
      away: { name: teamName(away), score: as, pen: pen(away) },
    });
  }
  return out;
}

// Merge ESPN final scores onto the openfootball fixtures.
//   matches: the fixtures array (openfootball, possibly already manual-overlaid)
//   opts.canonicalTeam: the scorer's canonicalTeam() (resolves placeholders + name variants)
//   opts.fetchImpl: fetch implementation (defaults to global fetch; injectable for tests)
// Returns a NEW array (originals untouched). NEVER throws.
async function mergeLiveScores(matches, opts) {
  try {
    if (!Array.isArray(matches) || !matches.length) return matches;
    const canonical = (opts && typeof opts.canonicalTeam === 'function') ? opts.canonicalTeam : (x => x);
    const fetchImpl = (opts && opts.fetchImpl) ? opts.fetchImpl : (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchImpl) { console.warn('live-scores: no fetch available — skipping.'); return matches; }

    const { start, end } = dateWindow(matches);
    const url = `${ESPN_URL}?dates=${start}-${end}&limit=950`;

    const res = await fetchImpl(url, { headers: { accept: 'application/json' } });
    if (!res || !res.ok) { console.warn(`live-scores: ESPN HTTP ${res ? res.status : '?'} — skipping.`); return matches; }
    const json = await res.json();

    const espn = parseEspn(json);
    if (!espn.length) { console.warn('live-scores: ESPN returned no finished matches — skipping.'); return matches; }

    // Index ESPN results by unordered canonical team pair.
    const pairKey = (x, y) => [norm(canonical(x)), norm(canonical(y))].sort().join(' v ');
    const byPair = new Map();
    for (const e of espn) {
      const k = pairKey(e.home.name, e.away.name);
      if (!byPair.has(k)) byPair.set(k, []);
      byPair.get(k).push(e);
    }

    let applied = 0;
    const out = matches.map(m => {
      if (!m || typeof m !== 'object' || hasFeedScore(m)) return m; // never override existing scores
      const candidates = byPair.get(pairKey(m.team1, m.team2));
      if (!candidates || !candidates.length) return m;
      // If a pair somehow plays twice (rare), pick the ESPN game closest in date.
      const md = Number(compact(m.date)) || 0;
      let best = candidates[0], bestDiff = Infinity;
      for (const c of candidates) {
        const diff = Math.abs((Number(c.dateCompact) || 0) - md);
        if (diff < bestDiff) { best = c; bestDiff = diff; }
      }
      // Orient ESPN home/away onto openfootball team1/team2.
      const team1IsHome = norm(canonical(m.team1)) === norm(canonical(best.home.name));
      const s1 = team1IsHome ? best.home : best.away;
      const s2 = team1IsHome ? best.away : best.home;
      const score = { ft: [s1.score, s2.score] };
      if (s1.pen != null && s2.pen != null) score.p = [s1.pen, s2.pen]; // knockout shootout
      applied++;
      return Object.assign({}, m, { score });
    });

    if (applied) console.log(`live-scores: merged ${applied} real score${applied === 1 ? '' : 's'} from ESPN (fifa.world).`);
    else console.log('live-scores: no new ESPN scores matched the fixtures.');
    return out;
  } catch (e) {
    console.warn('live-scores: overlay skipped (' + (e && e.message) + ').');
    return matches;
  }
}

module.exports = { mergeLiveScores, parseEspn, _internals: { dateWindow, compact, hasFeedScore } };
