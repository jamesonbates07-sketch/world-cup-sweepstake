/* ============================================================================
   WORLD CUP 2026 SWEEPSTAKE — THE KNOCKOUTS
   Broadcast-style knockout hub with a live bracket + predict-the-rest engine.
   Reads ONLY results.json (generated daily by the Node pipeline).
   ========================================================================== */

// ===== ROSTER (player -> nation) =====
const PARTICIPANTS = [
  { name: 'Abi', team: 'Austria', code: 'at' },
  { name: 'Adrian', team: "Côte d'Ivoire", code: 'ci' },
  { name: 'Alex', team: 'Scotland', code: 'gb-sct' },
  { name: 'Andrea', team: 'Spain', code: 'es' },
  { name: 'Bella', team: 'Argentina', code: 'ar' },
  { name: 'Charlotte', team: 'Australia', code: 'au' },
  { name: 'Dan', team: 'France', code: 'fr' },
  { name: 'Darryl', team: 'Ecuador', code: 'ec' },
  { name: 'Dermot', team: 'Congo DR', code: 'cd' },
  { name: 'Derran', team: 'Haiti', code: 'ht' },
  { name: 'Ed', team: 'Paraguay', code: 'py' },
  { name: 'Ellie', team: 'Panama', code: 'pa' },
  { name: 'Enrico', team: 'Netherlands', code: 'nl' },
  { name: 'Fergus', team: 'South Africa', code: 'za' },
  { name: 'George', team: 'Ghana', code: 'gh' },
  { name: 'Hayley', team: 'Mexico', code: 'mx' },
  { name: 'Holly', team: 'Algeria', code: 'dz' },
  { name: 'Jack', team: 'Belgium', code: 'be' },
  { name: 'Jake', team: 'Qatar', code: 'qa' },
  { name: 'James G', team: 'United States', code: 'us' },
  { name: 'Jameson B', team: 'New Zealand', code: 'nz' },
  { name: 'Jonathan B', team: 'Sweden', code: 'se' },
  { name: 'Karl D', team: 'Uzbekistan', code: 'uz' },
  { name: 'Katie O\'Hara', team: 'Croatia', code: 'hr' },
  { name: 'Leena', team: 'Norway', code: 'no' },
  { name: 'Liliana', team: 'Uruguay', code: 'uy' },
  { name: 'Louise', team: 'Germany', code: 'de' },
  { name: 'Mark G', team: 'Iraq', code: 'iq' },
  { name: 'Marta', team: 'Curaçao', code: 'cw' },
  { name: 'Matthew Collison', team: 'Japan', code: 'jp' },
  { name: 'Matthew Garvey', team: 'Egypt', code: 'eg' },
  { name: 'Matty Z', team: 'Jordan', code: 'jo' },
  { name: 'Michael H', team: 'Cape Verde Islands', code: 'cv' },
  { name: 'Micky P', team: 'Czech Republic', code: 'cz' },
  { name: 'Natasha B', team: 'Iran', code: 'ir' },
  { name: 'Nathan G', team: 'Turkey', code: 'tr' },
  { name: 'Nic B', team: 'Bosnia and Herzegovina', code: 'ba' },
  { name: 'Nirusha', team: 'Tunisia', code: 'tn' },
  { name: 'Rebecca V', team: 'Morocco', code: 'ma' },
  { name: 'Richie C', team: 'Saudi Arabia', code: 'sa' },
  { name: 'Robin', team: 'Senegal', code: 'sn' },
  { name: 'Sam M', team: 'Colombia', code: 'co' },
  { name: 'Sammi Hughes', team: 'Korea Republic', code: 'kr' },
  { name: 'Stuart Staves', team: 'Portugal', code: 'pt' },
  { name: 'Tina', team: 'England', code: 'gb-eng' },
  { name: 'Ugne', team: 'Brazil', code: 'br' },
  { name: 'Wendy', team: 'Switzerland', code: 'ch' },
  { name: 'Augustin', team: 'Canada', code: 'ca' },
];

// ===== TEAM NAME NORMALISATION (feed <-> roster) =====
const TEAM_NAME_MAPPINGS = {
  "Ivory Coast": "Côte d'Ivoire",
  "South Korea": "Korea Republic",
  "USA": "United States",
  "DR Congo": "Congo DR",
  "Democratic Republic of the Congo": "Congo DR",
  "Cape Verde": "Cape Verde Islands",
  "Bosnia & Herzegovina": "Bosnia and Herzegovina",
  "Bosnia": "Bosnia and Herzegovina",
  "Curacao": "Curaçao",
  "Czechia": "Czech Republic",
  "Turkiye": "Turkey",
  "Türkiye": "Turkey",
};
function normalizeTeamName(name) {
  if (!name) return '';
  return (TEAM_NAME_MAPPINGS[name] || name).toLowerCase().trim();
}
function findParticipant(teamName) {
  if (!teamName) return null;
  const lower = normalizeTeamName(teamName);
  return PARTICIPANTS.find(p => p.team.toLowerCase() === lower) || null;
}

// ===== KNOCKOUT MODEL =====
// Win = 3, plus a stage bonus to the team that advances.
const WIN_POINTS = 3;
const STAGE_BONUS = { ROUND_OF_32: 3, LAST_16: 5, QUARTER_FINALS: 10, SEMI_FINALS: 15, FINAL: 20 };
const STAGE_LABEL = { ROUND_OF_32: 'Round of 32', LAST_16: 'Round of 16', QUARTER_FINALS: 'Quarter-finals', SEMI_FINALS: 'Semi-finals', THIRD_PLACE: 'Third place', FINAL: 'Final' };
const STAGE_SHORT = { ROUND_OF_32: 'R32', LAST_16: 'R16', QUARTER_FINALS: 'QF', SEMI_FINALS: 'SF', FINAL: 'F' };
const STAGE_IDX = { ROUND_OF_32: 0, LAST_16: 1, QUARTER_FINALS: 2, SEMI_FINALS: 3, FINAL: 4 };
const KO_MAX = [3 + 3, 3 + 5, 3 + 10, 3 + 15, 3 + 20]; // max points still on offer per round (win + bonus)

// Fixed 2026 bracket feeder graph (match number -> [feeder1, feeder2]).
const FEEDERS = {
  89: [74, 77], 90: [73, 75], 91: [76, 78], 92: [79, 80],
  93: [83, 84], 94: [81, 82], 95: [86, 88], 96: [85, 87],
  97: [89, 90], 98: [93, 94], 99: [91, 92], 100: [95, 96],
  101: [97, 98], 102: [99, 100],
  103: ['L101', 'L102'],
  104: [101, 102],
};
const STAGE_BASE = { ROUND_OF_32: 73, LAST_16: 89, QUARTER_FINALS: 97, SEMI_FINALS: 101, THIRD_PLACE: 103, FINAL: 104 };
const SCORING_NUMS = [89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 104]; // 3rd place (103) excluded

// Approx FIFA seeds (lower = stronger) for the auto-fill baseline.
const FIFA_RANK = {
  'Argentina': 1, 'France': 2, 'Spain': 3, 'England': 4, 'Brazil': 5, 'Portugal': 6,
  'Netherlands': 7, 'Belgium': 8, 'Germany': 9, 'Croatia': 10, 'Morocco': 12, 'Colombia': 13,
  'Uruguay': 14, 'United States': 15, 'Switzerland': 16, 'Japan': 17, 'Senegal': 18, 'Mexico': 19,
  'Iran': 20, 'Korea Republic': 21, 'Australia': 22, 'Ecuador': 23, 'Austria': 24, 'Sweden': 25,
  'Norway': 26, 'Turkey': 27, 'Canada': 28, 'Egypt': 29, 'Tunisia': 30, "Côte d'Ivoire": 31,
  'Algeria': 32, 'Scotland': 33, 'Czech Republic': 34, 'Paraguay': 35, 'Qatar': 36, 'Saudi Arabia': 38,
  'Bosnia and Herzegovina': 39, 'Iraq': 55, 'Congo DR': 56, 'South Africa': 58, 'Uzbekistan': 60,
  'Jordan': 62, 'Cape Verde Islands': 65, 'Ghana': 68, 'Panama': 70, 'Curaçao': 90, 'Haiti': 95, 'New Zealand': 100,
};

const SHORT_TEAM = {
  'Bosnia and Herzegovina': 'Bosnia', 'Cape Verde Islands': 'Cape Verde', "Côte d'Ivoire": 'Ivory Coast',
  'Korea Republic': 'S. Korea', 'United States': 'USA', 'Congo DR': 'DR Congo',
  'Czech Republic': 'Czechia', 'South Africa': 'S. Africa', 'New Zealand': 'N. Zealand',
};
function shortTeam(n) { return SHORT_TEAM[n] || n || 'TBD'; }

// ===== STATE =====
let state = {
  points: {}, goals: {}, matches: [], awards: {}, stats: null,
  lastUpdated: null, summaryText: '',
  sort: 'points', search: '',
  predictMode: false, predictions: {},   // { matchNum: 'home' | 'away' }
  lbMode: 'current', raceFilter: 'alive',
};
let matchByNum = {};

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
  loadPredictions();
  initNav();
  initShare();
  initPredictControls();
  initLbMode();
  initRaceFilters();
  initTabs();
  initSort();
  initSearch();
  initAccordion();
  initMe();
  initToTop();
  initModalDismiss();
  initScrollReveal();
  fetchResults();
  setInterval(fetchResults, 60000); // gentle auto-refresh
});

// ===== HELPERS =====
function flagUrl(code, w = 80) { return `https://flagcdn.com/w${w}/${code}.png`; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function safeInt(v) { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; }
function getPoints(name) { return safeInt(state.points[name]) || 0; }
function getGoals(name) { return safeInt(state.goals[name]) || 0; }
function isRealTeam(name) {
  return !!name && !/^[WL]\d+$/i.test(name) && !/^[123][A-L](\/|$)/.test(name) && !/winner$/i.test(name) && name !== 'TBD';
}
function prettySlot(name) {
  const s = String(name || '');
  let m;
  if ((m = s.match(/^([12])([A-L])$/))) return { main: m[1] === '1' ? 'Winner' : 'Runner-up', sub: 'Group ' + m[2] };
  if ((m = s.match(/^3([A-L/]+)$/))) return { main: '3rd place', sub: 'Grps ' + m[1] };
  if ((m = s.match(/^W(\d+)$/i))) return { main: 'Winner', sub: 'Match ' + m[1] };
  if ((m = s.match(/^L(\d+)$/i))) return { main: 'Loser', sub: 'Match ' + m[1] };
  if (/winner$/i.test(s)) return { main: s.replace(/winner$/i, '').trim(), sub: 'play-off' };
  return { main: s || 'TBD', sub: '' };
}
function formatDate(d) { try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch { return ''; } }
function formatTime(d) { try { return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }
function isSameLocalDay(iso, ref) { try { const a = new Date(iso), b = ref || new Date(); return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); } catch { return false; } }
function showToast(msg) { const t = document.getElementById('toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(t.__t); t.__t = setTimeout(() => t.classList.remove('show'), 3000); }

// ===== DATA FETCH =====
async function fetchResults() {
  try {
    const res = await fetch('results.json?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

    const changed = data.lastUpdated && window.__lastSeen && data.lastUpdated !== window.__lastSeen;

    state.points = isObj(data.points) ? data.points : {};
    state.goals = isObj(data.goals) ? data.goals : {};
    state.matches = Array.isArray(data.matches) ? data.matches : [];
    state.awards = isObj(data.awards) ? data.awards : {};
    state.stats = isObj(data.stats) ? data.stats : null;
    state.lastUpdated = data.lastUpdated || null;
    state.summaryText = data.summaryText || '';

    // Extra: the day-by-day history for the Title Race chart (never blocks the page).
    try {
      const hr = await fetch('history.json?t=' + Date.now());
      state.history = hr.ok ? await hr.json() : [];
    } catch { state.history = []; }
    if (!Array.isArray(state.history)) state.history = [];

    buildIndex(state.matches);
    renderAll();

    if (changed) showToast('🔄 Scores updated');
    window.__lastSeen = data.lastUpdated || window.__lastSeen;
  } catch (e) {
    console.warn('Could not load results.json:', e);
    state.matches = [];
    const lu = document.getElementById('last-updated');
    if (lu) lu.textContent = 'Data appears once the tournament data loads.';
    buildIndex([]);
    renderAll();
  }
}

function renderAll() {
  renderHero();
  renderToday();
  renderBracket();
  renderPredictPanel();
  renderLeaderboard();
  renderTitleRace();
  renderSurvival();
  renderGroups();
  renderAwards();
  renderCards();
  renderMatches();
  renderChampionBanner();
  renderYouBar();
  updateMeButton();
}

// ===== TITLE RACE (animated points-over-time chart) =====
function renderTitleRace() {
  const wrap = document.getElementById('race-svg-wrap');
  const legend = document.getElementById('race-legend');
  const empty = document.getElementById('titlerace-empty');
  if (!wrap) return;

  const hist = (Array.isArray(state.history) ? state.history : [])
    .filter(d => d && d.points && typeof d.points === 'object' && d.date);
  if (hist.length < 2) {
    wrap.innerHTML = ''; if (legend) legend.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  const pts = state.points || {};
  const allNames = PARTICIPANTS.map(p => p.name);
  let show = [...allNames].sort((a, b) => (pts[b] || 0) - (pts[a] || 0)).slice(0, 7);
  const me = (typeof getMe === 'function') ? getMe() : null;
  if (me && allNames.includes(me) && !show.includes(me)) show = show.slice(0, 6).concat(me);

  const N = hist.length;
  const series = {};
  show.forEach(n => series[n] = hist.map(d => Number(d.points[n] || 0)));
  const maxPts = Math.max(5, ...show.map(n => Math.max(...series[n])));

  const W = 1000, H = 440, padL = 42, padR = 138, padT = 18, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const X = i => padL + (N === 1 ? 0 : (i / (N - 1)) * plotW);
  const Y = v => padT + plotH - (v / maxPts) * plotH;
  const PAL = ['#f5c518', '#37e6c0', '#ff2d78', '#5aa2ff', '#b57bff', '#ffa657', '#4ade80', '#f28fb8'];

  let grid = '';
  const gy = 4;
  for (let g = 0; g <= gy; g++) {
    const v = Math.round(maxPts * g / gy), y = Y(v);
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="rc-grid"/>`;
    grid += `<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" class="rc-ylab">${v}</text>`;
  }
  let xl = '';
  [...new Set([0, Math.floor((N - 1) * 0.33), Math.floor((N - 1) * 0.66), N - 1])].forEach(i => {
    xl += `<text x="${X(i).toFixed(1)}" y="${H - 12}" class="rc-xlab">${esc(formatDate(hist[i].date))}</text>`;
  });

  let lines = '', dots = '', labels = '';
  show.forEach((n, idx) => {
    const col = PAL[idx % PAL.length];
    const d = series[n].map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    lines += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${idx === 0 ? 3.4 : 2.2}" stroke-linejoin="round" stroke-linecap="round" class="rc-line" data-name="${esc(n)}"/>`;
    const lx = X(N - 1), ly = Y(series[n][N - 1]);
    dots += `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="${idx === 0 ? 4.6 : 3.4}" fill="${col}" class="rc-dot" data-name="${esc(n)}"/>`;
    labels += `<text x="${(lx + 8).toFixed(1)}" y="${(ly + 4).toFixed(1)}" class="rc-endlab" fill="${col}" data-name="${esc(n)}">${esc(n)}${me === n ? ' ★' : ''}</text>`;
  });

  wrap.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" class="race-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Sweepstake points over time for the leading players">
      <g>${grid}</g><g>${xl}</g>
      <line id="rc-guide" class="rc-guide" x1="0" y1="${padT}" x2="0" y2="${padT + plotH}" style="display:none"/>
      <g class="rc-lines">${lines}</g><g>${dots}</g><g>${labels}</g>
      <rect id="rc-overlay" x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="transparent"/>
    </svg>
    <div class="rc-tip" id="rc-tip" style="display:none"></div>`;

  if (legend) legend.innerHTML = show.map((n, idx) =>
    `<button class="rc-chip${me === n ? ' me' : ''}" data-name="${esc(n)}"><span class="rc-swatch" style="background:${PAL[idx % PAL.length]}"></span>${esc(n)} <b>${pts[n] || 0}</b></button>`).join('');

  const svgEl = wrap.querySelector('svg');
  const overlay = wrap.querySelector('#rc-overlay');
  const guide = wrap.querySelector('#rc-guide');
  const tip = wrap.querySelector('#rc-tip');

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) {
    wrap.querySelectorAll('.rc-line').forEach((p, i) => {
      let len = 1000; try { len = p.getTotalLength(); } catch {}
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      requestAnimationFrame(() => { p.style.transition = `stroke-dashoffset 1.2s ease ${i * 0.06}s`; p.style.strokeDashoffset = 0; });
    });
  }

  function idxFromX(clientX) {
    const rect = svgEl.getBoundingClientRect();
    const rel = (clientX - rect.left) / rect.width * W;
    return Math.max(0, Math.min(N - 1, Math.round(((rel - padL) / plotW) * (N - 1))));
  }
  function onMove(ev) {
    const cx = ev.touches && ev.touches[0] ? ev.touches[0].clientX : ev.clientX;
    const i = idxFromX(cx), gx = X(i), day = hist[i];
    guide.setAttribute('x1', gx); guide.setAttribute('x2', gx); guide.style.display = 'block';
    const rows = show.map(n => ({ n, v: Number(day.points[n] || 0) })).sort((a, b) => b.v - a.v);
    tip.innerHTML = `<div class="rc-tip-date">${esc(formatDate(day.date))}</div>` +
      rows.map((r, ri) => `<div class="rc-tip-row${me === r.n ? ' me' : ''}"><span>${ri + 1}. ${esc(r.n)}</span><b>${r.v}</b></div>`).join('');
    tip.style.display = 'block';
    const rect = svgEl.getBoundingClientRect();
    const px = (gx / W) * rect.width;
    tip.style.left = Math.max(4, Math.min(rect.width - 168, px + 12)) + 'px';
  }
  function onLeave() { guide.style.display = 'none'; tip.style.display = 'none'; }
  if (overlay) {
    overlay.addEventListener('mousemove', onMove);
    overlay.addEventListener('mouseleave', onLeave);
    overlay.addEventListener('touchmove', onMove, { passive: true });
    overlay.addEventListener('touchend', onLeave);
  }

  if (legend) legend.querySelectorAll('.rc-chip').forEach(chip => chip.addEventListener('click', () => {
    const name = chip.getAttribute('data-name');
    const on = !chip.classList.contains('active');
    legend.querySelectorAll('.rc-chip').forEach(c => c.classList.remove('active'));
    if (on) chip.classList.add('active');
    const focus = on ? name : null;
    svgEl.querySelectorAll('.rc-line,.rc-dot,.rc-endlab').forEach(el => {
      el.style.opacity = (!focus || el.getAttribute('data-name') === focus) ? '1' : '0.14';
    });
  }));
}

// ===== BRACKET INDEX + RESOLVERS =====
function buildIndex(matches) {
  matchByNum = {};
  const counters = {};
  (matches || []).forEach(m => {
    if (!m || !m.stage || !(m.stage in STAGE_BASE)) return; // skip group stage
    const st = m.stage;
    counters[st] = counters[st] || 0;
    const num = STAGE_BASE[st] + counters[st];
    counters[st]++;
    matchByNum[num] = {
      num, stage: st, status: m.status || 'SCHEDULED',
      utcDate: m.utcDate || null,
      penalties: Array.isArray(m.penalties) ? m.penalties : null,
      home: (m.homeTeam && m.homeTeam.name) || 'TBD',
      away: (m.awayTeam && m.awayTeam.name) || 'TBD',
      hs: m.score && m.score.fullTime ? safeInt(m.score.fullTime.home) : null,
      as: m.score && m.score.fullTime ? safeInt(m.score.fullTime.away) : null,
    };
  });
}
function matchFinished(m) { return m && m.status === 'FINISHED' && m.hs != null && m.as != null; }

// Resolve the concrete team in a slot (real name, else via feeder graph, else null).
function resolveTeam(num, side, seen) {
  const m = matchByNum[num]; if (!m) return null;
  const raw = side === 0 ? m.home : m.away;
  if (isRealTeam(raw)) return raw;
  const f = FEEDERS[num]; if (!f) return null;
  const ref = f[side];
  if (typeof ref === 'number') return winnerOfNum(ref, seen);
  const lm = String(ref).match(/^L(\d+)$/i);
  if (lm) return loserOfNum(+lm[1], seen);
  return null;
}
function winnerOfNum(num, seen) {
  seen = seen || new Set(); if (seen.has('w' + num)) return null; seen.add('w' + num);
  const m = matchByNum[num]; if (!m) return null;
  const a = resolveTeam(num, 0, seen), b = resolveTeam(num, 1, seen);
  if (matchFinished(m)) {
    const p = m.penalties;
    if (m.hs > m.as || (p && p[0] > p[1])) return a;
    if (m.as > m.hs || (p && p[1] > p[0])) return b;
    return null;
  }
  const pick = state.predictions[num];
  if (pick === 'home') return a;
  if (pick === 'away') return b;
  return null;
}
function loserOfNum(num, seen) {
  seen = seen || new Set(); if (seen.has('l' + num)) return null; seen.add('l' + num);
  const m = matchByNum[num]; if (!m) return null;
  const a = resolveTeam(num, 0, seen), b = resolveTeam(num, 1, seen);
  if (matchFinished(m)) {
    const p = m.penalties;
    if (m.hs > m.as || (p && p[0] > p[1])) return b;
    if (m.as > m.hs || (p && p[1] > p[0])) return a;
    return null;
  }
  const pick = state.predictions[num];
  if (pick === 'home') return b;
  if (pick === 'away') return a;
  return null;
}
function slotTeams(num) { return [resolveTeam(num, 0), resolveTeam(num, 1)]; }
function isPickable(num) {
  const m = matchByNum[num]; if (!m || matchFinished(m)) return false;
  const [a, b] = slotTeams(num);
  return !!(a && b);
}

// ===== PREDICTOR =====
function loadPredictions() {
  try {
    state.predictions = JSON.parse(localStorage.getItem('sweepstake_predictions') || '{}') || {};
    state.predictMode = localStorage.getItem('sweepstake_predict_mode') === '1';
  } catch { state.predictions = {}; }
}
function savePredictions() {
  try {
    localStorage.setItem('sweepstake_predictions', JSON.stringify(state.predictions));
    localStorage.setItem('sweepstake_predict_mode', state.predictMode ? '1' : '0');
  } catch {}
}
function setPrediction(num, side) {
  if (!isPickable(num)) return;
  if (state.predictions[num] === side) delete state.predictions[num]; // tap again to clear
  else state.predictions[num] = side;
  savePredictions();
  renderBracket(); renderPredictPanel(); renderLeaderboard(); renderChampionBanner();
}
function resetPredictions() {
  state.predictions = {}; savePredictions();
  renderBracket(); renderPredictPanel(); renderLeaderboard(); renderChampionBanner();
  showToast('↺ Predictions cleared');
}
function autofillPredictions() {
  // Fill every currently-resolvable, unpredicted tie by the better FIFA seed, cascading upward.
  const rounds = [[89, 96], [97, 100], [101, 102], [104, 104]];
  rounds.forEach(([lo, hi]) => {
    for (let n = lo; n <= hi; n++) {
      if (!matchByNum[n] || matchFinished(matchByNum[n])) continue;
      if (!isPickable(n)) continue;
      const [a, b] = slotTeams(n);
      const ra = FIFA_RANK[normalizeCanon(a)] ?? 999, rb = FIFA_RANK[normalizeCanon(b)] ?? 999;
      state.predictions[n] = ra <= rb ? 'home' : 'away';
    }
  });
  savePredictions();
  renderBracket(); renderPredictPanel(); renderLeaderboard(); renderChampionBanner();
  showToast('🎲 Filled by FIFA seed — tweak any pick you like');
}
function normalizeCanon(name) {
  const p = findParticipant(name);
  return p ? p.team : name;
}
function computeProjected() {
  const proj = {}; PARTICIPANTS.forEach(p => proj[p.name] = getPoints(p.name));
  SCORING_NUMS.forEach(num => {
    const m = matchByNum[num]; if (!m || matchFinished(m)) return;
    const w = winnerOfNum(num); if (!w) return;
    const p = findParticipant(w); if (!p) return;
    proj[p.name] += WIN_POINTS + (STAGE_BONUS[m.stage] || 0);
  });
  return proj;
}
function predictionCount() {
  return SCORING_NUMS.filter(n => matchByNum[n] && !matchFinished(matchByNum[n]) && state.predictions[n] && isPickable(n)).length;
}
function openTieCount() {
  return SCORING_NUMS.filter(n => matchByNum[n] && !matchFinished(matchByNum[n])).length;
}

// ===== HERO / META / COUNTDOWN =====
function currentStageInfo() {
  const stages = ['ROUND_OF_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'];
  let active = null;
  for (const st of stages) {
    const ms = state.matches.filter(m => m.stage === st);
    if (!ms.length) continue;
    const played = ms.filter(m => m.status === 'FINISHED').length;
    active = { stage: st, played, total: ms.length };
    if (played < ms.length) break;
  }
  return active;
}
function nextMatch() {
  const up = state.matches.filter(m => m.status !== 'FINISHED' && m.utcDate).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  return up[0] || null;
}
function renderHero() {
  const badge = document.getElementById('hero-stage-badge');
  const meta = document.getElementById('hero-meta');
  const info = currentStageInfo();
  if (badge) badge.textContent = info ? `FIFA World Cup 2026 · ${STAGE_LABEL[info.stage]}` : 'FIFA World Cup 2026 · Knockouts';
  if (meta) {
    const bits = [];
    if (info) bits.push(`<b>${STAGE_LABEL[info.stage]}</b> · ${info.played} of ${info.total} played`);
    if (state.stats && state.stats.matchesPlayed) bits.push(`${safeInt(state.stats.matchesPlayed)} matches · ${safeInt(state.stats.totalGoals) || 0} goals`);
    const champ = championName();
    if (champ) { const cp = findParticipant(champ); bits.length = 0; bits.push(`🏆 Champions: <b>${esc(cp ? cp.team : champ)}</b>${cp ? ` — ${esc(cp.name)}` : ''}`); }
    meta.innerHTML = bits.map(b => `<span class="hm-pill">${b}</span>`).join('');
  }
  startCountdown();
}
let __cdTimer = null;
function startCountdown() {
  const el = document.getElementById('countdown'); if (!el) return;
  if (__cdTimer) clearInterval(__cdTimer);
  const tick = () => {
    const nm = nextMatch();
    if (!nm) { el.innerHTML = championName() ? `<div class="cd-done">The tournament is complete 🏆</div>` : ''; return; }
    const t = new Date(nm.utcDate) - new Date();
    const label = `${esc(shortTeam(resolveDisplayName(nm, 'home')))} v ${esc(shortTeam(resolveDisplayName(nm, 'away')))}`;
    if (t <= 0) { el.innerHTML = `<div class="cd-live"><span class="cd-live-dot"></span> ${label} — kicking off</div>`; return; }
    const d = Math.floor(t / 86400000), hh = Math.floor(t / 3600000) % 24, mm = Math.floor(t / 60000) % 60, ss = Math.floor(t / 1000) % 60;
    const cell = (v, l) => `<div class="cd-cell"><span>${String(v).padStart(2, '0')}</span><small>${l}</small></div>`;
    el.innerHTML = `<div class="cd-label">Next up · ${label} · ${esc(formatDate(nm.utcDate))} ${esc(formatTime(nm.utcDate))}</div>
      <div class="cd-clock">${d > 0 ? cell(d, 'days') : ''}${cell(hh, 'hrs')}${cell(mm, 'min')}${cell(ss, 'sec')}</div>`;
  };
  tick(); __cdTimer = setInterval(tick, 1000);
}
function resolveDisplayName(m, side) {
  const raw = side === 'home' ? (m.homeTeam && m.homeTeam.name) : (m.awayTeam && m.awayTeam.name);
  if (isRealTeam(raw)) return raw;
  const ps = prettySlot(raw); return ps.main + (ps.sub ? ' (' + ps.sub + ')' : '');
}
function championName() {
  if (state.stats && state.stats.champion && state.stats.champion.team) return state.stats.champion.team;
  if (matchByNum[104] && matchFinished(matchByNum[104])) return winnerOfNum(104);
  return null;
}

// ===== TODAY STRIP =====
function renderToday() {
  const wrap = document.getElementById('today-strip'), title = document.getElementById('today-title');
  const lu = document.getElementById('last-updated');
  if (lu) lu.textContent = state.lastUpdated ? 'Updated ' + new Date(state.lastUpdated).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Loading…';
  if (!wrap) return;
  const today = state.matches.filter(m => isSameLocalDay(m.utcDate) && m.stage !== 'GROUP_STAGE');
  let list = today, heading = '⚡ On Today';
  if (!list.length) {
    const nm = nextMatch();
    heading = '⏭️ Next Up';
    list = nm ? state.matches.filter(m => m.status !== 'FINISHED' && isSameLocalDay(m.utcDate, new Date(nm.utcDate))) : [];
  }
  if (title) title.textContent = heading;
  if (!list.length) { wrap.innerHTML = `<div class="ts-empty">No upcoming knockout fixtures.</div>`; return; }
  wrap.innerHTML = list.slice(0, 6).map(m => {
    const hn = resolveDisplayName(m, 'home'), an = resolveDisplayName(m, 'away');
    const hp = findParticipant(m.homeTeam && m.homeTeam.name), ap = findParticipant(m.awayTeam && m.awayTeam.name);
    const fin = m.status === 'FINISHED' && m.score && m.score.fullTime;
    const hs = fin ? safeInt(m.score.fullTime.home) : null, as = fin ? safeInt(m.score.fullTime.away) : null;
    const mine = (hp && getMe() === hp.name) || (ap && getMe() === ap.name);
    const mid = fin ? `<span class="ts-score">${hs}–${as}</span>` : `<span class="ts-time">${esc(formatTime(m.utcDate))}</span>`;
    return `<div class="ts-card${mine ? ' mine' : ''}">
      <div class="ts-stage">${esc(STAGE_LABEL[m.stage] || '')}</div>
      <div class="ts-teams">
        <span class="ts-t">${hp ? `<img src="${flagUrl(hp.code)}" onerror="this.style.display='none'">` : ''}${esc(shortTeam(hn))}</span>
        ${mid}
        <span class="ts-t">${ap ? `<img src="${flagUrl(ap.code)}" onerror="this.style.display='none'">` : ''}${esc(shortTeam(an))}</span>
      </div>
      <div class="ts-owners">${hp ? esc(hp.name) : '—'} · ${ap ? esc(ap.name) : '—'}</div>
    </div>`;
  }).join('');
}

// ===== BRACKET =====
function treeOrder() {
  const order = { LAST_16: [], QUARTER_FINALS: [], SEMI_FINALS: [], FINAL: [] };
  const has = n => !!matchByNum[n];
  if (has(104)) {
    order.FINAL = [104];
    order.SEMI_FINALS = (FEEDERS[104] || []).filter(has);
    order.SEMI_FINALS.forEach(n => (FEEDERS[n] || []).forEach(f => has(f) && order.QUARTER_FINALS.push(f)));
    order.QUARTER_FINALS.forEach(n => (FEEDERS[n] || []).forEach(f => has(f) && order.LAST_16.push(f)));
  }
  const numeric = (base, count) => Array.from({ length: count }, (_, i) => base + i).filter(has);
  if (order.LAST_16.length !== numeric(89, 8).length) order.LAST_16 = numeric(89, 8);
  if (order.QUARTER_FINALS.length !== numeric(97, 4).length) order.QUARTER_FINALS = numeric(97, 4);
  if (order.SEMI_FINALS.length !== numeric(101, 2).length) order.SEMI_FINALS = numeric(101, 2);
  if (!order.FINAL.length) order.FINAL = numeric(104, 1);
  return order;
}
function renderBracket() {
  const host = document.getElementById('bracket');
  const empty = document.getElementById('bracket-empty');
  const scroll = document.getElementById('bracket-scroll');
  const seg = document.getElementById('round-seg');
  if (!host) return;

  const anyKo = Object.keys(matchByNum).length > 0;
  if (!anyKo) { host.innerHTML = ''; if (empty) empty.style.display = 'block'; if (scroll) scroll.style.display = 'none'; if (seg) seg.innerHTML = ''; return; }
  if (empty) empty.style.display = 'none';
  if (scroll) scroll.style.display = 'block';

  const bs = document.getElementById('bracket-section'); if (bs) bs.classList.toggle('predicting', state.predictMode);

  const order = treeOrder();
  const cols = [
    ['LAST_16', order.LAST_16], ['QUARTER_FINALS', order.QUARTER_FINALS],
    ['SEMI_FINALS', order.SEMI_FINALS], ['FINAL', order.FINAL],
  ].filter(([, arr]) => arr.length);

  const colsHtml = cols.map(([st, arr]) => {
    const cards = arr.map(n => matchCard(n)).join('');
    return `<div class="round round--${STAGE_SHORT[st].toLowerCase()}" data-round="${st}">
      <div class="round-label">${esc(STAGE_LABEL[st])}</div>
      <div class="round-matches">${cards}</div>
    </div>`;
  }).join('');

  const champ = championName();
  const predChamp = !champ ? winnerOfNum(104) : null;
  const cName = champ || predChamp;
  const cp = cName ? findParticipant(cName) : null;
  const champHtml = `<div class="round champ-col" data-round="CHAMP">
    <div class="round-label">Champion</div>
    <div class="round-matches"><div class="champ-node ${champ ? 'decided' : predChamp ? 'predicted' : ''}">
      <div class="champ-trophy">🏆</div>
      ${cp ? `<img class="champ-flag" src="${flagUrl(cp.code, 160)}" onerror="this.style.display='none'">` : ''}
      <div class="champ-name">${cName ? esc(cp ? cp.team : cName) : 'TBD'}</div>
      <div class="champ-owner">${cp ? esc(cp.name) : (predChamp ? 'your pick' : 'to be decided')}</div>
    </div></div></div>`;

  host.innerHTML = colsHtml + champHtml;

  renderR32Strip();

  if (seg) {
    const segItems = cols.map(([st]) => `<button class="seg-btn" data-target="${st}">${esc(STAGE_SHORT[st])}</button>`);
    if (matchByNum[73]) segItems.unshift(`<button class="seg-btn" data-target="R32">R32</button>`);
    seg.innerHTML = segItems.join('');
    seg.querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.target;
      const node = t === 'R32' ? document.getElementById('r32-strip') : host.querySelector(`[data-round="${t}"]`);
      if (node) node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      seg.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
    }));
  }

  host.querySelectorAll('.match').forEach(card => {
    const num = +card.dataset.num;
    card.querySelectorAll('.m-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (state.predictMode && isPickable(num)) { e.stopPropagation(); const wasFinal = num === 104; setPrediction(num, row.dataset.side); if (wasFinal && state.predictions[104]) celebratePick(); }
        else openMatchModal(num);
      });
      row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (state.predictMode && isPickable(num)) setPrediction(num, row.dataset.side); else openMatchModal(num); } });
    });
  });
}

function matchCard(num) {
  const m = matchByNum[num]; if (!m) return '';
  const fin = matchFinished(m);
  const [ta, tb] = slotTeams(num);
  const pickable = state.predictMode && isPickable(num);
  const live = !fin && isSameLocalDay(m.utcDate);
  const pick = state.predictions[num];

  const pens = m.penalties;
  const homeWin = fin && (m.hs > m.as || (pens && pens[0] > pens[1]));
  const awayWin = fin && (m.as > m.hs || (pens && pens[1] > pens[0]));
  const homePick = !fin && pick === 'home', awayPick = !fin && pick === 'away';

  const row = (side, teamName, score, win, picked) => {
    const p = teamName ? findParticipant(teamName) : null;
    const pretty = p ? null : prettySlot(side === 0 ? m.home : m.away);
    const body = p
      ? `<img class="m-flag" src="${flagUrl(p.code)}" onerror="this.style.display='none'"><span class="m-team">${esc(shortTeam(teamName))}</span><span class="m-owner">${esc(p.name)}</span>`
      : teamName
        ? `<span class="m-flag blank"></span><span class="m-team">${esc(shortTeam(teamName))}</span>`
        : `<span class="m-flag blank"></span><span class="m-tbd"><b>${esc(pretty.main)}</b>${pretty.sub ? `<i>${esc(pretty.sub)}</i>` : ''}</span>`;
    return `<div class="m-row ${side === 0 ? 'm-home' : 'm-away'}${win ? ' win' : ''}${picked ? ' picked' : ''}" data-side="${side === 0 ? 'home' : 'away'}" role="button" tabindex="0">
      ${body}<span class="m-score">${score != null ? score : (picked ? '✓' : '')}</span></div>`;
  };

  let foot = '';
  if (fin && pens) foot = `<div class="m-foot">pens ${safeInt(pens[0])}–${safeInt(pens[1])}</div>`;
  else if (fin) foot = `<div class="m-foot">FT · ${esc(formatDate(m.utcDate))}</div>`;
  else if (live) foot = `<div class="m-foot live"><span class="m-live-dot"></span> Today · ${esc(formatTime(m.utcDate))}</div>`;
  else foot = `<div class="m-foot">${esc(formatDate(m.utcDate))} · ${esc(formatTime(m.utcDate))}</div>`;

  return `<div class="match${fin ? ' done' : ''}${pickable ? ' pickable' : ''}${live ? ' islive' : ''}" data-num="${num}" role="group" aria-label="${esc(STAGE_LABEL[m.stage])} match">
    ${row(0, ta, fin ? m.hs : null, homeWin, homePick)}
    ${row(1, tb, fin ? m.as : null, awayWin, awayPick)}
    ${foot}
  </div>`;
}

function renderR32Strip() {
  if (!matchByNum[73]) { const ex = document.getElementById('r32-strip'); if (ex) ex.remove(); return; }
  const cards = [];
  for (let n = 73; n <= 88; n++) { if (matchByNum[n]) cards.push(matchCard(n)); }
  const html = `<div id="r32-strip" class="r32-strip">
    <div class="r32-head">Round of 32 · how we got here</div>
    <div class="r32-row">${cards.join('')}</div></div>`;
  const scroll = document.getElementById('bracket-scroll');
  const ex = document.getElementById('r32-strip'); if (ex) ex.remove();
  scroll.insertAdjacentHTML('afterend', html);
  document.querySelectorAll('#r32-strip .match').forEach(card => {
    const num = +card.dataset.num;
    card.addEventListener('click', () => openMatchModal(num));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMatchModal(num); } });
    card.setAttribute('tabindex', '0'); card.setAttribute('role', 'button');
  });
}

function celebratePick() {
  if (typeof confetti === 'function') confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors: ['#f5c518', '#ffd95a', '#37e6c0', '#ff2d78'] });
}

// ===== PREDICT PANEL / PROJECTED BOARD =====
function initPredictControls() {
  ['predict-toggle', 'predict-toggle-2'].forEach(id => { const b = document.getElementById(id); if (b) b.addEventListener('click', () => setPredictMode(!state.predictMode)); });
  ['reset-predictions', 'reset-predictions-2'].forEach(id => { const b = document.getElementById(id); if (b) b.addEventListener('click', resetPredictions); });
  const af = document.getElementById('autofill-btn'); if (af) af.addEventListener('click', autofillPredictions);
  syncPredictToggles();
}
function setPredictMode(on) {
  state.predictMode = on; savePredictions(); syncPredictToggles();
  renderBracket(); renderPredictPanel();
  if (on) { const bs = document.getElementById('bracket-section'); if (bs) bs.scrollIntoView({ behavior: 'smooth', block: 'start' }); showToast('🔮 Predict mode on — tap winners in the bracket'); }
}
function syncPredictToggles() {
  const t1 = document.getElementById('predict-toggle');
  const t2 = document.getElementById('predict-toggle-2');
  const hint = document.getElementById('predict-hint');
  if (t1) { t1.innerHTML = `🔮 Predict mode: <b>${state.predictMode ? 'On' : 'Off'}</b>`; t1.setAttribute('aria-pressed', state.predictMode); t1.classList.toggle('on', state.predictMode); }
  if (t2) { t2.innerHTML = state.predictMode ? '🔮 Predict mode is on' : '🔮 Turn on Predict mode'; t2.setAttribute('aria-pressed', state.predictMode); t2.classList.toggle('on', state.predictMode); }
  if (hint) hint.style.display = state.predictMode ? 'block' : 'none';
}
function renderPredictPanel() {
  const status = document.getElementById('predict-status');
  const board = document.getElementById('proj-board');
  const champWrap = document.getElementById('proj-champ');
  if (status) {
    const made = predictionCount(), open = openTieCount();
    const pc = winnerOfNum(104), pcp = pc ? findParticipant(pc) : null;
    status.innerHTML = `<div class="ps-stat"><span>${made}</span><small>ties predicted</small></div>
      <div class="ps-stat"><span>${open}</span><small>ties still open</small></div>
      <div class="ps-stat wide"><span>${pcp ? esc(pcp.team) : (pc ? esc(pc) : '—')}</span><small>${pcp ? 'your predicted champion (' + esc(pcp.name) + ')' : 'predict the final for a champion'}</small></div>`;
  }
  if (champWrap) {
    const pc = championName() || winnerOfNum(104);
    const cp = pc ? findParticipant(pc) : null;
    if (cp) { champWrap.style.display = 'flex'; champWrap.innerHTML = `<div class="pchamp-t">🏆</div><img src="${flagUrl(cp.code, 160)}" onerror="this.style.display='none'"><div><div class="pchamp-label">${championName() ? 'Champions' : 'Projected champions'}</div><div class="pchamp-name">${esc(cp.team)}</div><div class="pchamp-owner">${esc(cp.name)} would take the pot</div></div>`; }
    else { champWrap.style.display = 'none'; }
  }
  if (!board) return;

  const proj = computeProjected();
  const rows = PARTICIPANTS.map(p => ({ p, cur: getPoints(p.name), proj: proj[p.name], gls: getGoals(p.name) }));
  rows.sort((a, b) => b.proj - a.proj || b.gls - a.gls || a.p.name.localeCompare(b.p.name));
  const curRank = {}; [...rows].sort((a, b) => b.cur - a.cur || b.gls - a.gls || a.p.name.localeCompare(b.p.name)).forEach((r, i) => curRank[r.p.name] = i + 1);
  const max = Math.max(1, ...rows.map(r => r.proj));

  board.innerHTML = rows.slice(0, 12).map((r, i) => {
    const delta = r.proj - r.cur;
    const move = curRank[r.p.name] - (i + 1);
    const isMe = getMe() === r.p.name;
    const moveTag = move > 0 ? `<span class="mv up">▲${move}</span>` : move < 0 ? `<span class="mv down">▼${-move}</span>` : `<span class="mv flat">–</span>`;
    return `<div class="pb-row${isMe ? ' is-me' : ''}${i === 0 ? ' lead' : ''}" data-name="${esc(r.p.name)}" role="button" tabindex="0">
      <div class="pb-rank">${i + 1}${moveTag}</div>
      <img class="pb-flag" src="${flagUrl(r.p.code)}" onerror="this.style.display='none'">
      <div class="pb-id"><div class="pb-name">${esc(r.p.name)}${isMe ? ' <span class="me-tag">YOU</span>' : ''}</div><div class="pb-team">${esc(shortTeam(r.p.team))}</div></div>
      <div class="pb-bar"><div class="pb-bar-cur" style="width:${Math.round(r.cur / max * 100)}%"></div><div class="pb-bar-add" style="width:${Math.round(delta / max * 100)}%"></div></div>
      <div class="pb-pts"><b>${r.proj}</b>${delta > 0 ? `<span class="pb-delta">+${delta}</span>` : ''}</div>
    </div>`;
  }).join('');
  board.querySelectorAll('.pb-row').forEach(row => row.addEventListener('click', () => openProfile(row.dataset.name)));
}

// ===== LEADERBOARD =====
function initLbMode() {
  const seg = document.getElementById('lb-mode-seg'); if (!seg) return;
  seg.querySelectorAll('.seg-btn').forEach(b => b.addEventListener('click', () => {
    seg.querySelectorAll('.seg-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
    state.lbMode = b.dataset.mode; renderLeaderboard();
  }));
}
function renderLeaderboard() {
  const list = document.getElementById('leaderboard-list'); if (!list) return;
  const projected = state.lbMode === 'projected';
  const proj = projected ? computeProjected() : null;
  const val = name => projected ? proj[name] : getPoints(name);
  const col = document.getElementById('lb-col-right'); if (col) col.textContent = projected ? 'Proj' : 'Pts';

  const sorted = [...PARTICIPANTS].sort((a, b) => val(b.name) - val(a.name) || getGoals(b.name) - getGoals(a.name) || a.name.localeCompare(b.name));

  const spotlight = document.getElementById('leader-spotlight');
  if (spotlight) {
    const leader = sorted[0], lp = leader ? val(leader.name) : 0;
    const tied = sorted.filter(p => val(p.name) === lp).length;
    if (leader && lp > 0 && tied === 1) {
      spotlight.style.display = 'flex';
      spotlight.innerHTML = `<div class="ls-crown">👑</div>
        <img class="ls-flag" src="${flagUrl(leader.code, 160)}" onerror="this.style.display='none'">
        <div class="ls-info"><div class="ls-label">${projected ? 'Projected leader' : 'Current leader'}</div><div class="ls-name">${esc(leader.name)}</div><div class="ls-team">${esc(leader.team)}</div></div>
        <div class="ls-score"><span>${lp}</span><small>pts</small></div>`;
    } else { spotlight.style.display = 'none'; }
  }

  list.innerHTML = sorted.map((p, i) => {
    const rank = i + 1, cls = rank <= 3 ? 'rank-' + rank : '';
    const medal = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    const isMe = getMe() === p.name;
    const cur = getPoints(p.name), pv = val(p.name), delta = projected ? pv - cur : 0;
    return `<div class="lb-row ${cls}${isMe ? ' is-me' : ''}" data-name="${esc(p.name)}" role="button" tabindex="0" aria-label="${esc(p.name)} rank ${rank}">
      <div class="lb-pos">${medal ? medal + ' ' : ''}${rank}</div>
      <img class="lb-flag" src="${flagUrl(p.code)}" loading="lazy" onerror="this.style.display='none'">
      <div class="lb-info"><div class="lb-name">${esc(p.name)}${isMe ? ' <span class="me-tag">YOU</span>' : ''}</div><div class="lb-team">${esc(p.team)}</div></div>
      <div class="lb-pts">${pv}${delta > 0 ? `<span class="lb-delta">+${delta}</span>` : ''}</div>
    </div>`;
  }).join('');
  list.querySelectorAll('.lb-row').forEach(row => {
    const open = () => openProfile(row.dataset.name);
    row.addEventListener('click', open);
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

// ===== SURVIVAL (who's alive + ceiling) =====
function computeSurvival() {
  const koExists = Object.keys(matchByNum).length > 0;
  return PARTICIPANTS.map(p => {
    const team = p.team.toLowerCase();
    const mine = state.matches.filter(m => normalizeTeamName(m.homeTeam && m.homeTeam.name) === team || normalizeTeamName(m.awayTeam && m.awayTeam.name) === team);
    const playedGroup = mine.some(m => m.stage === 'GROUP_STAGE' && m.status === 'FINISHED');
    const koMine = mine.filter(m => STAGE_IDX[m.stage] !== undefined);
    const inKO = koMine.length > 0;
    let eliminated = false, elimStage = null, onPens = false, highestWon = -1;
    koMine.filter(m => m.status === 'FINISHED').forEach(m => {
      const num = numForMatch(m);
      const w = num ? winnerOfNum(num) : null;
      const iAmWinner = w && normalizeTeamName(w) === team;
      if (iAmWinner) highestWon = Math.max(highestWon, STAGE_IDX[m.stage]);
      else if (w) {
        const idx = STAGE_IDX[m.stage];
        if (!eliminated || idx < STAGE_IDX[elimStage]) { eliminated = true; elimStage = m.stage; onPens = Array.isArray(m.penalties) && m.penalties.length >= 2; }
      }
    });
    if (!eliminated && koExists && !inKO && playedGroup) { eliminated = true; elimStage = 'GROUP_STAGE'; }
    const cur = getPoints(p.name);
    let ceiling = cur;
    if (!eliminated) for (let i = highestWon + 1; i < KO_MAX.length; i++) ceiling += KO_MAX[i];
    const upcoming = mine.filter(m => m.status !== 'FINISHED' && m.utcDate).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    const next = (!eliminated && upcoming[0]) || null;
    return { p, status: eliminated ? 'out' : 'alive', cur, ceiling, next, elimStage, onPens };
  });
}
function numForMatch(m) {
  for (const k in matchByNum) {
    const x = matchByNum[k];
    if (x.stage === m.stage && x.utcDate === m.utcDate &&
      x.home === ((m.homeTeam && m.homeTeam.name) || 'TBD') && x.away === ((m.awayTeam && m.awayTeam.name) || 'TBD')) return +k;
  }
  return null;
}
function initRaceFilters() {
  document.querySelectorAll('.race-filter').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.race-filter').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    state.raceFilter = btn.dataset.filter; renderSurvival();
  }));
}
function renderSurvival() {
  const list = document.getElementById('race-list'); if (!list) return;
  if (!state.matches.length) { list.innerHTML = `<p class="race-empty">Standings load once the data is in.</p>`; return; }
  let rows = computeSurvival();
  const order = { alive: 0, out: 1 };
  rows.sort((a, b) => order[a.status] - order[b.status] || b.ceiling - a.ceiling || b.cur - a.cur || a.p.name.localeCompare(b.p.name));
  const maxCeil = Math.max(1, ...rows.map(r => r.ceiling));
  const filtered = rows.filter(r => state.raceFilter === 'all' ? true : r.status === state.raceFilter);
  if (!filtered.length) { list.innerHTML = `<p class="race-empty">Nobody in this group.</p>`; return; }
  list.innerHTML = filtered.map(r => {
    const chip = r.status === 'alive' ? `<span class="rc-chip in">✅ Alive</span>` : `<span class="rc-chip out">❌ Out</span>`;
    const detail = r.status === 'out' ? 'Out · ' + (STAGE_LABEL[r.elimStage] || 'group stage').toLowerCase() + (r.onPens ? ' (pens)' : '') : (r.next ? 'Still standing' : 'Awaiting next round');
    const nextTxt = r.next ? `${esc(shortTeam(resolveDisplayName(r.next, 'home')))} v ${esc(shortTeam(resolveDisplayName(r.next, 'away')))} · ${esc(formatDate(r.next.utcDate))}` : (r.status === 'out' ? '—' : 'TBD');
    const isMe = getMe() === r.p.name;
    const ceilPct = Math.round(r.ceiling / maxCeil * 100), nowPct = Math.round(r.cur / maxCeil * 100);
    return `<div class="rc-row rc-${r.status}${isMe ? ' is-me' : ''}" data-name="${esc(r.p.name)}" role="button" tabindex="0">
      <img class="rc-flag" src="${flagUrl(r.p.code)}" onerror="this.style.display='none'">
      <div class="rc-id"><div class="rc-name">${esc(r.p.name)}${isMe ? ' <span class="me-tag">YOU</span>' : ''}</div><div class="rc-team">${esc(shortTeam(r.p.team))}</div></div>
      <div class="rc-status">${chip}<div class="rc-detail">${esc(detail)}</div></div>
      <div class="rc-next"><small>Next</small>${esc(nextTxt)}</div>
      <div class="rc-pts"><b>${r.cur}</b><small>now</small></div>
      <div class="rc-ceil"><div class="rc-ceil-top">${r.ceiling}<small>max</small></div><div class="rc-bar"><div class="rc-bar-fill" style="width:${ceilPct}%"></div><div class="rc-bar-now" style="width:${nowPct}%"></div></div></div>
    </div>`;
  }).join('');
  list.querySelectorAll('.rc-row').forEach(row => {
    const open = () => openProfile(row.dataset.name);
    row.addEventListener('click', open);
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

// ===== GROUP TABLES =====
function renderGroups() {
  const wrap = document.getElementById('groups-wrap'); if (!wrap) return;
  const gm = state.matches.filter(m => m.stage === 'GROUP_STAGE' && m.group);
  const names = [...new Set(gm.map(m => m.group))].sort();
  wrap.innerHTML = names.map(g => {
    const ms = gm.filter(m => m.group === g), table = {};
    const ensure = n => (table[n] = table[n] || { team: n, P: 0, GF: 0, GA: 0, Pts: 0 });
    ms.forEach(m => {
      const hn = (m.homeTeam && m.homeTeam.name) || 'TBD', an = (m.awayTeam && m.awayTeam.name) || 'TBD';
      const h = ensure(hn), a = ensure(an);
      const hs = m.score && m.score.fullTime ? safeInt(m.score.fullTime.home) : null, as = m.score && m.score.fullTime ? safeInt(m.score.fullTime.away) : null;
      if (m.status === 'FINISHED' && hs != null && as != null) {
        h.P++; a.P++; h.GF += hs; h.GA += as; a.GF += as; a.GA += hs;
        if (hs > as) h.Pts += 3; else if (hs < as) a.Pts += 3; else { h.Pts++; a.Pts++; }
      }
    });
    const rows = Object.values(table).sort((x, y) => y.Pts - x.Pts || (y.GF - y.GA) - (x.GF - x.GA) || y.GF - x.GF || x.team.localeCompare(y.team));
    const body = rows.map((r, i) => {
      const p = findParticipant(r.team), gd = r.GF - r.GA;
      return `<tr class="grp-row${i < 2 ? ' qual' : ''}"><td class="grp-pos">${i + 1}</td>
        <td class="grp-team">${p ? `<img class="grp-flag" src="${flagUrl(p.code)}" onerror="this.style.display='none'">` : '<span class="grp-flag"></span>'}<span>${esc(shortTeam(r.team))}</span>${p ? `<span class="grp-owner">${esc(p.name)}</span>` : ''}</td>
        <td>${r.P}</td><td>${gd >= 0 ? '+' : ''}${gd}</td><td class="grp-pts">${r.Pts}</td></tr>`;
    }).join('');
    return `<div class="grp-card"><div class="grp-title">${esc(g)}</div>
      <table class="grp-table"><thead><tr><th></th><th>Team</th><th>P</th><th>GD</th><th>Pts</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }).join('');
}

// ===== AWARDS =====
const AWARDS = [
  { key: 'rustySpoon', emoji: '🥄', title: 'Rusty Spoon', rule: 'Fewest points & worst goal difference' },
  { key: 'swissCheese', emoji: '🧀', title: 'Swiss Cheese', rule: 'Most goals conceded in one game' },
  { key: 'penaltyPain', emoji: '😖', title: 'Penalty Pain', rule: 'First team out on penalties' },
  { key: 'blankSheet', emoji: '⬜', title: 'Blank Sheet', rule: 'Fewest goals scored' },
  { key: 'biggestDisappointment', emoji: '📉', title: 'Biggest Disappointment', rule: 'Top-ranked team out earliest' },
  { key: 'unluckiest', emoji: '🍀', title: 'Unluckiest', rule: 'Most points without progressing' },
];
function renderAwards() {
  const grid = document.getElementById('awards-grid'); if (!grid) return;
  const a = state.awards || {};
  grid.innerHTML = AWARDS.map(x => {
    const w = a[x.key];
    const body = w && w.holder
      ? `<div class="award-holder"><div class="award-name">${esc(w.holder)}</div><div class="award-team">${esc(w.team || '')}</div>${w.detail ? `<div class="award-detail">${esc(w.detail)}</div>` : ''}</div>`
      : `<div class="award-holder pending">Opens in the knockouts…</div>`;
    return `<div class="award-card"><div class="award-emoji">${x.emoji}</div><div class="award-title">${esc(x.title)}</div><div class="award-rule">${esc(x.rule)}</div>${body}</div>`;
  }).join('');
}

// ===== THE DRAW (cards) =====
function getSorted() {
  const arr = [...PARTICIPANTS];
  if (state.sort === 'name') arr.sort((a, b) => a.name.localeCompare(b.name));
  else if (state.sort === 'team') arr.sort((a, b) => a.team.localeCompare(b.team));
  else arr.sort((a, b) => getPoints(b.name) - getPoints(a.name) || getGoals(b.name) - getGoals(a.name) || a.name.localeCompare(b.name));
  return arr;
}
function renderCards() {
  const grid = document.getElementById('cards-grid'); if (!grid) return;
  const q = state.search.trim().toLowerCase();
  const arr = getSorted().filter(p => !q || p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
  const noRes = document.getElementById('no-results'); if (noRes) noRes.style.display = arr.length ? 'none' : 'block';
  grid.innerHTML = arr.map(p => {
    const isMe = getMe() === p.name;
    return `<div class="pcard${isMe ? ' is-me' : ''}" data-name="${esc(p.name)}" role="button" tabindex="0">
      <img class="pcard-flag" src="${flagUrl(p.code, 160)}" loading="lazy" onerror="this.style.display='none'">
      <div class="pcard-body"><div class="pcard-name">${esc(p.name)}${isMe ? ' <span class="me-tag">YOU</span>' : ''}</div><div class="pcard-team">${esc(p.team)}</div>
      <div class="pcard-stats"><span>${getPoints(p.name)} pts</span><span>${getGoals(p.name)} gls</span></div></div></div>`;
  }).join('');
  grid.querySelectorAll('.pcard').forEach(c => {
    const open = () => openProfile(c.dataset.name);
    c.addEventListener('click', open);
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}
function initSort() {
  document.querySelectorAll('.sort-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.sort-btn').forEach(x => x.classList.remove('active')); b.classList.add('active');
    state.sort = b.dataset.sort; renderCards();
  }));
}
function initSearch() { const i = document.getElementById('search-input'); if (i) i.addEventListener('input', e => { state.search = e.target.value; renderCards(); }); }

// ===== MATCHES LIST =====
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    b.classList.add('active'); const el = document.getElementById('tab-' + b.dataset.tab); if (el) el.classList.add('active');
  }));
}
function renderMatches() {
  const summary = document.getElementById('summary-text'); if (summary) summary.textContent = state.summaryText || 'Waiting for data…';
  const live = document.getElementById('live-matches'), up = document.getElementById('upcoming-matches');
  const finished = state.matches.filter(m => m.status === 'FINISHED').sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
  const upcoming = state.matches.filter(m => m.status !== 'FINISHED').sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  const le = document.getElementById('live-empty'), ue = document.getElementById('upcoming-empty');
  if (live) { live.innerHTML = finished.slice(0, 40).map(matchListCard).join(''); if (le) le.style.display = finished.length ? 'none' : 'block'; }
  if (up) { up.innerHTML = upcoming.slice(0, 30).map(matchListCard).join(''); if (ue) ue.style.display = upcoming.length ? 'none' : 'block'; }
}
function matchListCard(m) {
  const hn = resolveDisplayName(m, 'home'), an = resolveDisplayName(m, 'away');
  const hp = findParticipant(m.homeTeam && m.homeTeam.name), ap = findParticipant(m.awayTeam && m.awayTeam.name);
  const fin = m.status === 'FINISHED' && m.score && m.score.fullTime;
  const hs = fin ? safeInt(m.score.fullTime.home) : null, as = fin ? safeInt(m.score.fullTime.away) : null;
  const pens = Array.isArray(m.penalties) ? m.penalties : null;
  const stage = m.stage === 'GROUP_STAGE' ? esc(m.group || 'Group') : esc(STAGE_LABEL[m.stage] || '');
  const hw = fin && (hs > as || (pens && pens[0] > pens[1])), aw = fin && (as > hs || (pens && pens[1] > pens[0]));
  return `<div class="ml-card">
    <div class="ml-top">${stage} · ${esc(formatDate(m.utcDate))}${fin ? '' : ' · ' + esc(formatTime(m.utcDate))}</div>
    <div class="ml-team${hw ? ' win' : ''}">${hp ? `<img src="${flagUrl(hp.code)}" onerror="this.style.display='none'">` : '<span class="ml-blank"></span>'}<span class="ml-name">${esc(shortTeam(hn))}</span><span class="ml-sc">${hs != null ? hs : ''}</span></div>
    <div class="ml-team${aw ? ' win' : ''}">${ap ? `<img src="${flagUrl(ap.code)}" onerror="this.style.display='none'">` : '<span class="ml-blank"></span>'}<span class="ml-name">${esc(shortTeam(an))}</span><span class="ml-sc">${as != null ? as : ''}</span></div>
    ${pens ? `<div class="ml-pens">pens ${safeInt(pens[0])}–${safeInt(pens[1])}</div>` : ''}
    <div class="ml-owners">${hp ? esc(hp.name) : '—'} vs ${ap ? esc(ap.name) : '—'}</div>
  </div>`;
}

// ===== CHAMPION BANNER =====
let __champCelebrated = false;
function renderChampionBanner() {
  const el = document.getElementById('champion-banner'); if (!el) return;
  const champ = championName();
  if (!champ) { el.style.display = 'none'; return; }
  const cp = findParticipant(champ);
  el.style.display = 'block';
  el.innerHTML = `<div class="cb-in"><span class="cb-trophy">🏆</span> <b>${esc(cp ? cp.team : champ)}</b> are World Champions${cp ? ` — <b>${esc(cp.name)}</b> takes the £96 pot!` : '!'}</div>`;
  if (!__champCelebrated) { __champCelebrated = true; celebratePick(); }
}

// ===== MODAL: match detail / player profile / picker =====
let __lastFocus = null;
function openModal(html) {
  const root = document.getElementById('modal-root'), card = document.getElementById('modal-card');
  if (!root || !card) return;
  __lastFocus = document.activeElement;
  card.innerHTML = html; root.style.display = 'flex';
  requestAnimationFrame(() => { root.classList.add('open'); card.focus(); });
}
function closeModal() {
  const root = document.getElementById('modal-root'); if (!root) return;
  root.classList.remove('open'); setTimeout(() => { root.style.display = 'none'; }, 180);
  if (__lastFocus && __lastFocus.focus) __lastFocus.focus();
}
function initModalDismiss() {
  const bd = document.getElementById('modal-backdrop');
  if (bd) bd.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}
function openMatchModal(num) {
  const m = matchByNum[num]; if (!m) return;
  const [ta, tb] = slotTeams(num);
  const hp = ta ? findParticipant(ta) : null, ap = tb ? findParticipant(tb) : null;
  const fin = matchFinished(m), pens = m.penalties;
  const hn = ta || prettySlot(m.home).main, an = tb || prettySlot(m.away).main;
  const scoreLine = fin ? `${m.hs} – ${m.as}` : (state.predictions[num] ? 'your pick' : 'to play');
  const w = winnerOfNum(num);
  const teamBlock = (name, p, sc, isW) => `<div class="mm-team${isW ? ' win' : ''}">
      ${p ? `<img src="${flagUrl(p.code, 160)}" onerror="this.style.display='none'">` : '<div class="mm-flag-blank"></div>'}
      <div class="mm-tn">${esc(shortTeam(name))}</div>
      <div class="mm-owner">${p ? esc(p.name) + ' · ' + getPoints(p.name) + ' pts' : '—'}</div>
      ${sc != null ? `<div class="mm-sc">${sc}</div>` : ''}</div>`;
  openModal(`<button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    <div class="mm-stage">${esc(STAGE_LABEL[m.stage])} · ${esc(formatDate(m.utcDate))} ${fin ? '' : esc(formatTime(m.utcDate))}</div>
    <div class="mm-body">
      ${teamBlock(hn, hp, fin ? m.hs : null, fin && w && ta && normalizeTeamName(w) === normalizeTeamName(ta))}
      <div class="mm-vs">${fin ? scoreLine : 'vs'}${pens ? `<div class="mm-pens">pens ${safeInt(pens[0])}–${safeInt(pens[1])}</div>` : ''}</div>
      ${teamBlock(an, ap, fin ? m.as : null, fin && w && tb && normalizeTeamName(w) === normalizeTeamName(tb))}
    </div>
    ${state.predictMode && isPickable(num) ? `<div class="mm-pick"><button class="tool-btn" onclick="setPrediction(${num},'home');closeModal()">${esc(shortTeam(hn))} advance</button><button class="tool-btn" onclick="setPrediction(${num},'away');closeModal()">${esc(shortTeam(an))} advance</button></div>` : ''}`);
}
function openProfile(name) {
  const p = PARTICIPANTS.find(x => x.name === name); if (!p) return;
  const team = p.team.toLowerCase();
  const mine = state.matches.filter(mm => normalizeTeamName(mm.homeTeam && mm.homeTeam.name) === team || normalizeTeamName(mm.awayTeam && mm.awayTeam.name) === team)
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  const rows = mine.map(mm => {
    const home = normalizeTeamName(mm.homeTeam && mm.homeTeam.name) === team;
    const fin = mm.status === 'FINISHED' && mm.score && mm.score.fullTime;
    const mine_s = fin ? safeInt(home ? mm.score.fullTime.home : mm.score.fullTime.away) : null;
    const opp_s = fin ? safeInt(home ? mm.score.fullTime.away : mm.score.fullTime.home) : null;
    const res = fin ? (mine_s > opp_s ? 'W' : mine_s < opp_s ? 'L' : 'D') : '';
    const stage = mm.stage === 'GROUP_STAGE' ? (mm.group || '') : (STAGE_LABEL[mm.stage] || '');
    return `<div class="pf-row"><span class="pf-stage">${esc(stage)}</span><span class="pf-opp">v ${esc(shortTeam(resolveDisplayName(mm, home ? 'away' : 'home')))}</span>
      <span class="pf-res r-${res || 'x'}">${fin ? `${mine_s}–${opp_s} ${res}` : esc(formatDate(mm.utcDate))}</span></div>`;
  }).join('') || '<div class="pf-row">No fixtures yet.</div>';
  const rank = [...PARTICIPANTS].sort((a, b) => getPoints(b.name) - getPoints(a.name)).findIndex(x => x.name === name) + 1;
  openModal(`<button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    <div class="pf-head"><img src="${flagUrl(p.code, 160)}" onerror="this.style.display='none'"><div><div class="pf-name">${esc(p.name)}</div><div class="pf-team">${esc(p.team)}</div></div></div>
    <div class="pf-stats"><div><b>${getPoints(p.name)}</b><small>points</small></div><div><b>${getGoals(p.name)}</b><small>goals</small></div><div><b>#${rank}</b><small>rank</small></div></div>
    <div class="pf-log">${rows}</div>
    <div class="pf-actions"><button class="tool-btn" onclick="sharePlayerCard('${esc(name).replace(/'/g, "\\'")}')">📸 Share card</button>${getMe() === name ? '' : `<button class="tool-btn ghost" onclick="setMe('${esc(name).replace(/'/g, "\\'")}');closeModal()">⭐ This is me</button>`}</div>`);
}
function openPicker() {
  const rows = [...PARTICIPANTS].sort((a, b) => a.name.localeCompare(b.name)).map(p =>
    `<button class="pick-row" onclick="setMe('${esc(p.name).replace(/'/g, "\\'")}');closeModal()"><img src="${flagUrl(p.code)}" onerror="this.style.display='none'"><span>${esc(p.name)}</span><small>${esc(p.team)}</small></button>`).join('');
  openModal(`<button class="modal-close" onclick="closeModal()" aria-label="Close">✕</button>
    <div class="pick-title">Which player are you?</div><div class="pick-list">${rows}</div>`);
}

// ===== PERSONALISATION =====
function getMe() { try { return localStorage.getItem('sweepstake_me') || window.__me || null; } catch { return window.__me || null; } }
function setMe(name) {
  try { localStorage.setItem('sweepstake_me', name); } catch {}
  window.__me = name;
  renderAll();
  showToast('⭐ ' + name + ' — you\'re marked across the board');
  if (typeof confetti === 'function') confetti({ particleCount: 60, spread: 60, origin: { y: 0.3 } });
}
function initMe() { const b = document.getElementById('me-btn'); if (b) b.addEventListener('click', () => { const me = getMe(); if (me) openProfile(me); else openPicker(); }); }
function updateMeButton() { const b = document.getElementById('me-btn'); if (!b) return; const me = getMe(); b.textContent = me ? '⭐ ' + me : '⭐ This is me'; }
function renderYouBar() {
  const bar = document.getElementById('you-bar'); if (!bar) return;
  const me = getMe(); if (!me) { bar.style.display = 'none'; return; }
  const p = PARTICIPANTS.find(x => x.name === me); if (!p) { bar.style.display = 'none'; return; }
  const rank = [...PARTICIPANTS].sort((a, b) => getPoints(b.name) - getPoints(a.name) || getGoals(b.name) - getGoals(a.name)).findIndex(x => x.name === me) + 1;
  const surv = computeSurvival().find(r => r.p.name === me);
  const nextTxt = surv && surv.next ? `${shortTeam(resolveDisplayName(surv.next, 'home'))} v ${shortTeam(resolveDisplayName(surv.next, 'away'))}` : (surv && surv.status === 'out' ? 'eliminated' : '—');
  bar.style.display = 'flex';
  bar.innerHTML = `<img src="${flagUrl(p.code)}" onerror="this.style.display='none'">
    <div class="yb-main"><b>${esc(p.name)}</b> · ${esc(p.team)} <span class="yb-sub">#${rank} · ${getPoints(me)} pts · next: ${esc(nextTxt)}</span></div>
    <button class="yb-btn" onclick="openProfile('${esc(me).replace(/'/g, "\\'")}')">View</button>`;
}

// ===== SHARE =====
function initShare() {
  const b = document.getElementById('share-btn');
  if (b) b.addEventListener('click', async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'World Cup 2026 Sweepstake', text: 'The knockout bracket + predictor 🏆', url });
      else { await navigator.clipboard.writeText(url); showToast('🔗 Link copied — share it in the group!'); }
    } catch { try { await navigator.clipboard.writeText(url); showToast('🔗 Link copied'); } catch {} }
  });
  const st = document.getElementById('share-table');
  if (st) st.addEventListener('click', () => shareLeaderboardCard());
}
function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
async function sharePlayerCard(name) {
  const p = PARTICIPANTS.find(x => x.name === name); if (!p) return;
  showToast('🎨 Building your card…');
  const W = 540, H = 760, s = 2, canvas = document.createElement('canvas');
  canvas.width = W * s; canvas.height = H * s; const ctx = canvas.getContext('2d'); ctx.scale(s, s); ctx.textAlign = 'center';
  const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0b1020'); bg.addColorStop(1, '#161022'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const foil = ctx.createLinearGradient(0, 0, W, H); foil.addColorStop(0, '#f5c518'); foil.addColorStop(.5, '#37e6c0'); foil.addColorStop(1, '#ff2d78');
  ctx.strokeStyle = foil; ctx.lineWidth = 10; roundRect(ctx, 16, 16, W - 32, H - 32, 28); ctx.stroke();
  ctx.fillStyle = '#f5c518'; ctx.font = '700 18px Outfit, sans-serif'; ctx.fillText('WORLD CUP 2026 · KNOCKOUTS', W / 2, 64);
  try { const img = await loadImg(flagUrl(p.code, 320)); const fw = 240, fh = 160, fx = (W - fw) / 2, fy = 108; ctx.save(); roundRect(ctx, fx, fy, fw, fh, 12); ctx.clip(); ctx.drawImage(img, fx, fy, fw, fh); ctx.restore(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; roundRect(ctx, fx, fy, fw, fh, 12); ctx.stroke(); } catch {}
  ctx.fillStyle = '#fff'; ctx.font = '800 40px Outfit, sans-serif'; ctx.fillText(name, W / 2, 336);
  ctx.fillStyle = '#37e6c0'; ctx.font = '500 22px Inter, sans-serif'; ctx.fillText(p.team, W / 2, 368);
  const pts = getPoints(name), gls = getGoals(name);
  ctx.fillStyle = '#f5c518'; ctx.font = '800 66px Outfit, sans-serif'; ctx.fillText(String(pts), W / 2 - 92, 486); ctx.fillStyle = '#b6ff3b'; ctx.fillText(String(gls), W / 2 + 92, 486);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '600 15px Inter, sans-serif'; ctx.fillText('POINTS', W / 2 - 92, 510); ctx.fillText('GOALS', W / 2 + 92, 510);
  const surv = computeSurvival().find(r => r.p.name === name);
  ctx.fillStyle = surv && surv.status === 'alive' ? '#4ade80' : '#ef4767'; ctx.font = '700 20px Outfit, sans-serif';
  ctx.fillText(surv ? (surv.status === 'alive' ? '✅ STILL STANDING' : '❌ ELIMINATED') : '', W / 2, 566);
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '400 13px Inter, sans-serif'; ctx.fillText('jamesonbates07-sketch.github.io/world-cup-sweepstake', W / 2, H - 40);
  await downloadCanvas(canvas, `${name.replace(/\s+/g, '-')}-sweepstake.png`, `${name} (${p.team}) — ${pts} pts`);
}
async function shareLeaderboardCard() {
  showToast('🎨 Building the table…');
  const top = [...PARTICIPANTS].sort((a, b) => getPoints(b.name) - getPoints(a.name) || getGoals(b.name) - getGoals(a.name)).slice(0, 10);
  const W = 620, rowH = 56, H = 200 + top.length * rowH, s = 2, canvas = document.createElement('canvas');
  canvas.width = W * s; canvas.height = H * s; const ctx = canvas.getContext('2d'); ctx.scale(s, s);
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1020'); bg.addColorStop(1, '#161022'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = '#f5c518'; ctx.font = '800 30px Outfit, sans-serif'; ctx.fillText('SWEEPSTAKE LEADERBOARD', W / 2, 56);
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '500 16px Inter, sans-serif'; ctx.fillText('World Cup 2026 · The Knockouts', W / 2, 82);
  for (let i = 0; i < top.length; i++) {
    const p = top[i], y = 128 + i * rowH;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; roundRect(ctx, 30, y, W - 60, rowH - 8, 10); ctx.fill();
    ctx.textAlign = 'left'; ctx.fillStyle = i === 0 ? '#f5c518' : '#fff'; ctx.font = '800 22px Outfit, sans-serif'; ctx.fillText((i + 1) + '', 48, y + 32);
    try { const img = await loadImg(flagUrl(p.code, 80)); ctx.save(); roundRect(ctx, 84, y + 10, 34, 24, 4); ctx.clip(); ctx.drawImage(img, 84, y + 10, 34, 24); ctx.restore(); } catch {}
    ctx.fillStyle = '#fff'; ctx.font = '700 20px Outfit, sans-serif'; ctx.fillText(p.name, 132, y + 26);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '400 14px Inter, sans-serif'; ctx.fillText(p.team, 132, y + 44);
    ctx.textAlign = 'right'; ctx.fillStyle = '#37e6c0'; ctx.font = '800 24px Outfit, sans-serif'; ctx.fillText(getPoints(p.name) + '', W - 48, y + 34);
  }
  await downloadCanvas(canvas, 'sweepstake-leaderboard.png', 'World Cup 2026 Sweepstake leaderboard 🏆');
}
async function downloadCanvas(canvas, filename, text) {
  let blob; try { blob = await new Promise(r => canvas.toBlob(r, 'image/png')); } catch { blob = null; }
  if (!blob) { try { await navigator.clipboard.writeText(location.href); showToast('🔗 Link copied instead'); } catch {} return; }
  const file = new File([blob], filename, { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'World Cup 2026 Sweepstake', text }); return; } } catch {}
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  showToast('📸 Saved — drop it in the group!');
}

// ===== NAV / ACCORDION / SCROLL / TOP =====
function initNav() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 40); const tt = document.getElementById('to-top'); if (tt) tt.classList.toggle('show', window.scrollY > 600); });
  const toggle = document.getElementById('nav-toggle'), links = document.getElementById('nav-links');
  if (toggle && links) { toggle.addEventListener('click', () => links.classList.toggle('open')); links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open'))); }
}
function initAccordion() {
  document.querySelectorAll('.acc-item').forEach(d => {
    const x = d.querySelector('.acc-x'); if (!x) return;
    d.addEventListener('toggle', () => { x.textContent = d.open ? '－' : '＋'; if (d.open && d.id === 'acc-groups') renderGroups(); });
  });
}
function initToTop() { const b = document.getElementById('to-top'); if (b) b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' })); }
function initScrollReveal() {
  const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }), { threshold: 0.06 });
  document.querySelectorAll('.section, .strip-section').forEach(el => { el.classList.add('reveal'); obs.observe(el); });
}

// expose for inline handlers
window.closeModal = closeModal; window.setPrediction = setPrediction; window.setMe = setMe;
window.openProfile = openProfile; window.sharePlayerCard = sharePlayerCard;
