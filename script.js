// ===== DATA =====
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
  { name: 'Patrick Lindon', team: 'Tunisia', code: 'tn' },
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

const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z');

let state = { points: {}, goals: {}, matchResults: [], sort: 'name', search: '' };

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initCountdown();
  initSpotlight();
  initSearch();
  initSort();
  initTabs();
  initScrollReveal();
  initNavbar();
  initShare();
  initRaceFilters();
  initMe();
  initModal();
  initToTop();
  fetchResults();
  startAutoRefresh();
});

// ===== SHARE =====
function initShare() {
  const btn = document.getElementById('share-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const url = window.location.href;
    // On mobile, open the native share sheet (WhatsApp etc.); otherwise copy the link.
    if (navigator.share) {
      try {
        await navigator.share({ title: 'World Cup 2026 Sweepstake', text: 'Join the sweepstake leaderboard 🏆', url });
        return;
      } catch (e) { /* user cancelled — fall through to copy */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('🔗 Link copied — paste it to the group!');
    } catch (e) {
      showToast(url);
    }
  });
}

// ===== CHAMPION BANNER =====
function renderChampion(champion) {
  const el = document.getElementById('champion-banner');
  if (!el) return;
  if (!champion || !champion.holder) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = 'block';
  el.innerHTML = `
    <div class="champ-inner">
      <div class="champ-crown">👑</div>
      <div class="champ-label">World Cup 2026 Champion</div>
      <div class="champ-name">${esc(champion.holder)}</div>
      <div class="champ-team">${esc(champion.team)} — take a bow 🏆</div>
    </div>`;
  if (typeof confetti === 'function' && !el.dataset.celebrated) {
    el.dataset.celebrated = '1';
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.35 } });
  }
}

function flagUrl(code, w = 80) { return `https://flagcdn.com/w${w}/${code}.png`; }

// Security: escape any externally-sourced string before putting it in innerHTML.
// The match feed comes from a third party, so team names etc. are untrusted.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Coerce a value to a safe integer for display (defends against bad score data).
function safeInt(v) { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; }

function getPoints(name) { return state.points[name] || 0; }
function getGoals(name) { return state.goals[name] || 0; }

// ===== PARTICLES =====
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 0.5, a: Math.random() * 0.4 + 0.1,
    });
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 45, 120, ${p.a})`; ctx.fill();
    });
    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255, 45, 120, ${0.06 * (1 - dist / 120)})`;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ===== COUNTDOWN =====
function initCountdown() {
  const container = document.getElementById('countdown-container');
  if (!container) return;
  const box = (v, l) => `<div class="countdown-item"><div class="countdown-value">${v}</div><div class="countdown-label">${l}</div></div>`;
  const nextMatch = () => {
    const now = Date.now();
    return (state.matchResults || [])
      .filter(m => m && m.status !== 'FINISHED' && m.status !== 'IN_PLAY' && m.status !== 'PAUSED' && m.status !== 'HALFTIME' && m.utcDate && new Date(m.utcDate).getTime() > now)
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))[0] || null;
  };
  const liveMatch = () => (state.matchResults || []).find(m => m && (m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'HALFTIME')) || null;
  function update() {
    const now = new Date();
    // 1) Before the opening match → count down to kickoff.
    if (TOURNAMENT_START - now > 0) {
      const diff = TOURNAMENT_START - now;
      const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      container.innerHTML = `<div class="countdown">${box(d, 'Days')}${box(h, 'Hours')}${box(m, 'Mins')}${box(s, 'Secs')}</div>`;
      return;
    }
    // 2) A match is in play → show it live.
    const live = liveMatch();
    if (live) {
      const hs = safeInt(live.score && live.score.fullTime && live.score.fullTime.home);
      const as = safeInt(live.score && live.score.fullTime && live.score.fullTime.away);
      container.innerHTML = `<div class="next-match"><div class="nm-label nm-live">🔴 Live now</div><div class="nm-teams">${esc(shortTeam(live.homeTeam && live.homeTeam.name))} <span>${hs ?? ''}–${as ?? ''}</span> ${esc(shortTeam(live.awayTeam && live.awayTeam.name))}</div></div>`;
      return;
    }
    // 3) Otherwise → count down to the next scheduled kickoff.
    const nm = nextMatch();
    if (!nm) { container.innerHTML = '<div class="tournament-live-badge">🔴 TOURNAMENT IS LIVE!</div>'; return; }
    const diff = new Date(nm.utcDate) - now;
    const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
    const parts = d > 0 ? `${box(d, 'Days')}${box(h, 'Hrs')}${box(m, 'Min')}` : `${box(h, 'Hrs')}${box(m, 'Min')}${box(s, 'Sec')}`;
    container.innerHTML = `<div class="nm-label">⏱ Next kickoff</div><div class="nm-teams">${esc(shortTeam(nm.homeTeam && nm.homeTeam.name))} <span>v</span> ${esc(shortTeam(nm.awayTeam && nm.awayTeam.name))}</div><div class="countdown">${parts}</div>`;
  }
  update();
  setInterval(update, 1000);
}

// ===== CARDS =====
function getSortedParticipants() {
  let list = [...PARTICIPANTS];
  const q = state.search.toLowerCase();
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
  if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (state.sort === 'team') list.sort((a, b) => a.team.localeCompare(b.team));
  else if (state.sort === 'points') list.sort((a, b) => getPoints(b.name) - getPoints(a.name) || a.name.localeCompare(b.name));
  return list;
}

function renderCards() {
  const grid = document.getElementById('cards-grid');
  const sorted = getSortedParticipants();
  const ranked = [...PARTICIPANTS].sort((a, b) => getPoints(b.name) - getPoints(a.name));
  const awaiting = computeAwaitingPlayoff(state.matchResults);
  document.getElementById('no-results').style.display = sorted.length ? 'none' : 'block';
  grid.innerHTML = sorted.map((p, i) => {
    const rank = ranked.findIndex(r => r.name === p.name) + 1;
    const pts = getPoints(p.name);
    const goals = getGoals(p.name);
    const rankClass = rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : '';
    const wait = awaiting.has(p.name);
    const isMe = getMe() === p.name;
    return `
      <div class="participant-card sticker${wait ? ' is-awaiting' : ''}${isMe ? ' is-me' : ''}" style="animation-delay:${i * 0.03}s" data-name="${esc(p.name)}" role="button" tabindex="0" aria-label="${esc(p.name)}, ${esc(p.team)}, ${pts} points. Open profile.">
        <div class="card-foil"></div>
        <div class="card-glow"></div>
        <div class="card-sticker-no">#${STICKER_NO[p.name] || '00'}</div>
        ${isMe ? '<div class="card-you">YOU</div>' : ''}
        <div class="card-rank ${rankClass}">#${rank}</div>
        <img class="card-flag" src="${flagUrl(p.code, 160)}" alt="${esc(p.team)} flag" loading="lazy" onerror="this.style.display='none'">
        <div class="card-person">${esc(p.name)}</div>
        <div class="card-team">${esc(p.team)}</div>
        ${wait ? '<div class="card-await">🎟️ Awaiting playoff</div>' : ''}
        <div class="card-points">
          <div><span class="points-value">${pts}</span> <span class="points-label">pts</span></div>
          <div><span class="points-value" style="color:var(--accent)">${goals}</span> <span class="points-label">goals</span></div>
        </div>
        <button class="card-share" data-name="${esc(p.name)}" title="Share ${esc(p.name)}'s card" aria-label="Share card">📸</button>
      </div>`;
  }).join('');
  // Click a card to open the player's profile; the share button exports a PNG.
  grid.querySelectorAll('.participant-card').forEach(card => {
    const open = () => openProfile(card.dataset.name);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
  grid.querySelectorAll('.card-share').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); sharePlayerCard(btn.dataset.name); });
  });
}

// ===== LEADERBOARD =====
function renderLeaderboard() {
  const list = document.getElementById('leaderboard-list');
  const sorted = [...PARTICIPANTS].sort((a, b) => getPoints(b.name) - getPoints(a.name) || getGoals(b.name) - getGoals(a.name) || a.name.localeCompare(b.name));

  // Cool: spotlight the current leader, but only once someone is actually ahead.
  const spotlight = document.getElementById('leader-spotlight');
  if (spotlight) {
    const leader = sorted[0];
    const leaderPts = leader ? getPoints(leader.name) : 0;
    const tiedAtTop = sorted.filter(p => getPoints(p.name) === leaderPts).length;
    if (leader && leaderPts > 0 && tiedAtTop === 1) {
      spotlight.style.display = 'flex';
      spotlight.innerHTML = `
        <div class="ls-crown">👑</div>
        <img class="ls-flag" src="${flagUrl(leader.code, 160)}" alt="${esc(leader.team)} flag" onerror="this.style.display='none'">
        <div class="ls-info">
          <div class="ls-label">Current Leader</div>
          <div class="ls-name">${esc(leader.name)}</div>
          <div class="ls-team">${esc(leader.team)}</div>
        </div>
        <div class="ls-score"><span>${safeInt(leaderPts) ?? 0}</span><small>pts</small></div>`;
    } else {
      spotlight.style.display = 'none';
      spotlight.innerHTML = '';
    }
  }

  list.innerHTML = sorted.map((p, i) => {
    const rank = i + 1;
    const cls = rank <= 3 ? `rank-${rank}` : '';
    const medal = rank === 1 ? '👑 ' : rank === 2 ? '🥈 ' : rank === 3 ? '🥉 ' : '';
    const isMe = getMe() === p.name;
    return `
      <div class="lb-row ${cls}${isMe ? ' is-me' : ''}" data-name="${esc(p.name)}" role="button" tabindex="0" aria-label="${esc(p.name)}, rank ${rank}. Open profile.">
        <div class="lb-position">${medal}${rank}</div>
        <img class="lb-flag" src="${flagUrl(p.code)}" alt="${esc(p.team)}" loading="lazy" onerror="this.style.display='none'">
        <div class="lb-info"><div class="lb-name">${esc(p.name)}${isMe ? ' <span class="me-tag">YOU</span>' : ''}</div><div class="lb-team">${esc(p.team)}</div></div>
        <div class="lb-points">${getPoints(p.name)}</div>
      </div>`;
  }).join('');
  list.querySelectorAll('.lb-row').forEach(row => {
    const open = () => openProfile(row.dataset.name);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

// ===== SPOTLIGHT =====
function initSpotlight() {
  const btn = document.getElementById('spotlight-btn');
  const result = document.getElementById('spotlight-result');
  let spinning = false;
  btn.addEventListener('click', () => {
    if (spinning) return;
    spinning = true;
    btn.textContent = '🎰 Spinning...';
    let count = 0;
    const totalFlips = 15 + Math.floor(Math.random() * 10);
    const interval = setInterval(() => {
      const p = PARTICIPANTS[Math.floor(Math.random() * PARTICIPANTS.length)];
      result.innerHTML = `
        <img src="${flagUrl(p.code, 160)}" alt="${p.team}" style="border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
        <div><div class="name">${p.name}</div><div class="team">${p.team}</div></div>`;
      count++;
      if (count >= totalFlips) {
        clearInterval(interval);
        spinning = false;
        btn.textContent = '🎲 Spin Again!';
        if (typeof confetti === 'function') confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
    }, 80 + count * 15);
  });
}

// ===== SEARCH =====
function initSearch() {
  const input = document.getElementById('search-input');
  input.addEventListener('input', (e) => { state.search = e.target.value; renderCards(); });
}

// ===== SORT =====
function initSort() {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.sort = btn.dataset.sort;
      renderCards();
    });
  });
}

// ===== TABS =====
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ===== NAVBAR =====
function initNavbar() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => { navbar.classList.toggle('scrolled', window.scrollY > 50); });
  // Mobile toggle
  const toggle = document.getElementById('nav-toggle');
  const links = document.querySelector('.nav-links');
  toggle.addEventListener('click', () => {
    links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
    links.style.position = 'absolute'; links.style.top = '64px'; links.style.right = '1rem';
    links.style.flexDirection = 'column'; links.style.background = 'var(--bg-secondary)';
    links.style.padding = '1rem'; links.style.borderRadius = '12px'; links.style.border = '1px solid var(--border)';
  });
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== DATA FETCHING =====
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
  "Türkiye": "Turkey"
};

function normalizeTeamName(name) {
  if (!name) return '';
  const mapped = TEAM_NAME_MAPPINGS[name] || name;
  return mapped.toLowerCase();
}

function findParticipant(teamName) {
  if (!teamName) return null;
  const lower = normalizeTeamName(teamName);
  return PARTICIPANTS.find(p => p.team.toLowerCase() === lower);
}

async function fetchResults() {
  try {
    const res = await fetch('results.json?t=' + new Date().getTime());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Validate shape before trusting it — never let bad data break the page.
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    state.points = isObj(data.points) ? data.points : {};
    state.goals = isObj(data.goals) ? data.goals : {};
    
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl && data.lastUpdated) {
      lastUpdatedEl.textContent = `Last updated: ${new Date(data.lastUpdated).toLocaleString()}`;
    }
    
    const summaryTextEl = document.getElementById('summary-text');
    if (summaryTextEl && data.summaryText) {
      summaryTextEl.textContent = data.summaryText;
    }

    state.matchResults = Array.isArray(data.matches) ? data.matches : [];

    renderCards();
    renderLeaderboard();
    renderAwards(data.awards);
    renderStats(data.stats);
    renderChampion(data.stats && data.stats.champion);
    renderTournament(state.matchResults);
    renderMatches(state.matchResults);
    renderToday(state.matchResults);
    renderRace(state.matchResults);
    renderYouBar();
    updateMeButton();
    loadHistory().then(renderMomentum).catch(() => {});

    if (data.lastUpdated && window.__lastSeenUpdate && data.lastUpdated !== window.__lastSeenUpdate) {
      showToast('🔄 Scores updated');
    }
    window.__lastSeenUpdate = data.lastUpdated || window.__lastSeenUpdate;
  } catch (e) {
    console.warn('Could not load results.json:', e);
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl) lastUpdatedEl.textContent = 'Data will appear here once the tournament begins.';
    const summaryTextEl = document.getElementById('summary-text');
    if (summaryTextEl) summaryTextEl.textContent = 'Waiting for results...';

    state.matchResults = [];
    renderCards();
    renderLeaderboard();
    renderAwards({});
    renderStats(null);
    renderChampion(null);
    renderTournament([]);
    renderMatches([]);
    renderToday([]);
    renderRace([]);
    renderYouBar();
    updateMeButton();
  }
}

// ===== TOURNAMENT (group tables + knockout bracket) =====
function renderTournament(matches) {
  if (!Array.isArray(matches)) matches = [];
  const groupsWrap = document.getElementById('groups-wrap');
  const bracketWrap = document.getElementById('bracket-wrap');
  const emptyEl = document.getElementById('tournament-empty');
  if (!groupsWrap || !bracketWrap) return;

  // ---- GROUP STAGE TABLES ----
  const groupMatches = matches.filter(m => m && m.stage === 'GROUP_STAGE' && m.group);
  const groupNames = [...new Set(groupMatches.map(m => m.group))].sort();
  const groupsHtml = groupNames.map(g => {
    const gm = groupMatches.filter(m => m.group === g);
    const table = {};
    const ensure = (name) => { if (!table[name]) table[name] = { team: name, P: 0, GF: 0, GA: 0, Pts: 0 }; return table[name]; };
    gm.forEach(m => {
      const hn = (m.homeTeam && m.homeTeam.name) || 'TBD', an = (m.awayTeam && m.awayTeam.name) || 'TBD';
      const h = ensure(hn), a = ensure(an);
      const hs = m.score && m.score.fullTime ? m.score.fullTime.home : null;
      const as = m.score && m.score.fullTime ? m.score.fullTime.away : null;
      if (m.status === 'FINISHED' && hs != null && as != null) {
        h.P++; a.P++; h.GF += hs; h.GA += as; a.GF += as; a.GA += hs;
        if (hs > as) { h.Pts += 3; } else if (hs < as) { a.Pts += 3; } else { h.Pts++; a.Pts++; }
      }
    });
    const rows = Object.values(table).sort((x, y) =>
      y.Pts - x.Pts || (y.GF - y.GA) - (x.GF - x.GA) || y.GF - x.GF || x.team.localeCompare(y.team));
    const rowsHtml = rows.map((r, i) => {
      const p = findParticipant(r.team);
      const gd = r.GF - r.GA;
      return `<tr class="grp-row${i < 2 ? ' qual' : ''}">
        <td class="grp-pos">${i + 1}</td>
        <td class="grp-team">
          ${p ? `<img class="grp-flag" src="${flagUrl(p.code)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<span class="grp-flag"></span>'}
          <span class="grp-tname">${esc(r.team)}</span>
          ${p ? `<span class="grp-owner">${esc(p.name)}</span>` : ''}
        </td>
        <td>${r.P}</td><td class="grp-gd">${gd >= 0 ? '+' : ''}${gd}</td><td class="grp-pts">${r.Pts}</td>
      </tr>`;
    }).join('');
    return `<div class="grp-card">
      <div class="grp-title">${esc(g)}</div>
      <table class="grp-table">
        <thead><tr><th></th><th>Team</th><th>P</th><th>GD</th><th>Pts</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
  }).join('');

  // ---- KNOCKOUT BRACKET ----
  const ko = matches.filter(m => m && m.stage && m.stage !== 'GROUP_STAGE' && m.stage !== 'THIRD_PLACE');
  const order = [['ROUND_OF_32', 'Round of 32'], ['LAST_16', 'Last 16'], ['QUARTER_FINALS', 'Quarter-finals'], ['SEMI_FINALS', 'Semi-finals'], ['FINAL', 'Final']];
  let bracketHtml = '';
  const presentRounds = order.filter(([code]) => ko.some(m => m.stage === code));
  if (presentRounds.length) {
    const cols = presentRounds.map(([code, label]) => {
      const ms = ko.filter(m => m.stage === code).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
      const boxes = ms.map(m => {
        const hn = (m.homeTeam && m.homeTeam.name) || 'TBD', an = (m.awayTeam && m.awayTeam.name) || 'TBD';
        const hp = findParticipant(hn), ap = findParticipant(an);
        const hs = m.score && m.score.fullTime ? m.score.fullTime.home : null;
        const as = m.score && m.score.fullTime ? m.score.fullTime.away : null;
        const fin = m.status === 'FINISHED' && hs != null && as != null;
        const pens = Array.isArray(m.penalties) ? m.penalties : null;
        const homeWin = fin && (hs > as || (pens && pens[0] > pens[1]));
        const awayWin = fin && (as > hs || (pens && pens[1] > pens[0]));
        const slot = (name, p, score, win) => `<div class="bk-slot${win ? ' bk-win' : ''}">
          ${p ? `<img class="bk-flag" src="${flagUrl(p.code)}" alt="" onerror="this.style.display='none'">` : '<span class="bk-flag"></span>'}
          <span class="bk-team">${esc(name)}</span>
          ${p ? `<span class="bk-owner">${esc(p.name)}</span>` : ''}
          <span class="bk-score">${score != null ? score : ''}</span>
        </div>`;
        return `<div class="bk-match">
          ${slot(hn, hp, fin ? hs : null, homeWin)}
          ${slot(an, ap, fin ? as : null, awayWin)}
          ${pens ? `<div class="bk-pens">pens ${safeInt(pens[0])}–${safeInt(pens[1])}</div>` : ''}
        </div>`;
      }).join('');
      return `<div class="bk-col"><div class="bk-round">${esc(label)}</div>${boxes}</div>`;
    }).join('');
    bracketHtml = `<h3 class="bracket-heading">🏆 Knockout Bracket</h3><div class="bracket-scroll"><div class="bracket">${cols}</div></div>`;
  }

  groupsWrap.innerHTML = groupsHtml;
  bracketWrap.innerHTML = bracketHtml;
  if (emptyEl) emptyEl.style.display = (groupsHtml || bracketHtml) ? 'none' : 'block';
}

// ===== TOURNAMENT PULSE (live headline stats) =====
function renderStats(stats) {
  const bar = document.getElementById('pulse-bar');
  if (!bar) return;
  if (!stats || !stats.matchesPlayed) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
  const items = [];
  items.push({ icon: '⚽', value: safeInt(stats.matchesPlayed) ?? 0, label: 'Matches Played' });
  items.push({ icon: '🥅', value: safeInt(stats.totalGoals) ?? 0, label: 'Goals Scored' });
  if (stats.biggestWin && stats.biggestWin.winner) {
    items.push({ icon: '💥', value: esc(stats.biggestWin.score || ''), label: `Biggest Win · ${esc(stats.biggestWin.winner)}` });
  }
  if (stats.goldenBoot && stats.goldenBoot.holder) {
    items.push({ icon: '👟', value: esc(stats.goldenBoot.holder), label: `Golden Boot · ${esc(stats.goldenBoot.team)} (${safeInt(stats.goldenBoot.goals) ?? 0})` });
  }
  bar.style.display = 'flex';
  bar.innerHTML = items.map(i => `
    <div class="pulse-item">
      <div class="pulse-icon">${i.icon}</div>
      <div class="pulse-value">${i.value}</div>
      <div class="pulse-label">${i.label}</div>
    </div>`).join('');
}

// ===== AWARDS (booby prizes) =====
const AWARDS = [
  { key: 'rustySpoon',            emoji: '🥄', title: 'Rusty Spoon',          rule: 'Fewest points & worst goal difference' },
  { key: 'swissCheese',           emoji: '🧀', title: 'Swiss Cheese Trophy',  rule: 'Most goals conceded in a single game' },
  { key: 'penaltyPain',           emoji: '😖', title: 'Penalty Pain Trophy',  rule: 'First team eliminated on penalties' },
  { key: 'blankSheet',            emoji: '⬜', title: 'Blank Sheet Award',    rule: 'Fewest goals scored' },
  { key: 'biggestDisappointment', emoji: '📉', title: 'Biggest Disappointment', rule: 'Highest-ranked team knocked out earliest' },
  { key: 'unluckiest',            emoji: '🍀', title: 'Unluckiest Team',      rule: 'Most points without progressing' },
];

function renderAwards(awards) {
  const grid = document.getElementById('awards-grid');
  if (!grid) return;
  awards = (awards && typeof awards === 'object') ? awards : {};
  grid.innerHTML = AWARDS.map(a => {
    const w = awards[a.key];
    const body = (w && w.holder)
      ? `<div class="award-holder">
           <div class="award-name">${esc(w.holder)}</div>
           <div class="award-team">${esc(w.team || '')}</div>
           <div class="award-detail">${esc(w.detail || '')}</div>
         </div>`
      : `<div class="award-pending">Yet to be decided</div>`;
    return `
      <div class="award-card${(w && w.holder) ? '' : ' award-open'}">
        <div class="award-emoji">${a.emoji}</div>
        <div class="award-title">${esc(a.title)}</div>
        <div class="award-rule">${esc(a.rule)}</div>
        ${body}
      </div>`;
  }).join('');
}

function renderMatches(matches) {
  if (!Array.isArray(matches)) matches = [];
  const liveContainer = document.getElementById('live-matches');
  const upcomingContainer = document.getElementById('upcoming-matches');
  const liveEmpty = document.getElementById('live-empty');
  const upcomingEmpty = document.getElementById('upcoming-empty');
  if (!liveContainer || !upcomingContainer) return;
  const live = matches.filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'HALFTIME');
  // Recent: show the last 20 finished matches. Upcoming: show ALL remaining fixtures.
  const recent = matches.filter(m => m.status === 'FINISHED').sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate)).slice(0, 20);
  const upcoming = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED').sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  const liveAndRecent = [...live, ...recent];
  liveEmpty.style.display = liveAndRecent.length ? 'none' : 'block';
  upcomingEmpty.style.display = upcoming.length ? 'none' : 'block';
  liveContainer.innerHTML = liveAndRecent.map(m => renderMatchCard(m)).join('');
  upcomingContainer.innerHTML = upcoming.map(m => renderMatchCard(m)).join('');
}

function renderMatchCard(m) {
  if (!m || typeof m !== 'object') return '';
  const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'HALFTIME';
  const isFinished = m.status === 'FINISHED';
  const statusText = isLive ? '🔴 LIVE' : isFinished ? 'FT' : esc(formatDate(m.utcDate));
  const statusClass = isLive ? 'live' : isFinished ? 'finished' : 'scheduled';
  const homeName = m.homeTeam?.name || 'TBD';
  const awayName = m.awayTeam?.name || 'TBD';
  const homeP = findParticipant(m.homeTeam?.name);
  const awayP = findParticipant(m.awayTeam?.name);
  const hs = safeInt(m.score?.fullTime?.home ?? (isLive ? m.score?.halfTime?.home : null));
  const as = safeInt(m.score?.fullTime?.away ?? (isLive ? m.score?.halfTime?.away : null));
  const scoreDisplay = (hs !== null && as !== null) ? `${hs} – ${as}` : 'vs';
  const pens = Array.isArray(m.penalties) ? m.penalties : null;
  const penNote = (pens && safeInt(pens[0]) !== null && safeInt(pens[1]) !== null)
    ? `<div style="font-size:0.65rem;color:var(--text-secondary);text-align:center;margin-top:2px">pens ${safeInt(pens[0])}–${safeInt(pens[1])}</div>`
    : '';
  const stageLabel = esc((m.stage || '').replace(/_/g, ' '));
  return `
    <div class="match-card ${isLive ? 'live' : ''}">
      <div class="match-header">
        <span class="match-comp">${stageLabel}</span>
        <span class="match-status ${statusClass}">${statusText}</span>
      </div>
      <div class="match-teams">
        <div class="match-team">
          ${homeP ? `<img src="${flagUrl(homeP.code, 160)}" alt="${esc(homeName)} flag">` : `<div style="width:48px;height:32px;background:var(--glass);border-radius:4px;display:flex;align-items:center;justify-content:center">⚽</div>`}
          <div class="match-team-name">${esc(homeName)}</div>
          ${homeP ? `<div class="match-team-person">${esc(homeP.name)}</div>` : ''}
        </div>
        <div><div class="match-score ${isLive ? 'live-score' : ''}">${scoreDisplay}</div>${penNote}</div>
        <div class="match-team">
          ${awayP ? `<img src="${flagUrl(awayP.code, 160)}" alt="${esc(awayName)} flag">` : `<div style="width:48px;height:32px;background:var(--glass);border-radius:4px;display:flex;align-items:center;justify-content:center">⚽</div>`}
          <div class="match-team-name">${esc(awayName)}</div>
          ${awayP ? `<div class="match-team-person">${esc(awayP.name)}</div>` : ''}
        </div>
      </div>
      ${!isLive && !isFinished ? `<div class="match-time">📅 ${esc(formatDateTime(m.utcDate))}</div>` : ''}
    </div>`;
}

function formatDate(d) { try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch { return ''; } }
function formatDateTime(d) { try { return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }

// =====================================================================
//  ADD-ONS: sticker numbers, "On today", momentum trend, Run to Glory,
//  and shareable player cards. All read from results.json / history.json.
// =====================================================================

// Fixed sticker number per player (draw order), Panini-style.
const STICKER_NO = {};
PARTICIPANTS.forEach((p, i) => { STICKER_NO[p.name] = String(i + 1).padStart(2, '0'); });

// Shorten a few long names so chips/tables stay tidy.
const SHORT_TEAM = {
  'Bosnia and Herzegovina': 'Bosnia', 'Cape Verde Islands': 'Cape Verde',
  'Korea Republic': 'South Korea', "Côte d'Ivoire": 'Ivory Coast',
  'United States': 'USA', 'New Zealand': 'N. Zealand', 'Saudi Arabia': 'Saudi Arabia',
};
function shortTeam(n) { return SHORT_TEAM[n] || n || 'TBD'; }

// Every team name that actually appears in the fixture feed.
function teamsInSchedule(matches) {
  const s = new Set();
  (matches || []).forEach(m => {
    if (m && m.homeTeam && m.homeTeam.name) s.add(m.homeTeam.name);
    if (m && m.awayTeam && m.awayTeam.name) s.add(m.awayTeam.name);
  });
  return s;
}
// Players whose drawn nation is still a "UEFA Path A winner"-type placeholder.
function computeAwaitingPlayoff(matches) {
  const inSched = teamsInSchedule(matches);
  const set = new Set();
  PARTICIPANTS.forEach(p => { if (!inSched.has(p.team)) set.add(p.name); });
  return set;
}

// ===== ON TODAY =====
function renderToday(matches) {
  const bar = document.getElementById('today-bar');
  if (!bar) return;
  matches = Array.isArray(matches) ? matches : [];
  const now = new Date();
  const sameDay = (d) => { const x = new Date(d); return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth() && x.getDate() === now.getDate(); };
  let day = matches.filter(m => m.utcDate && sameDay(m.utcDate));
  let label = "⚽ Today's fixtures";
  if (!day.length) {
    const future = matches.filter(m => m.utcDate && new Date(m.utcDate) > now).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    if (future.length) {
      const nd = new Date(future[0].utcDate);
      day = future.filter(m => { const x = new Date(m.utcDate); return x.getFullYear() === nd.getFullYear() && x.getMonth() === nd.getMonth() && x.getDate() === nd.getDate(); });
      label = '⚽ Next up · ' + nd.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    }
  }
  if (!day.length) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
  day.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  const side = (name, p) => `${p ? `<img class="td-flag" src="${flagUrl(p.code)}" onerror="this.style.display='none'">` : '<span class="td-flag td-flag-blank"></span>'}<span class="td-team">${esc(shortTeam(name))}</span>${p ? `<span class="td-owner">${esc(p.name)}</span>` : ''}`;
  const chips = day.map(m => {
    const hp = findParticipant(m.homeTeam && m.homeTeam.name);
    const ap = findParticipant(m.awayTeam && m.awayTeam.name);
    const mine = hp || ap;
    const live = m.status === 'IN_PLAY' || m.status === 'PAUSED' || m.status === 'HALFTIME';
    const fin = m.status === 'FINISHED';
    const hs = safeInt(m.score && m.score.fullTime && m.score.fullTime.home);
    const as = safeInt(m.score && m.score.fullTime && m.score.fullTime.away);
    const mid = (fin || live) && hs !== null && as !== null
      ? `<span class="td-score">${hs}–${as}</span>`
      : `<span class="td-time">${new Date(m.utcDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>`;
    return `<div class="td-chip${mine ? ' td-mine' : ''}${live ? ' td-live' : ''}">
      ${live ? '<span class="td-livedot"></span>' : ''}
      <div class="td-side">${side(m.homeTeam && m.homeTeam.name, hp)}</div>
      ${mid}
      <div class="td-side">${side(m.awayTeam && m.awayTeam.name, ap)}</div>
    </div>`;
  }).join('');
  bar.style.display = 'block';
  bar.innerHTML = `<div class="td-head">${esc(label)}</div><div class="td-track">${chips}</div>`;
}

// ===== MOMENTUM (history.json) =====
async function loadHistory() {
  try {
    const res = await fetch('history.json?t=' + Date.now());
    if (!res.ok) return [];
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data && Array.isArray(data.snapshots) ? data.snapshots : []);
    return arr.filter(s => s && s.date && s.points && typeof s.points === 'object');
  } catch (e) { return []; }
}

let trendChart = null;
function renderMomentum(history) {
  const wrap = document.getElementById('momentum-wrap');
  if (!wrap) return;
  history = Array.isArray(history) ? history.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))) : [];
  const anyPoints = history.some(s => Object.values(s.points || {}).some(v => Number(v) > 0));
  if (!history.length || !anyPoints) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  // Biggest climber today (needs two days).
  const climber = document.getElementById('climber-callout');
  if (climber) {
    let best = null;
    if (history.length >= 2) {
      const last = history[history.length - 1].points, prev = history[history.length - 2].points;
      PARTICIPANTS.forEach(p => {
        const d = (Number(last[p.name]) || 0) - (Number(prev[p.name]) || 0);
        if (d > 0 && (!best || d > best.delta)) best = { name: p.name, delta: d, total: Number(last[p.name]) || 0, team: p.team, code: p.code };
      });
    }
    if (best) {
      climber.style.display = 'flex';
      climber.innerHTML = `<div class="cc-emoji">🚀</div>
        <img class="cc-flag" src="${flagUrl(best.code)}" onerror="this.style.display='none'">
        <div class="cc-info">
          <div class="cc-label">Biggest climber today</div>
          <div class="cc-name">${esc(best.name)} <span>+${best.delta} pts</span></div>
          <div class="cc-team">${esc(best.team)} · now on ${best.total}</div>
        </div>`;
    } else { climber.style.display = 'none'; climber.innerHTML = ''; }
  }

  const latest = history[history.length - 1].points;
  const top = [...PARTICIPANTS].sort((a, b) => (Number(latest[b.name]) || 0) - (Number(latest[a.name]) || 0)).slice(0, 8);
  const labels = history.map(s => { const d = new Date(s.date + 'T00:00:00'); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); });
  const palette = ['#ff2d78', '#22d3ee', '#b6ff3b', '#ffb020', '#9b7bff', '#ff6ec7', '#2dd4bf', '#f5d061'];
  const subEl = document.getElementById('momentum-sub');
  if (subEl) subEl.textContent = `Top ${top.length} · ${history.length} day${history.length === 1 ? '' : 's'} tracked`;
  const legend = document.getElementById('momentum-legend');
  if (legend) legend.innerHTML = top.map((p, i) => `<span class="ml-item"><span class="ml-dot" style="background:${palette[i % palette.length]}"></span>${esc(p.name)}</span>`).join('');

  const canvas = document.getElementById('trend-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const datasets = top.map((p, i) => ({
    label: p.name,
    data: history.map(s => Number(s.points[p.name]) || 0),
    borderColor: palette[i % palette.length], backgroundColor: 'transparent',
    borderWidth: 2.5, tension: 0.3, pointRadius: history.length === 1 ? 4 : 2, pointHoverRadius: 5,
  }));
  const sig = JSON.stringify({ labels, d: datasets.map(ds => ds.data) });
  if (window.__momentumSig === sig && trendChart) return; // data unchanged — skip the costly rebuild/animation
  window.__momentumSig = sig;
  if (trendChart) { trendChart.destroy(); trendChart = null; }
  trendChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(11,15,26,0.95)', borderColor: 'rgba(255,45,120,0.4)', borderWidth: 1 } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 }, precision: 0 } },
      },
    },
  });
}

// ===== RUN TO GLORY (survival + best-case) =====
const KO_ROUNDS = [
  { stage: 'ROUND_OF_32', max: 3 + 3 },
  { stage: 'LAST_16', max: 3 + 5 },
  { stage: 'QUARTER_FINALS', max: 3 + 10 },
  { stage: 'SEMI_FINALS', max: 3 + 15 },
  { stage: 'FINAL', max: 3 + 20 },
];
const KO_INDEX = { ROUND_OF_32: 0, LAST_16: 1, QUARTER_FINALS: 2, SEMI_FINALS: 3, FINAL: 4 };

function koWinnerName(m) {
  const hs = safeInt(m.score && m.score.fullTime && m.score.fullTime.home);
  const as = safeInt(m.score && m.score.fullTime && m.score.fullTime.away);
  const pens = Array.isArray(m.penalties) ? m.penalties : null;
  if (pens && safeInt(pens[0]) !== null && safeInt(pens[1]) !== null && pens[0] !== pens[1]) {
    return pens[0] > pens[1] ? (m.homeTeam && m.homeTeam.name) : (m.awayTeam && m.awayTeam.name);
  }
  if (hs !== null && as !== null && hs !== as) return hs > as ? (m.homeTeam && m.homeTeam.name) : (m.awayTeam && m.awayTeam.name);
  return null;
}

function computeRace(matches) {
  matches = Array.isArray(matches) ? matches : [];
  const awaiting = computeAwaitingPlayoff(matches);
  const koNamedExists = matches.some(m => m.stage && m.stage !== 'GROUP_STAGE' && m.stage !== 'THIRD_PLACE' && (findParticipant(m.homeTeam && m.homeTeam.name) || findParticipant(m.awayTeam && m.awayTeam.name)));
  return PARTICIPANTS.map(p => {
    const cur = getPoints(p.name);
    if (awaiting.has(p.name)) return { p, status: 'playoff', cur, bestCase: null, next: null, playedCount: 0, detail: 'Awaiting playoff result' };
    const team = p.team.toLowerCase();
    const mine = matches.filter(m => ((m.homeTeam && m.homeTeam.name) || '').toLowerCase() === team || ((m.awayTeam && m.awayTeam.name) || '').toLowerCase() === team);
    const finished = mine.filter(m => m.status === 'FINISHED');
    const groupRemaining = mine.filter(m => m.stage === 'GROUP_STAGE' && m.status !== 'FINISHED').length;
    const inKO = mine.some(m => m.stage && m.stage !== 'GROUP_STAGE' && m.stage !== 'THIRD_PLACE');

    let eliminated = false, elimStage = null, onPens = false;
    mine.filter(m => m.status === 'FINISHED' && KO_INDEX[m.stage] !== undefined).forEach(m => {
      const w = koWinnerName(m);
      if (w && w.toLowerCase() !== team) {
        const idx = KO_INDEX[m.stage];
        if (!eliminated || idx < (KO_INDEX[elimStage] != null ? KO_INDEX[elimStage] : 99)) {
          eliminated = true; elimStage = m.stage; onPens = Array.isArray(m.penalties) && m.penalties.length >= 2;
        }
      }
    });
    if (!eliminated && koNamedExists && !inKO && groupRemaining === 0 && finished.length > 0) { eliminated = true; elimStage = 'GROUP_STAGE'; }

    let highestWonIdx = -1;
    mine.filter(m => m.status === 'FINISHED' && KO_INDEX[m.stage] !== undefined).forEach(m => {
      const w = koWinnerName(m);
      if (w && w.toLowerCase() === team) highestWonIdx = Math.max(highestWonIdx, KO_INDEX[m.stage]);
    });

    let bestCase;
    if (eliminated) { bestCase = cur; }
    else { let ceiling = 0; for (let i = highestWonIdx + 1; i < KO_ROUNDS.length; i++) ceiling += KO_ROUNDS[i].max; bestCase = cur + groupRemaining * 3 + ceiling; }

    const upcoming = mine.filter(m => m.status !== 'FINISHED' && m.utcDate).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    const next = (!eliminated && upcoming.length) ? upcoming[0] : null;

    const status = eliminated ? 'out' : 'alive';
    let detail;
    if (eliminated) detail = 'Out · ' + String(elimStage || '').replace(/_/g, ' ').toLowerCase() + (onPens ? ' (pens)' : '');
    else detail = inKO ? 'Into the knockouts' : (groupRemaining > 0 ? `${groupRemaining} group game${groupRemaining === 1 ? '' : 's'} left` : 'Awaiting knockout draw');
    return { p, status, cur, bestCase, next, playedCount: finished.length, detail };
  });
}

let raceFilter = 'all';
function renderRace(matches) {
  const list = document.getElementById('race-list');
  if (!list) return;
  matches = Array.isArray(matches) ? matches : [];
  if (!matches.length) { list.innerHTML = '<p class="race-empty">Fixtures load here once the data is in.</p>'; return; }
  const rows = computeRace(matches);
  const order = { alive: 0, playoff: 1, out: 2 };
  rows.sort((a, b) => (order[a.status] - order[b.status]) || ((b.bestCase == null ? -1 : b.bestCase) - (a.bestCase == null ? -1 : a.bestCase)) || (b.cur - a.cur) || a.p.name.localeCompare(b.p.name));
  const maxCeiling = Math.max(1, ...rows.map(r => r.bestCase || 0));
  const filtered = rows.filter(r => raceFilter === 'all' ? true : r.status === raceFilter);
  if (!filtered.length) { list.innerHTML = '<p class="race-empty">Nobody in this group yet.</p>'; return; }
  list.innerHTML = filtered.map(r => {
    const statusChip = r.status === 'alive' ? '<span class="rc-chip rc-alive">✅ In</span>'
      : r.status === 'playoff' ? '<span class="rc-chip rc-playoff">🎟️ Playoff</span>'
      : '<span class="rc-chip rc-out">❌ Out</span>';
    const ceilingPct = r.bestCase != null ? Math.round((r.bestCase / maxCeiling) * 100) : 0;
    const nowPct = maxCeiling ? Math.round((r.cur / maxCeiling) * 100) : 0;
    const nextTxt = r.next ? `${esc(shortTeam(r.next.homeTeam && r.next.homeTeam.name))} v ${esc(shortTeam(r.next.awayTeam && r.next.awayTeam.name))} · ${new Date(r.next.utcDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : (r.status === 'playoff' ? 'Playoff pending' : '—');
    const isMe = getMe() === r.p.name;
    return `<div class="rc-row rc-${r.status}${isMe ? ' is-me' : ''}" data-name="${esc(r.p.name)}" role="button" tabindex="0">
      <img class="rc-flag" src="${flagUrl(r.p.code)}" onerror="this.style.display='none'">
      <div class="rc-id"><div class="rc-name">${esc(r.p.name)}${isMe ? ' <span class="me-tag">YOU</span>' : ''}</div><div class="rc-team">${esc(shortTeam(r.p.team))}</div></div>
      <div class="rc-status">${statusChip}<div class="rc-detail">${esc(r.detail)}</div></div>
      <div class="rc-next"><div class="rc-next-label">Next</div><div class="rc-next-val">${nextTxt}</div></div>
      <div class="rc-pts"><span>${r.cur}</span><small>now</small></div>
      <div class="rc-ceiling">
        <div class="rc-ceiling-top">${r.bestCase != null ? r.bestCase : '—'}<small>max</small></div>
        <div class="rc-bar"><div class="rc-bar-fill" style="width:${ceilingPct}%"></div><div class="rc-bar-now" style="width:${nowPct}%"></div></div>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('.rc-row').forEach(row => {
    const open = () => openProfile(row.dataset.name);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}

function initRaceFilters() {
  document.querySelectorAll('.race-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.race-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      raceFilter = btn.dataset.filter;
      renderRace(state.matchResults);
    });
  });
}

// ===== SHAREABLE PLAYER CARD (PNG) =====
function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function shareFallback() {
  try { navigator.clipboard.writeText(window.location.href); showToast('🔗 Link copied — share it in the group!'); }
  catch (e) { showToast('Could not generate the image on this device.'); }
}
async function sharePlayerCard(name) {
  const p = PARTICIPANTS.find(x => x.name === name);
  if (!p) return;
  showToast('🎨 Building your sticker…');
  const W = 540, H = 760, scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale; canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#15082a'); bg.addColorStop(0.5, '#0b1230'); bg.addColorStop(1, '#1a0825');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const foil = ctx.createLinearGradient(0, 0, W, H);
  foil.addColorStop(0, '#ff2d78'); foil.addColorStop(0.5, '#22d3ee'); foil.addColorStop(1, '#b6ff3b');
  ctx.strokeStyle = foil; ctx.lineWidth = 10; roundRect(ctx, 16, 16, W - 32, H - 32, 28); ctx.stroke();

  ctx.fillStyle = '#ff8ac4'; ctx.font = '600 18px Outfit, Arial, sans-serif';
  ctx.fillText('WORLD CUP 2026 · SWEEPSTAKE', W / 2, 62);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '700 15px Outfit, Arial, sans-serif';
  ctx.fillText('STICKER #' + (STICKER_NO[name] || '00'), W / 2, 86);

  try {
    const img = await loadImg(flagUrl(p.code, 320));
    const fw = 240, fh = Math.round(fw * 2 / 3), fx = (W - fw) / 2, fy = 112;
    ctx.save(); roundRect(ctx, fx, fy, fw, fh, 12); ctx.clip();
    ctx.drawImage(img, fx, fy, fw, fh); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; roundRect(ctx, fx, fy, fw, fh, 12); ctx.stroke();
  } catch (e) { /* no flag — carry on */ }

  ctx.fillStyle = '#fff'; ctx.font = '800 40px Outfit, Arial, sans-serif';
  ctx.fillText(name, W / 2, 404);
  ctx.fillStyle = '#22d3ee'; ctx.font = '500 22px Inter, Arial, sans-serif';
  ctx.fillText(p.team, W / 2, 436);

  const pts = getPoints(name), gls = getGoals(name);
  ctx.fillStyle = '#ff2d78'; ctx.font = '800 66px Outfit, Arial, sans-serif';
  ctx.fillText(String(pts), W / 2 - 92, 548);
  ctx.fillStyle = '#b6ff3b';
  ctx.fillText(String(gls), W / 2 + 92, 548);
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '600 15px Inter, Arial, sans-serif';
  ctx.fillText('POINTS', W / 2 - 92, 572); ctx.fillText('GOALS', W / 2 + 92, 572);

  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '400 13px Inter, Arial, sans-serif';
  ctx.fillText('jamesonbates07-sketch.github.io/world-cup-sweepstake', W / 2, H - 38);

  let blob;
  try { blob = await new Promise((res) => canvas.toBlob(res, 'image/png')); }
  catch (e) { blob = null; }
  if (!blob) { shareFallback(); return; }

  const file = new File([blob], `${name.replace(/\s+/g, '-')}-sweepstake.png`, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'World Cup 2026 Sweepstake', text: `${name} (${p.team}) — ${pts} pts, ${gls} goals 🏆` });
      return;
    }
  } catch (e) { /* user cancelled or unsupported — fall through to download */ }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  showToast('📸 Sticker saved — drop it in the group!');
}

// =====================================================================
//  PERSONALIZATION · MODAL · PROFILE · YOU-BAR · BACK-TO-TOP · REFRESH
// =====================================================================

// ----- "This is me" -----
function getMe() {
  try { return localStorage.getItem('sweepstake_me') || window.__me || null; } catch (e) { return window.__me || null; }
}
function setMe(name) {
  try { localStorage.setItem('sweepstake_me', name); } catch (e) {}
  window.__me = name;
  window.__youBarHidden = false;
  updateMeButton(); renderCards(); renderLeaderboard(); renderRace(state.matchResults); renderYouBar();
}
function clearMe() {
  try { localStorage.removeItem('sweepstake_me'); } catch (e) {}
  window.__me = null;
  updateMeButton(); renderCards(); renderLeaderboard(); renderRace(state.matchResults); renderYouBar();
}
function updateMeButton() {
  const btn = document.getElementById('me-btn');
  if (!btn) return;
  const me = getMe();
  btn.innerHTML = me ? `⭐ You: ${esc(me)}` : '⭐ This is me';
  btn.classList.toggle('is-set', !!me);
}
function initMe() {
  const btn = document.getElementById('me-btn');
  if (btn) btn.addEventListener('click', openPickMe);
  updateMeButton();
}
function openPickMe() {
  const me = getMe();
  const list = [...PARTICIPANTS].sort((a, b) => a.name.localeCompare(b.name));
  const rows = list.map(p => `<button class="pick-row${me === p.name ? ' is-me' : ''}" data-name="${esc(p.name)}">
      <img src="${flagUrl(p.code)}" onerror="this.style.display='none'"><span class="pick-name">${esc(p.name)}</span><span class="pick-team">${esc(p.team)}</span>
    </button>`).join('');
  openModal(`
    <div class="modal-head"><h3>Who are you?</h3><button class="modal-x" data-close aria-label="Close">✕</button></div>
    <p class="modal-sub">Pick your name to highlight yourself everywhere${me ? ' — or <button class="link-btn" id="clear-me">clear it</button>' : ''}.</p>
    <input type="search" class="pick-search" id="pick-search" placeholder="Search your name or team…" aria-label="Search players">
    <div class="pick-list" id="pick-list">${rows}</div>
  `);
  const search = document.getElementById('pick-search');
  const listEl = document.getElementById('pick-list');
  if (search && listEl) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      listEl.querySelectorAll('.pick-row').forEach(r => {
        const n = r.querySelector('.pick-name').textContent.toLowerCase();
        const t = r.querySelector('.pick-team').textContent.toLowerCase();
        r.style.display = (n.includes(q) || t.includes(q)) ? '' : 'none';
      });
    });
    setTimeout(() => { try { search.focus(); } catch (e) {} }, 60);
  }
  if (listEl) listEl.querySelectorAll('.pick-row').forEach(r => r.addEventListener('click', () => {
    setMe(r.dataset.name); closeModal(); showToast(`⭐ You're now following ${r.dataset.name}`);
  }));
  const clr = document.getElementById('clear-me');
  if (clr) clr.addEventListener('click', () => { clearMe(); closeModal(); });
}

// ----- Modal system -----
let modalOpen = false;
let lastFocus = null;
function initModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.addEventListener('click', (e) => {
    const t = e.target;
    if (t.id === 'modal-root' || t.id === 'modal-backdrop' || (t.hasAttribute && t.hasAttribute('data-close'))) closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalOpen) closeModal(); });
}
function openModal(html) {
  const root = document.getElementById('modal-root');
  const card = document.getElementById('modal-card');
  if (!root || !card) return;
  lastFocus = document.activeElement;
  card.innerHTML = html;
  root.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  modalOpen = true;
  requestAnimationFrame(() => {
    root.classList.add('open');
    const x = card.querySelector('[data-close]');
    if (x) { try { x.focus(); } catch (e) {} } else { try { card.focus(); } catch (e) {} }
  });
}
function closeModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.classList.remove('open');
  modalOpen = false;
  document.body.style.overflow = '';
  setTimeout(() => { root.style.display = 'none'; const card = document.getElementById('modal-card'); if (card) card.innerHTML = ''; }, 200);
  if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
}

// ----- Player profile -----
function openProfile(name) {
  const p = PARTICIPANTS.find(x => x.name === name);
  if (!p) return;
  const matches = state.matchResults || [];
  const team = p.team.toLowerCase();
  const mine = matches.filter(m => ((m.homeTeam && m.homeTeam.name) || '').toLowerCase() === team || ((m.awayTeam && m.awayTeam.name) || '').toLowerCase() === team)
    .sort((a, b) => new Date(a.utcDate || 0) - new Date(b.utcDate || 0));
  const raceRow = computeRace(matches).find(r => r.p.name === name) || { status: 'alive', cur: getPoints(name), bestCase: null, detail: '' };
  const ranked = [...PARTICIPANTS].sort((a, b) => getPoints(b.name) - getPoints(a.name));
  const rank = ranked.findIndex(r => r.name === name) + 1;
  const statusChip = raceRow.status === 'alive' ? '<span class="rc-chip rc-alive">✅ Still in</span>'
    : raceRow.status === 'playoff' ? '<span class="rc-chip rc-playoff">🎟️ Awaiting playoff</span>'
    : '<span class="rc-chip rc-out">❌ Out</span>';
  const fixtures = mine.map(m => {
    const home = (m.homeTeam && m.homeTeam.name) || 'TBD';
    const away = (m.awayTeam && m.awayTeam.name) || 'TBD';
    const isHome = home.toLowerCase() === team;
    const opp = isHome ? away : home;
    const fin = m.status === 'FINISHED';
    const hs = safeInt(m.score && m.score.fullTime && m.score.fullTime.home);
    const as = safeInt(m.score && m.score.fullTime && m.score.fullTime.away);
    let result, tag, cls;
    if (fin && hs !== null && as !== null) {
      const my = isHome ? hs : as, ot = isHome ? as : hs;
      result = `${my}–${ot}`;
      const pens = Array.isArray(m.penalties) ? m.penalties : null;
      if (my > ot) { tag = 'W'; cls = 'res-w'; }
      else if (my < ot) { tag = 'L'; cls = 'res-l'; }
      else { const pw = pens ? (isHome ? pens[0] > pens[1] : pens[1] > pens[0]) : null; tag = pw === true ? 'W' : pw === false ? 'L' : 'D'; cls = tag === 'W' ? 'res-w' : tag === 'L' ? 'res-l' : 'res-d'; }
    } else { result = m.utcDate ? new Date(m.utcDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBD'; tag = '·'; cls = 'res-sched'; }
    const stageLabel = (m.stage === 'GROUP_STAGE') ? (m.group || 'Group') : (m.stage || '').replace(/_/g, ' ');
    return `<div class="pf-fix">
        <span class="pf-fix-stage">${esc(stageLabel)}</span>
        <span class="pf-fix-opp">${isHome ? '' : '@ '}${esc(shortTeam(opp))}</span>
        <span class="pf-fix-res ${cls}">${esc(result)}</span>
        <span class="pf-fix-tag ${cls}">${esc(tag)}</span>
      </div>`;
  }).join('') || '<p class="pf-empty">No fixtures in the feed yet.</p>';
  openModal(`
    <div class="modal-head"><h3>Player profile</h3><button class="modal-x" data-close aria-label="Close">✕</button></div>
    <div class="pf-top">
      <img class="pf-flag" src="${flagUrl(p.code, 160)}" onerror="this.style.display='none'">
      <div class="pf-id">
        <div class="pf-no">Sticker #${STICKER_NO[name] || '00'}</div>
        <div class="pf-name">${esc(name)}</div>
        <div class="pf-team">${esc(p.team)}</div>
        <div class="pf-chips">${statusChip}<span class="pf-rank">Rank #${rank} of ${PARTICIPANTS.length}</span></div>
      </div>
    </div>
    <div class="pf-stats">
      <div class="pf-stat"><span>${raceRow.cur}</span><small>points</small></div>
      <div class="pf-stat"><span>${getGoals(name)}</span><small>goals</small></div>
      <div class="pf-stat"><span>${raceRow.bestCase != null ? raceRow.bestCase : '—'}</span><small>ceiling</small></div>
    </div>
    ${raceRow.detail ? `<div class="pf-detail">${esc(raceRow.detail)}</div>` : ''}
    <div class="pf-fix-head">Their team's fixtures</div>
    <div class="pf-fixtures">${fixtures}</div>
    <div class="pf-actions">
      <button class="pf-btn pf-share" id="pf-share">📸 Share card</button>
      ${getMe() === name ? '' : `<button class="pf-btn pf-me" id="pf-me">⭐ This is me</button>`}
    </div>
  `);
  const sh = document.getElementById('pf-share');
  if (sh) sh.addEventListener('click', () => sharePlayerCard(name));
  const meBtn = document.getElementById('pf-me');
  if (meBtn) meBtn.addEventListener('click', () => { setMe(name); closeModal(); showToast(`⭐ You're now following ${name}`); });
}

// ----- Your sticky status bar -----
function renderYouBar() {
  const bar = document.getElementById('you-bar');
  if (!bar) return;
  const me = getMe();
  const p = me ? PARTICIPANTS.find(x => x.name === me) : null;
  if (!p) { bar.style.display = 'none'; bar.innerHTML = ''; return; }
  if (window.__youBarHidden) { bar.style.display = 'none'; return; } // user dismissed it this session
  const ranked = [...PARTICIPANTS].sort((a, b) => getPoints(b.name) - getPoints(a.name) || getGoals(b.name) - getGoals(a.name));
  const rank = ranked.findIndex(r => r.name === me) + 1;
  const raceRow = computeRace(state.matchResults || []).find(r => r.p.name === me);
  let nextTxt = '—';
  if (raceRow && raceRow.status === 'out') nextTxt = 'Eliminated';
  else if (raceRow && raceRow.next) nextTxt = `${shortTeam(raceRow.next.homeTeam && raceRow.next.homeTeam.name)} v ${shortTeam(raceRow.next.awayTeam && raceRow.next.awayTeam.name)}`;
  else if (raceRow && raceRow.status === 'playoff') nextTxt = 'Playoff pending';
  bar.style.display = 'flex';
  bar.innerHTML = `
    <img class="yb-flag" src="${flagUrl(p.code)}" onerror="this.style.display='none'">
    <div class="yb-main">
      <div class="yb-name">${esc(p.name)} <span>· ${esc(p.team)}</span></div>
      <div class="yb-stats">#${rank} of ${PARTICIPANTS.length} · ${getPoints(me)} pts · next: ${esc(nextTxt)}</div>
    </div>
    <button class="yb-view" id="yb-view">View</button>
    <button class="yb-x" id="yb-x" aria-label="Hide your status bar">✕</button>`;
  const v = document.getElementById('yb-view'); if (v) v.addEventListener('click', () => openProfile(me));
  const x = document.getElementById('yb-x'); if (x) x.addEventListener('click', () => { bar.style.display = 'none'; window.__youBarHidden = true; });
}

// ----- Back to top -----
function initToTop() {
  const btn = document.getElementById('to-top');
  if (!btn) return;
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const onScroll = () => btn.classList.toggle('show', window.scrollY > 600);
  window.addEventListener('scroll', onScroll);
  onScroll();
}

// ----- Auto-refresh (match days) -----
function startAutoRefresh() {
  setInterval(() => {
    if (modalOpen || document.hidden) return;
    fetchResults();
  }, 60000);
}
