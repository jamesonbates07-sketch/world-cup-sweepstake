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
  { name: 'Jake', team: 'Qatar' },
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

// Approximate FIFA world rankings for the drawn nations (lower number = better).
// Used ONLY for the "Biggest Disappointment" award. These are rough — edit freely.
const FIFA_RANKINGS = {
  'Argentina': 1, 'Spain': 2, 'France': 3, 'England': 4, 'Brazil': 5, 'Netherlands': 6,
  'Portugal': 7, 'Belgium': 8, 'Germany': 9, 'Croatia': 10, 'Uruguay': 11, 'Morocco': 12,
  'Colombia': 13, 'Mexico': 14, 'United States': 15, 'Switzerland': 17, 'Japan': 18,
  'Senegal': 19, 'Iran': 20, 'Austria': 21, 'Ecuador': 22, 'Korea Republic': 23,
  'Australia': 24, 'Turkey': 26, 'Canada': 27, 'Sweden': 28, 'Panama': 30, 'Egypt': 32,
  'Norway': 33, 'Algeria': 34, 'Czech Republic': 36, 'Scotland': 38, "Côte d'Ivoire": 40,
  'Tunisia': 41, 'Ghana': 42, 'Paraguay': 45, 'Congo DR': 55, 'Qatar': 54, 'South Africa': 56,
  'Uzbekistan': 57, 'Iraq': 58, 'Saudi Arabia': 60, 'Jordan': 62, 'Cape Verde Islands': 70,
  'Bosnia and Herzegovina': 73, 'Curaçao': 82, 'Haiti': 84, 'New Zealand': 89,
};

// Stage ordering — lower = earlier exit. Third-place playoff teams already lost in the semis.
const STAGE_ORDER = { GROUP_STAGE: 0, ROUND_OF_32: 1, LAST_16: 2, QUARTER_FINALS: 3, SEMI_FINALS: 4, THIRD_PLACE: 4, FINAL: 5 };

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

// Work out who has been eliminated and at what stage.
function computeEliminations(matches) {
  const result = {};
  PARTICIPANTS.forEach(p => { result[p.name] = { progressed: false, eliminated: false, stage: null, stageRank: null, date: null, onPens: false }; });

  // Who has actually played a group match.
  const playedGroup = {};
  matches.forEach(m => {
    if (roundToStage(m.round) === 'GROUP_STAGE' && isPlayed(m)) {
      const h = findParticipant(m.team1), a = findParticipant(m.team2);
      if (h) playedGroup[h.name] = true;
      if (a) playedGroup[a.name] = true;
    }
  });

  // Knockout fixtures (played OR scheduled), excluding the third-place playoff.
  const knockoutFixtures = matches.filter(m => {
    const s = roundToStage(m.round);
    return s !== 'GROUP_STAGE' && s !== 'THIRD_PLACE';
  });
  knockoutFixtures.forEach(m => {
    const h = findParticipant(m.team1), a = findParticipant(m.team2);
    if (h) result[h.name].progressed = true;
    if (a) result[a.name].progressed = true;
  });
  const anyKnockout = knockoutFixtures.length > 0;

  // Losers of played knockout matches are eliminated at that stage (earliest one counts).
  knockoutFixtures.filter(isPlayed).forEach(m => {
    const winnerName = knockoutWinner(m);
    if (!winnerName) return;
    const loserRaw = canonicalTeam(winnerName) === canonicalTeam(m.team1) ? m.team2 : m.team1;
    const loser = findParticipant(loserRaw);
    if (!loser) return;
    const stage = roundToStage(m.round);
    const sr = STAGE_ORDER[stage] ?? 1;
    const rec = result[loser.name];
    if (!rec.eliminated || sr < rec.stageRank) {
      rec.eliminated = true; rec.stage = stage; rec.stageRank = sr;
      rec.date = m.date || null; rec.onPens = Array.isArray(m.score && m.score.p);
    }
  });

  // Once knockout fixtures exist, anyone who played group games but isn't in them is out at the group stage.
  if (anyKnockout) {
    PARTICIPANTS.forEach(p => {
      const rec = result[p.name];
      if (!rec.progressed && playedGroup[p.name] && !rec.eliminated) {
        rec.eliminated = true; rec.stage = 'GROUP_STAGE'; rec.stageRank = 0; rec.date = null; rec.onPens = false;
      }
    });
  }
  return result;
}

// Compute the six novelty "booby prize" awards. Returns an object keyed by award;
// each value is null (not yet decided) or { holder, team, detail }.
function computeAwards(rawMatches, points, goalsFor) {
  const matches = Array.isArray(rawMatches) ? rawMatches.filter(m => m && typeof m === 'object') : [];
  const goalsAgainst = {}, maxConceded = {}, gamesPlayed = {};
  PARTICIPANTS.forEach(p => { goalsAgainst[p.name] = 0; maxConceded[p.name] = { goals: -1, opponent: null }; gamesPlayed[p.name] = 0; });

  matches.filter(isPlayed).forEach(m => {
    const [hs, as] = resultScore(m);
    const home = findParticipant(m.team1), away = findParticipant(m.team2);
    if (home) {
      goalsAgainst[home.name] += as; gamesPlayed[home.name]++;
      if (as > maxConceded[home.name].goals) maxConceded[home.name] = { goals: as, opponent: away ? away.team : (m.team2 || '?') };
    }
    if (away) {
      goalsAgainst[away.name] += hs; gamesPlayed[away.name]++;
      if (hs > maxConceded[away.name].goals) maxConceded[away.name] = { goals: hs, opponent: home ? home.team : (m.team1 || '?') };
    }
  });

  const elim = computeEliminations(matches);
  const teamOf = (name) => { const p = PARTICIPANTS.find(x => x.name === name); return p ? p.team : ''; };
  const gd = (name) => (goalsFor[name] || 0) - (goalsAgainst[name] || 0);
  const fmtGD = (n) => (n >= 0 ? '+' : '') + n;
  const anyPlayed = PARTICIPANTS.some(p => gamesPlayed[p.name] > 0);

  // 1) Rusty Spoon — fewest points, then worst goal difference.
  let rustySpoon = null;
  if (anyPlayed) {
    const w = [...PARTICIPANTS].sort((a, b) =>
      (points[a.name] || 0) - (points[b.name] || 0) || gd(a.name) - gd(b.name) || a.name.localeCompare(b.name))[0];
    rustySpoon = { holder: w.name, team: w.team, detail: `${points[w.name] || 0} pts · GD ${fmtGD(gd(w.name))}` };
  }

  // 2) Swiss Cheese — most goals conceded in a single game.
  let swissCheese = null;
  let worst = { goals: 0, name: null };
  PARTICIPANTS.forEach(p => { if (maxConceded[p.name].goals > worst.goals) worst = { goals: maxConceded[p.name].goals, name: p.name }; });
  if (worst.name) {
    swissCheese = { holder: worst.name, team: teamOf(worst.name), detail: `Let in ${worst.goals} vs ${maxConceded[worst.name].opponent}` };
  }

  // 3) Penalty Pain — first team eliminated on penalties.
  let penaltyPain = null;
  const penLosses = PARTICIPANTS.filter(p => elim[p.name].onPens)
    .map(p => ({ name: p.name, date: elim[p.name].date, stage: elim[p.name].stage }))
    .sort((a, b) => new Date(a.date || '2100-01-01') - new Date(b.date || '2100-01-01'));
  if (penLosses.length) {
    const w = penLosses[0];
    penaltyPain = { holder: w.name, team: teamOf(w.name), detail: `Out on penalties (${(w.stage || '').replace(/_/g, ' ').toLowerCase()})` };
  }

  // 4) Blank Sheet — fewest goals scored (among teams that have played).
  let blankSheet = null;
  if (anyPlayed) {
    const w = PARTICIPANTS.filter(p => gamesPlayed[p.name] > 0)
      .sort((a, b) => (goalsFor[a.name] || 0) - (goalsFor[b.name] || 0) || gamesPlayed[b.name] - gamesPlayed[a.name] || a.name.localeCompare(b.name))[0];
    blankSheet = { holder: w.name, team: w.team, detail: `${goalsFor[w.name] || 0} goals in ${gamesPlayed[w.name]} game${gamesPlayed[w.name] === 1 ? '' : 's'}` };
  }

  // 5) Biggest Disappointment — eliminated earliest; among those, the highest FIFA rank.
  let biggestDisappointment = null;
  const eliminated = PARTICIPANTS.filter(p => elim[p.name].eliminated);
  if (eliminated.length) {
    const rankOf = (p) => FIFA_RANKINGS[p.team] != null ? FIFA_RANKINGS[p.team] : 999;
    const w = eliminated.sort((a, b) =>
      elim[a.name].stageRank - elim[b.name].stageRank || rankOf(a) - rankOf(b) || a.name.localeCompare(b.name))[0];
    biggestDisappointment = { holder: w.name, team: w.team, detail: `FIFA #${rankOf(w)} — out at ${(elim[w.name].stage || '').replace(/_/g, ' ').toLowerCase()}` };
  }

  // 6) Unluckiest — most points among teams that didn't reach the knockouts.
  let unluckiest = null;
  const groupOut = PARTICIPANTS.filter(p => elim[p.name].eliminated && elim[p.name].stage === 'GROUP_STAGE');
  if (groupOut.length) {
    const w = groupOut.sort((a, b) => (points[b.name] || 0) - (points[a.name] || 0) || gd(b.name) - gd(a.name) || a.name.localeCompare(b.name))[0];
    unluckiest = { holder: w.name, team: w.team, detail: `${points[w.name] || 0} pts but didn't progress` };
  }

  return { rustySpoon, swissCheese, penaltyPain, blankSheet, biggestDisappointment, unluckiest };
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
    // Display the decisive score (extra time if it went to ET) so the card
    // matches the points awarded. Penalty shootouts are flagged separately.
    const [dispHome, dispAway] = played ? resultScore(m) : [null, null];
    const pens = Array.isArray(m.score?.p) ? [num(m.score.p[0]), num(m.score.p[1])] : null;
    return {
      utcDate: parseUtcDate(m.date, m.time),
      status: played ? 'FINISHED' : 'SCHEDULED',
      stage: roundToStage(m.round),
      group: m.group || null,
      homeTeam: { name: homeP ? homeP.team : (m.team1 || 'TBD') },
      awayTeam: { name: awayP ? awayP.team : (m.team2 || 'TBD') },
      penalties: pens,
      score: {
        fullTime: { home: dispHome, away: dispAway },
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

  const awards = computeAwards(rawMatches, points, goals);

  // Fun headline stats ("Tournament Pulse") — all derived from the same data.
  const playedRaw = rawMatches.filter(isPlayed);
  let totalGoals = 0;
  let biggestWin = null;
  playedRaw.forEach(m => {
    const [hs, as] = resultScore(m);
    totalGoals += hs + as;
    const margin = Math.abs(hs - as);
    if (margin > 0 && (!biggestWin || margin > biggestWin.margin)) {
      const homeWon = hs > as;
      const winP = findParticipant(homeWon ? m.team1 : m.team2);
      const loseP = findParticipant(homeWon ? m.team2 : m.team1);
      biggestWin = {
        margin,
        score: `${Math.max(hs, as)}–${Math.min(hs, as)}`,
        winner: winP ? winP.team : (homeWon ? m.team1 : m.team2),
        loser: loseP ? loseP.team : (homeWon ? m.team2 : m.team1),
      };
    }
  });
  // Golden Boot — participant whose team has scored the most (null until someone scores).
  let goldenBoot = null;
  PARTICIPANTS.forEach(p => { if (!goldenBoot || (goals[p.name] || 0) > goldenBoot.goals) goldenBoot = { holder: p.name, team: p.team, goals: goals[p.name] || 0 }; });
  if (!goldenBoot || goldenBoot.goals === 0) goldenBoot = null;

  // Champion — the winner of the Final (null until the Final is played). The big payoff.
  let champion = null;
  const finalMatch = playedRaw.find(m => roundToStage(m.round) === 'FINAL');
  if (finalMatch) { const w = findParticipant(knockoutWinner(finalMatch)); if (w) champion = { holder: w.name, team: w.team }; }

  const stats = { matchesPlayed: playedRaw.length, totalGoals, biggestWin, goldenBoot, champion };

  return { lastUpdated: new Date().toISOString(), points, goals, matches, summaryText, awards, stats };
}

async function run() {
  console.log('Fetching latest World Cup data (no API key needed)...');
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Data source returned HTTP ${res.status}`);
  const data = await res.json();
  const rawMatches = data.matches || [];

  const output = computeResults(rawMatches);
  fs.writeFileSync('results.json', JSON.stringify(output, null, 2));

  // Optional daily snapshot for the website's trend chart. Never fatal.
  try { require('./history-util').appendDailySnapshot(__dirname, output); }
  catch (e) { console.warn('history snapshot skipped:', e.message); }

  const played = output.matches.filter(m => m.status === 'FINISHED').length;
  console.log(`Done. Processed ${output.matches.length} matches; ${played} played. results.json updated.`);
}

// Only fetch + write when run directly (so tests can import computeResults safely).
if (require.main === module) {
  run().catch(err => { console.error('Error updating results:', err); process.exit(1); });
}

module.exports = { computeResults, computeAwards, computeEliminations, findParticipant, roundToStage, knockoutWinner, parseUtcDate, PARTICIPANTS };
