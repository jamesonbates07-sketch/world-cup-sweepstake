// One-off (idempotent) helper: add/update the two semi-final scores in manual-scores.json.
const fs = require('fs');
const file = 'manual-scores.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const norm = s => String(s == null ? '' : s).trim().toLowerCase();
const key = o => norm(o.date) + '|' + norm(o.team1) + '|' + norm(o.team2);

const newEntries = [
  {
    round: 'Semi-final', date: '2026-07-14', team1: 'W97', team2: 'W98',
    score: { ft: [0, 2] },
    source: "France 0-2 Spain (semi-final, Dallas/Arlington, 14 Jul 2026; Mikel Oyarzabal penalty 22', Pedro Porro 58'; Spain kept a clean sheet to reach the final). Feed lists team1=W97=France, team2=W98=Spain, so ft=[France 0, Spain 2]. Cross-checked: ESPN, FIFA.com, Al Jazeera, NBC News, Yahoo Sports."
  },
  {
    round: 'Semi-final', date: '2026-07-15', team1: 'W99', team2: 'W100',
    score: { ft: [1, 2] },
    source: "England 1-2 Argentina (semi-final, Atlanta, 15 Jul 2026; Anthony Gordon opener early in the 2nd half, Enzo Fernandez 85' equaliser, Lautaro Martinez 90+2' winner from a Messi cross; Argentina reach final). Feed lists team1=W99=England, team2=W100=Argentina, so ft=[England 1, Argentina 2]. Cross-checked: ESPN, FOX Sports, FIFA.com, NBC, Yahoo Sports, Al Jazeera."
  }
];

const idx = new Map(data.matches.map((o, i) => [key(o), i]));
let added = 0, updated = 0;
for (const e of newEntries) {
  const k = key(e);
  if (idx.has(k)) { data.matches[idx.get(k)] = e; updated++; }
  else { data.matches.push(e); added++; }
}
fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('added:', added, '| updated:', updated, '| total entries now:', data.matches.length);
