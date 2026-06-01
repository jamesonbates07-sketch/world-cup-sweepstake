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
  fetchResults();
});

function flagUrl(code, w = 80) { return `https://flagcdn.com/w${w}/${code}.png`; }

// Security: escape any externally-sourced string before putting it in innerHTML.
// The match feed comes from a third party, so team names etc. are untrusted.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Coerce a value to a safe integer for display (defends against bad score data).
function safeInt(v) { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; }

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
      ctx.fillStyle = `rgba(212, 175, 55, ${p.a})`; ctx.fill();
    });
    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(212, 175, 55, ${0.06 * (1 - dist / 120)})`;
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
  function update() {
    const now = new Date();
    const diff = TOURNAMENT_START - now;
    if (diff <= 0) {
      container.innerHTML = '<div class="tournament-live-badge">🔴 TOURNAMENT IS LIVE!</div>';
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    container.innerHTML = `
      <div class="countdown">
        <div class="countdown-item"><div class="countdown-value">${d}</div><div class="countdown-label">Days</div></div>
        <div class="countdown-item"><div class="countdown-value">${h}</div><div class="countdown-label">Hours</div></div>
        <div class="countdown-item"><div class="countdown-value">${m}</div><div class="countdown-label">Mins</div></div>
        <div class="countdown-item"><div class="countdown-value">${s}</div><div class="countdown-label">Secs</div></div>
      </div>`;
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
  document.getElementById('no-results').style.display = sorted.length ? 'none' : 'block';
  grid.innerHTML = sorted.map((p, i) => {
    const rank = ranked.findIndex(r => r.name === p.name) + 1;
    const pts = getPoints(p.name);
    const goals = getGoals(p.name);
    const rankClass = rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : '';
    return `
      <div class="participant-card" style="animation-delay:${i * 0.03}s" data-name="${p.name}">
        <div class="card-glow"></div>
        <div class="card-rank ${rankClass}">#${rank}</div>
        <img class="card-flag" src="${flagUrl(p.code, 160)}" alt="${p.team} flag" loading="lazy" onerror="this.style.display='none'">
        <div class="card-person">${p.name}</div>
        <div class="card-team">${p.team}</div>
        <div class="card-points">
          <div><span class="points-value">${pts}</span> <span class="points-label">pts</span></div>
          <div><span class="points-value" style="color:var(--accent)">${goals}</span> <span class="points-label">goals</span></div>
        </div>
      </div>`;
  }).join('');
  // Add click confetti
  grid.querySelectorAll('.participant-card').forEach(card => {
    card.addEventListener('click', () => {
      if (typeof confetti === 'function') {
        const rect = card.getBoundingClientRect();
        confetti({ particleCount: 40, spread: 60, startVelocity: 20, origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight } });
      }
    });
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
    return `
      <div class="lb-row ${cls}">
        <div class="lb-position">${medal}${rank}</div>
        <img class="lb-flag" src="${flagUrl(p.code)}" alt="${p.team}" loading="lazy" onerror="this.style.display='none'">
        <div class="lb-info"><div class="lb-name">${p.name}</div><div class="lb-team">${p.team}</div></div>
        <div class="lb-points">${getPoints(p.name)}</div>
      </div>`;
  }).join('');
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
    
    renderCards();
    renderLeaderboard();
    if (Array.isArray(data.matches)) {
      renderMatches(data.matches);
    }
  } catch (e) {
    console.warn('Could not load results.json:', e);
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl) lastUpdatedEl.textContent = 'Data will appear here once the tournament begins.';
    const summaryTextEl = document.getElementById('summary-text');
    if (summaryTextEl) summaryTextEl.textContent = 'Waiting for results...';
    
    renderCards();
    renderLeaderboard();
  }
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
  const hs = safeInt(m.score?.fullTime?.home ?? m.score?.halfTime?.home);
  const as = safeInt(m.score?.fullTime?.away ?? m.score?.halfTime?.away);
  const scoreDisplay = (hs !== null && as !== null) ? `${hs} – ${as}` : 'vs';
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
        <div class="match-score ${isLive ? 'live-score' : ''}">${scoreDisplay}</div>
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
