// ============================================================================
//  World Cup 2026 Sweepstake — results updater
//  NO API KEY REQUIRED. Pulls free, public-domain data from openfootball.
//  Source: https://github.com/openfootball/worldcup.json  (public domain)
// ============================================================================

const fs = require('fs');

// Keyless public data source — nothing to leak, no token, no signup.
const DATA_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

// ---- Scoring rules (edit these in one place) -------------------------------
const WIN_POINTS = 3;
const DRAW_POINTS = 1;
// Bonus points for reaching/winning each knockout round:
const KNOCKOUT_BONUS = {
  ROUND_OF_32: 3,
  LAST_16: 5,
  QUARTER_FINALS: 10,
  SEMI_FINALS: 15,
  FINAL: 20,
};
// ----------------------------------------------------------------------------

// Map the data source's team names to OUR participants' team names.
const TEAM_NAME_MAPPINGS = {
  "Ivory Coast": "Côte d'Ivoire",
  "South Korea": "Korea Republic",
  "USA": "United States",
  "United States of America": "United States",
  "DR Congo": "Congo DR",
  "Democratic Republic of the Congo": "Congo DR",
  "Congo DR": "Congo DR",
  "Cape Verde": "Cape Verde Islands",
  "Bosnia & Herzegovina": "Bosnia and Herzegovina",
  "Bosnia-Herzegovina": "Bosnia and Herzegovina",
  "Bosnia": "Bosnia and Herzegovina",
  "Curacao": "Curaçao",
  "Czechia": "Czech Republic",
  "Turkiye": "Turkey",
  "Türkiye": "Turkey",
  "IR Iran": "Iran",
};

const PARTICIPANTS = [
  { name: 'Abi', team: 'Austria' },
  { name: 'Adrian', team: "Côte d'Ivoire" },
  { name: 'Alex', team: 'Scotland' },
  { name: 'Andrea', team: 'Spain' },
  { name: 'Bella', team: 'Argentina' },
  { name: 'Charlotte', team: 'Australia' },
  { name: 'Dan', team: 'France' },
  { name: 'Darryl', team: 'Ecuador' },
  { name: 'Dermot', team: 'Congo DR' },
  { name: 'Derran', team: 'Haiti' },
  { name: 'Ed', team: 'Paraguay' },
  { name: 'Ellie', team: 'Panama' },
  { name: 'Enrico', team: 'Netherlands' },
  { name: 'Fergus', team: 'South Africa' },
  { name: 'George', team: 'Ghana' },
  { name: 'Hayley', team: 'Mexico' },
  { name: 'Holly', team: 'Algeria' },
  { name: 'Jack', team: 'Belgium' },
  { name: 'James G', team: 'United States' },
  { name: 'Jameson B', team: 'New Zealand' },
  { name: 'Jonathan B', team: 'Sweden' },
  { name: 'Karl D', team: 'Uzbekistan' },
  { name: 'Katie O\'Hara', team: 'Croatia' },
  { name: 'Leena', team: 'Norway' },
  { name: 'Liliana', team: 'Uruguay' },
  { name: 'Louise', team: 'Germany' },
  { name: 'Mark G', team: 'Iraq' },
  { name: 'Marta', team: 'Curaçao' },
  { name: 'Matthew Collison', team: 'Japan' },
  { name: 'Matthew Garvey', team: 'Egypt' },
  { name: 'Matty Z', team: 'Jordan' },
  { name: 'Michael H', team: 'Cape Verde Islands' },
  { name: 'Micky P', team: 'Czech Republic' },
  { name: 'Natasha B', team: 'Iran' },
  { name: 'Nathan G', team: 'Turkey' },
  { name: 'Nic B', team: 'Bosnia and Herzegovina' },
  { name: 'Patrick Lindon', team: 'Tunisia' },
  { name: 'Rebecca V', team: 'Morocco' },
  { name: 'Richie C', team: 'Saudi Arabia' },
  { name: 'Robin', team: 'Senegal' },
  { name: 'Sam M', team: 'Colombia' },
  { name: 'Sammi Hughes', team: 'Korea Republic' },
  { name: 'Stuart Staves', team: 'Portugal' },
  { name: 'Tina', team: 'England' },
  { name: 'Ugne', team: 'Brazil' },
  { name: 'Wendy', team: 'Switzerland' },
  { name: 'Augustin', team: 'Canada' },
];

function canonicalTeam(name) {
  if (!name) return '';
  return TEAM_NAME_MAPPINGS[name] || name;
}

function findParticipant(teamName) {
  const canon = canonicalTeam(teamName).toLowerCase();
  return PARTICIPANTS.find(p => p.team.toLowerCase() === canon) || null;
}

// Map openfootball "round" labels to stage codes the front-end understands.
function roundToStage(round) {
  const r = (round || '').toLowerCase();
  if (r.includes('round of 32')) return 'ROUND_OF_32';
  if (r.includes('round of 16') || r.includes('last 16')) return 'LAST_16';
  if (r.includes('quarter')) return 'QUARTER_FINALS';
  if (r.includes('semi')) return 'SEMI_FINALS';
  if (r.includes('third') || r.includes('3rd')) return 'THIRD_PLACE';
  if (r.includes('final')) return 'FINAL';
  return 'GROUP_STAGE';
}

// openfootball time looks like "13:00 UTC-6" or "19:00". Build an ISO date string.
function parseUtcDate(date, time) {
  if (!date) return null;
  if (!time) return `${date}T00:00:00Z`;
  const m = time.match(/(\d{1,2}):(\d{2})\s*(?:UTC([+-]\d{1,2}))?/);
  if (!m) return `${date}T00:00:00Z`;
  const hh = m[1].padStart(2, '0');
  const mm = m[2];
  let offset = 'Z';
  if (m[3]) {
    const sign = m[3][0];
    const oh = String(Math.abs(parseInt(m[3], 10))).padStart(2, '0');
    offset = `${sign}${oh}:00`;
  }
  return `${date}T${hh}:${mm}:00${offset}`;
}

// Safely coerce anything to a finite number (defends against bad/garbled data).
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// A match counts as played once it has a valid two-number full-time score.
function isPlayed(match) {
  return !!(match && match.score && Array.isArray(match.score.ft) &&
    match.score.ft.length >= 2 &&
    Number.isFinite(Number(match.score.ft[0])) &&
    Number.isFinite(Number(match.score.ft[1])));
}

// Determine the actual winner of a knockout tie: penalties > extra time > full time.
function knockoutWinner(match) {
  const s = match.score || {};
  const pick = (arr) => (arr[0] > arr[1] ? match.team1 : arr[1] > arr[0] ? match.team2 : null);
  if (Array.isArray(s.p)) return pick(s.p);
  if (Array.isArray(s.et)) return pick(s.et);
  if (Array.isArray(s.ft)) return pick(s.ft);
  return null;
}

// The score that decides win/draw/loss points. Per the rules, a win in 90 mins
// OR extra time = 3 pts, so use the extra-time score when a match went to ET.
// A penalty shootout means it was level through ET, so it counts as a DRAW
// (1 pt each) — the shootout winner is rewarded separately via the knockout bonus.
function resultScore(match) {
  const s = match.score || {};
  if (Array.isArray(s.et) && s.et.length >= 2) return [num(s.et[0]), num(s.et[1])];
  return [num(s.ft[0]), num(s.ft[1])];
}

// Pure computation — takes raw openfootball matches, returns the results payload.
// Exported so it can be unit-tested without any network access.
function computeResults(rawMatches) {
  // Never trust the input shape — coerce to a clean array.
  if (!Array.isArray(rawMatches)) rawMatches = [];

  const points = {};
  const goals = {};
  PARTICIPANTS.forEach(p => { points[p.name] = 0; goals[p.name] = 0; });

  // Points & goals from every played match. Uses the decisive score (extra time
  // if the match went to ET, otherwise 90 mins) so ET wins correctly score 3 pts.
  rawMatches.filter(isPlayed).forEach(m => {
    const home = findParticipant(m.team1);
    const away = findParticipant(m.team2);
    const [hs, as] = resultScore(m);
    if (home) {
      goals[home.name] += hs;
      if (hs > as) points[home.name] += WIN_POINTS;
      else if (hs === as) points[home.name] += DRAW_POINTS;
    }
    if (away) {
      goals[away.name] += as;
      if (as > hs) points[away.name] += WIN_POINTS;
      else if (hs === as) points[away.name] += DRAW_POINTS;
    }
  });

  // Knockout advancement bonus to the actual progressing team.
  rawMatches.filter(m => isPlayed(m) && roundToStage(m.round) !== 'GROUP_STAGE').forEach(m => {
    const bonus = KNOCKOUT_BONUS[roundToStage(m.round)] || 0;
    if (!bonus) return;
    const p = findParticipant(knockoutWinner(m));
    if (p) points[p.name] += bonus;
  });

  // Front-end-compatible matches array (same shape the page already renders).
  // Skip any non-object entries so a malformed feed can never crash the build.
  const matches = rawMatches.filter(m => m && typeof m === 'object').map(m => {
    const played = isPlayed(m);
    const homeP = findParticipant(m.team1);
    const awayP = findParticipant(m.team2);
    return {
      utcDate: parseUtcDate(m.date, m.time),
      status: played ? 'FINISHED' : 'SCHEDULED',
      stage: roundToStage(m.round),
      homeTeam: { name: homeP ? homeP.team : (m.team1 || 'TBD') },
      awayTeam: { name: awayP ? awayP.team : (m.team2 || 'TBD') },
      score: {
        fullTime: { home: played ? num(m.score.ft[0]) : null, away: played ? num(m.score.ft[1]) : null },
        halfTime: {
          home: Array.isArray(m.score?.ht) ? num(m.score.ht[0]) : null,
          away: Array.isArray(m.score?.ht) ? num(m.score.ht[1]) : null,
        },
      },
    };
  });

  // Short recap of the most recent finished matches.
  const recent = matches
    .filter(m => m.status === 'FINISHED')
    .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
    .slice(0, 5);
  let summaryText = 'The sweepstake is ready! Waiting for the tournament to kick off.';
  if (recent.length) {
    const descs = recent.map(m => `${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name}`);
    summaryText = `Recent action: ${descs.join(' | ')}. Leaderboard updated!`;
  }

  return { lastUpdated: new Date().toISOString(), points, goals, matches, summaryText };
}

async function run() {
  console.log('Fetching latest World Cup data (no API key needed)...');
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Data source returned HTTP ${res.status}`);
  const data = await res.json();
  const rawMatches = data.matches || [];

  const output = computeResults(rawMatches);
  fs.writeFileSync('results.json', JSON.stringify(output, null, 2));

  const played = output.matches.filter(m => m.status === 'FINISHED').length;
  console.log(`Done. Processed ${output.matches.length} matches; ${played} played. results.json updated.`);
}

// Only fetch + write when run directly (so tests can import computeResults safely).
if (require.main === module) {
  run().catch(err => { console.error('Error updating results:', err); process.exit(1); });
}

module.exports = { computeResults, findParticipant, roundToStage, knockoutWinner, parseUtcDate, PARTICIPANTS };
