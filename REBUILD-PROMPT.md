# MEGA-PROMPT — Build a World Cup 2026 Sweepstake tracker (with a live knockout bracket + "predict-the-rest" what-if engine)

> Paste everything below into a capable coding agent. It is written as an instruction set to *you, the builder*. It fully specifies the deliverable: a static website plus a Node data pipeline plus a daily update job. Follow it literally; where it says "exact", match it exactly.

---

## 0) How to use this prompt

Build in this order and don't skip the verification step:

1. Data pipeline (`update-results.js` → `build-results.js` → `results.json`).
2. Seed data (`worldcup-raw.json`, `manual-scores.json`).
3. Website (`index.html`, `style.css`, `script.js`) that reads **only** `results.json`.
4. Daily update job spec.
5. Headless verification (jsdom + Node unit tests) and acceptance checklist.

If you are *modifying* an existing version, back up `index.html`, `style.css`, `script.js` to a dated folder first, and never hand-edit `results.json`.

---

## 1) Mission (one paragraph)

A group of **48 friends each "own" one nation** in the FIFA World Cup 2026 (48-team format, hosted USA/Mexico/Canada). It's a £2-entry sweepstake, winner takes the £96 pot. Build a **daily-updated, single-page website** that shows the live sweepstake leaderboard, group tables, an **interactive knockout bracket**, a **"predict-the-rest" what-if simulator** that re-scores the leaderboard from the user's bracket picks, a "who's still alive" survival tracker, and a "hall of shame" of booby prizes. It must be **genuinely accurate** — real match results, verified — and never break or blank out if a data fetch fails. The signature feature is the predictor: the user clicks winners through to the Final and instantly sees how the sweepstake standings *would* change.

The tournament runs **11 June → 19 July 2026**. The site's tone is fun, competitive, broadcast-slick.

---

## 2) Tech stack & hard constraints

- **Website:** plain **HTML + CSS + vanilla JS**. No framework, no bundler, no build step. It must run by opening `index.html` (also deployable to GitHub Pages). One external JS dep is allowed: `canvas-confetti` from a CDN (used sparingly, always feature-guarded with `typeof confetti === 'function'`).
- **Data pipeline:** **Node.js**, zero dependencies, **no network calls inside scripts** and **no API keys** anywhere. The pipeline reads local JSON files and writes local JSON files only.
- **Single source of truth for the UI:** the website reads **only `results.json`**. Nothing else. `results.json` is *generated*; never hand-edited.
- **Robustness:** every render function validates shape and degrades gracefully. A missing/short/failed `results.json` shows friendly empty states, never a stack trace, never a blank page.
- **Fonts:** Google Fonts — `Outfit` (display), `Oswald` (condensed match/score numerals), `Inter` (body).
- **Flags:** `https://flagcdn.com/w{width}/{code}.png` where `{code}` is an ISO-ish 2-letter code (with `gb-eng`, `gb-sct` for the home nations). Always `onerror="this.style.display='none'"`.
- **Accessibility:** keyboard-operable (Enter/Space on custom buttons/rows), `aria-*` on toggles/dialogs, focus trap in the modal, visible focus states, respects `prefers-reduced-motion`.
- **Responsive:** works from 320px phones to wide desktop. The bracket scrolls horizontally on small screens.

---

## 3) Repository layout (file by file)

```
index.html              # the single page (structure + hooks/IDs)
style.css               # all styling + the broadcast theme
script.js               # all client logic (data model lives here too)
results.json            # GENERATED — the only file the site reads
build-results.js        # builds results.json from raw feed + manual overlay
update-results.js       # exports the scoring logic + participant roster (module)
manual-scores-util.js   # overlay logic (match by date+team1+team2)
manual-scores.json      # human-verified scores the feed hasn't published yet
worldcup-raw.json       # openfootball fixtures/schedule feed (verbatim copy)
history-util.js         # snapshot helpers (leaderboard over time)
history.json            # GENERATED — daily leaderboard snapshots
manifest.json           # PWA manifest (name, icons, theme color)
icon-192.png / icon-512.png / icon-maskable-512.png / og-image.png
package.json            # {"type":"commonjs"}, scripts to run the build
```

Design so `update-results.js` `module.exports` the scoring functions + `PARTICIPANTS`, and `build-results.js` requires them. Keep **all scoring rules in ONE place** (`update-results.js`) so they can't drift.

---

## 4) The sweepstake rules (scoring) — EXACT

Points are awarded to a player via the nation they own.

```
WIN_POINTS  = 3   // a win in 90 mins OR extra time
DRAW_POINTS = 1   // a group-stage draw, OR a penalty-shootout loss

KNOCKOUT_BONUS (added to the team that ADVANCES / wins the tie):
  ROUND_OF_32    +3
  LAST_16        +5
  QUARTER_FINALS +10
  SEMI_FINALS    +15
  FINAL          +20
  (THIRD_PLACE   : NO bonus)

Tiebreaker on the leaderboard: total goals scored across the tournament.
Entry: £2/player. Pot: £96. Winner takes all.
```

Precise interpretation you must implement in the pipeline:

- Base points from **every played match** (group + knockout), using the **decisive score**: extra-time score if the match went to ET, otherwise the 90-minute score. Win → +3, draw → +1 each.
- A **penalty shootout** means the match was level through ET, so it scores as a **draw (1 pt each)** on the base score. The shootout **winner** is then separately given the **round bonus** for advancing.
- The **knockout advancement bonus** goes to the actual team that goes through (penalties > extra time > full time decides the winner). Applied once per knockout match, per its stage.
- Third-place playoff: base points only (win = 3), **no** bonus, and it does **not** count toward elimination/ceiling logic.

Determine a knockout winner in this priority order: penalties `score.p` → extra time `score.et` → full time `score.ft`.

---

## 5) The 48-player roster (participant → nation)

Embed this as `PARTICIPANTS` (array of `{ name, team, code }`) in both `update-results.js` (pipeline) and `script.js` (site). `team` is the **canonical** name used to match the feed (see §9). `code` is the flag code.

```js
const PARTICIPANTS = [
  { name: 'Abi',            team: 'Austria',                code: 'at' },
  { name: 'Adrian',         team: "Côte d'Ivoire",          code: 'ci' },
  { name: 'Alex',           team: 'Scotland',               code: 'gb-sct' },
  { name: 'Andrea',         team: 'Spain',                  code: 'es' },
  { name: 'Bella',          team: 'Argentina',              code: 'ar' },
  { name: 'Charlotte',      team: 'Australia',              code: 'au' },
  { name: 'Dan',            team: 'France',                 code: 'fr' },
  { name: 'Darryl',         team: 'Ecuador',                code: 'ec' },
  { name: 'Dermot',         team: 'Congo DR',               code: 'cd' },
  { name: 'Derran',         team: 'Haiti',                  code: 'ht' },
  { name: 'Ed',             team: 'Paraguay',               code: 'py' },
  { name: 'Ellie',          team: 'Panama',                 code: 'pa' },
  { name: 'Enrico',         team: 'Netherlands',            code: 'nl' },
  { name: 'Fergus',         team: 'South Africa',           code: 'za' },
  { name: 'George',         team: 'Ghana',                  code: 'gh' },
  { name: 'Hayley',         team: 'Mexico',                 code: 'mx' },
  { name: 'Holly',          team: 'Algeria',                code: 'dz' },
  { name: 'Jack',           team: 'Belgium',                code: 'be' },
  { name: 'Jake',           team: 'Qatar',                  code: 'qa' },
  { name: 'James G',        team: 'United States',          code: 'us' },
  { name: 'Jameson B',      team: 'New Zealand',            code: 'nz' },
  { name: 'Jonathan B',     team: 'Sweden',                 code: 'se' },
  { name: 'Karl D',         team: 'Uzbekistan',             code: 'uz' },
  { name: "Katie O'Hara",   team: 'Croatia',                code: 'hr' },
  { name: 'Leena',          team: 'Norway',                 code: 'no' },
  { name: 'Liliana',        team: 'Uruguay',                code: 'uy' },
  { name: 'Louise',         team: 'Germany',                code: 'de' },
  { name: 'Mark G',         team: 'Iraq',                   code: 'iq' },
  { name: 'Marta',          team: 'Curaçao',                code: 'cw' },
  { name: 'Matthew Collison',team: 'Japan',                 code: 'jp' },
  { name: 'Matthew Garvey', team: 'Egypt',                  code: 'eg' },
  { name: 'Matty Z',        team: 'Jordan',                 code: 'jo' },
  { name: 'Michael H',      team: 'Cape Verde Islands',     code: 'cv' },
  { name: 'Micky P',        team: 'Czech Republic',         code: 'cz' },
  { name: 'Natasha B',      team: 'Iran',                   code: 'ir' },
  { name: 'Nathan G',       team: 'Turkey',                 code: 'tr' },
  { name: 'Nic B',          team: 'Bosnia and Herzegovina', code: 'ba' },
  { name: 'Nirusha',        team: 'Tunisia',                code: 'tn' },
  { name: 'Rebecca V',      team: 'Morocco',                code: 'ma' },
  { name: 'Richie C',       team: 'Saudi Arabia',           code: 'sa' },
  { name: 'Robin',          team: 'Senegal',                code: 'sn' },
  { name: 'Sam M',          team: 'Colombia',               code: 'co' },
  { name: 'Sammi Hughes',   team: 'Korea Republic',         code: 'kr' },
  { name: 'Stuart Staves',  team: 'Portugal',               code: 'pt' },
  { name: 'Tina',           team: 'England',                code: 'gb-eng' },
  { name: 'Ugne',           team: 'Brazil',                 code: 'br' },
  { name: 'Wendy',          team: 'Switzerland',            code: 'ch' },
  { name: 'Augustin',       team: 'Canada',                 code: 'ca' },
];
```

(If you're generalising this, treat the roster as config: N players, one nation each, uniqueness enforced.)

---

## 6) `results.json` — the contract (COMPLETE)

The pipeline writes exactly this shape. The site validates each field before using it.

```jsonc
{
  "lastUpdated": "2026-07-07T10:11:36.000Z",   // ISO string
  "points": { "Dan": 23, "Andrea": 21, ... },   // name -> integer, ALL 48 present
  "goals":  { "Dan": 14, "Andrea": 9, ... },    // name -> integer, ALL 48 present
  "summaryText": "Recent action: United States 1-4 Belgium | Portugal 0-1 Spain | ...",
  "matches": [ /* array of Match objects, in FEED ORDER — see §7 */ ],
  "awards": {
    "rustySpoon":            { "holder": "Mark G",   "team": "Iraq",        "detail": "0 pts · GD -11" },
    "swissCheese":           { "holder": "Marta",    "team": "Curaçao",     "detail": "Let in 7 vs Germany" },
    "penaltyPain":           { "holder": "Enrico",   "team": "Netherlands", "detail": "Out on penalties (round of 32)" },
    "blankSheet":            { "holder": "Ellie",    "team": "Panama",      "detail": "0 goals in 3 games" },
    "biggestDisappointment": { "holder": "Liliana",  "team": "Uruguay",     "detail": "FIFA #11 — out at group stage" },
    "unluckiest":            { "holder": "Natasha B","team": "Iran",        "detail": "3 pts but didn't progress" }
  },
  "stats": {
    "matchesPlayed": 94,
    "totalGoals": 250,
    "biggestWin": { "winner": "Germany", "score": "7-1" },
    "goldenBoot": { "holder": "Dan", "team": "France", "goals": 14 },
    "champion":   null   // or { "holder": "...", "team": "..." } once the Final is decided
  }
}
```

Rules: `points`/`goals` include **all 48** names (zero-filled). `matches` preserves **feed order** (critical — see §8). `champion` stays `null` until the Final has a winner.

---

## 7) Match object + stages + placeholder codes

Each element of `matches`:

```jsonc
{
  "utcDate": "2026-07-06T14:00:00-05:00",   // ISO with offset
  "status": "FINISHED",                      // or "SCHEDULED" / "IN_PLAY"
  "stage": "LAST_16",                        // see enum below
  "group": "Group A",                        // only for GROUP_STAGE
  "homeTeam": { "name": "Portugal" },
  "awayTeam": { "name": "Spain" },
  "penalties": null,                          // or [homePens, awayPens]
  "score": {
    "fullTime": { "home": 0, "away": 1 },
    "halfTime": { "home": 0, "away": 0 }
  }
}
```

**Stage enum:** `GROUP_STAGE`, `ROUND_OF_32`, `LAST_16`, `QUARTER_FINALS`, `SEMI_FINALS`, `THIRD_PLACE`, `FINAL`.

**Placeholder team names** (present when a knockout slot isn't decided yet) — your bracket/predictor must parse these:
- Group slots (Round of 32): `"1A"` = Group A winner, `"2A"` = Group A runner-up, `"3A/B/C/D/F"` = a best-3rd-place team from that group set.
- Winner/loser refs: `"W89"` = winner of match **89**, `"L101"` = loser of match **101**.

Render placeholders as friendly labels, e.g. `2A → "Runner-up · Group A"`, `W89 → "Winner · Match 89"`, `3A/B/C/D/F → "3rd place · Grps A/B/C/D/F"`.

---

## 8) Bracket topology (match numbers 73–104) — the linkage

`results.json` does **not** carry match numbers. Reconstruct them from **array order within each stage** (the feed preserves official numbering, and you must NOT re-sort by date — kickoff times can invert same-day pairs). Assign sequentially:

```
ROUND_OF_32    -> 73..88   (16 matches, in array order)
LAST_16        -> 89..96   (8)
QUARTER_FINALS -> 97..100  (4)
SEMI_FINALS    -> 101,102  (2)
THIRD_PLACE    -> 103
FINAL          -> 104
```

Feeder graph (hard-code this — the 2026 bracket is fixed):

```
R16:  89:{W74,W77}  90:{W73,W75}  91:{W76,W78}  92:{W79,W80}
      93:{W83,W84}  94:{W81,W82}  95:{W86,W88}  96:{W85,W87}
QF:   97:{W89,W90}  98:{W93,W94}  99:{W91,W92}  100:{W95,W96}
SF:   101:{W97,W98} 102:{W99,W100}
3rd:  103:{L101,L102}
FINAL:104:{W101,W102}
```

`winnerOfNum(n)` = real winner if match `n` is FINISHED (read from `results.json`), else the user's prediction if any, else `null`/TBD. Round-of-32 winners are all knowable from the feed once the group stage ends.

---

## 9) Team-name normalization (feed ↔ roster)

The feed and the roster spell some nations differently. Normalize before matching (case-insensitive, trimmed). Provide a mapping and a `findParticipant(name)` that applies it:

```js
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
```

---

## 10) The data pipeline

### 10a) `worldcup-raw.json`
A **verbatim** copy of the openfootball public-domain feed:
`https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`
Shape: `{ "name": "...", "matches": [ { round, num?, date, time, team1, team2, group?, score?{ft,ht,et,p}, goals1?, goals2? } ] }`.
**Reality check:** this feed is often **fixtures-only for the knockouts** — it lists ties but publishes **no knockout scores** and keeps play-off/slot placeholder names (`"UEFA Path A winner"`, `"2K"`, `"W83"`). So real knockout results must come from the web step (see §11), not this file.

### 10b) `manual-scores.json`
Human-verified scores for matches the feed hasn't scored yet. The website never reads it; the build overlays it. Shape:

```jsonc
{
  "_comment": "Verified scores the feed hasn't published. The build ALWAYS prefers the live feed, so each entry becomes a no-op once the feed catches up. Match keys must equal the feed's date+team1+team2 EXACTLY, including placeholder names.",
  "matches": [
    { "round":"Round of 16", "date":"2026-07-06", "team1":"W83", "team2":"W84",
      "score":{ "ft":[0,1] },
      "source":"Portugal 0-1 Spain, Merino 90+1' — FIFA.com/ESPN/Al Jazeera" },
    { "round":"Round of 16", "date":"2026-07-06", "team1":"W81", "team2":"W82",
      "score":{ "ft":[1,4] },
      "source":"USA 1-4 Belgium — ESPN/CNN/NBC/Yahoo" }
  ]
}
```

**Match-key rule (critical):** `team1`/`team2` must be the *exact* strings in `worldcup-raw.json` for that fixture — **including placeholders** like `"W83"`. Put the real team names only in the human-readable `source`. Order must match the feed so goals line up. Support optional `et` and `p` (penalties) arrays in `score`.

### 10c) `manual-scores-util.js`
Overlay logic: index manual entries by `norm(date)|norm(team1)|norm(team2)` (lowercased, trimmed). When building, if a feed match lacks a full-time score but a manual entry matches its key, inject the manual `score`. If the feed already has a score, the feed **wins** (manual entry is ignored → auto-expires).

### 10d) `update-results.js` (the brain — exports a module)
Pure functions, no I/O:
- `PARTICIPANTS`, `TEAM_NAME_MAPPINGS`, `canonicalTeam`, `findParticipant`.
- `roundToStage(roundLabel)` → stage enum (`"round of 32"→ROUND_OF_32`, `"last 16"/"round of 16"→LAST_16`, `"quarter"→QUARTER_FINALS`, `"semi"→SEMI_FINALS`, `"third"/"3rd"→THIRD_PLACE`, `"final"→FINAL`, else `GROUP_STAGE`).
- `parseUtcDate(date,time)` — turns `"13:00 UTC-6"` etc. into an ISO string.
- `knockoutWinner(match)` — penalties > ET > FT.
- `resultScore(match)` — ET score if present else FT (this is the score that decides win/draw points).
- `computeResults(rawMatches)` → `{ points, goals }` implementing §4 exactly (base points on every played match; KO bonus to the advancing team).
- `computeEliminations(rawMatches)` → per player `{ progressed, eliminated, stage, stageRank, date, onPens }`. Once knockout fixtures exist, anyone who played group games but isn't in the knockouts is "out at group stage".
- `computeAwards(rawMatches, points, goals)` → the six awards in §6 (rustySpoon = fewest pts then worst GD; swissCheese = most conceded in one game; penaltyPain = first team out on pens; blankSheet = fewest goals; biggestDisappointment = highest FIFA-ranked team out earliest; unluckiest = most points without progressing). Include an approximate FIFA-ranking table for tie-breaks.
- Also compute `stats` (matchesPlayed, totalGoals, biggestWin, goldenBoot, champion) and `summaryText` (the most recent finished results, joined with `|`).
- `module.exports` everything the build needs.

### 10e) `build-results.js` (the orchestrator — does the I/O)
1. Read `worldcup-raw.json`; overlay `manual-scores.json` via the util → an effective match list with scores.
2. Map each raw match to the `results.json` **Match** shape (§7): resolve stage, ISO `utcDate`, `homeTeam`/`awayTeam` (keep placeholder names when unresolved), `score.fullTime`/`halfTime`, `penalties`, `status` (`FINISHED` iff a full-time score exists).
3. Call `computeResults` / `computeEliminations` / `computeAwards` / stats / summaryText.
4. **Safety guard:** refuse to overwrite a populated board with an all-zero one (if the new total points across all players is 0 but the existing `results.json` had >0, abort and keep the old file). This makes a bad fetch a no-op instead of a wipe.
5. Write `results.json` **atomically** (write temp file, then rename).
6. Append a daily snapshot via `history-util.js`.
Print a one-line summary, e.g. `"OK — 104 matches, 94 played. results.json updated."`

### 10f) `history-util.js` / `history.json`
Append `{ date, points: {name:pts} }` once per day (dedupe by date; keep last ~30). The site uses this only if you add a "race over time" chart (optional; see stretch goals).

---

## 11) The daily update job (how the board stays live)

This is a scheduled task run by an agent that **has web tools** (the Node sandbox does not). Steps:

1. **Refresh fixtures:** fetch the openfootball URL and save verbatim to `worldcup-raw.json` (valid JSON). Expect fixtures-only knockout data with placeholders — that's normal.
2. **Find REAL scores** (the step that keeps it live): from `worldcup-raw.json`, list every match on/before today lacking a full-time score. For those days, web-search final scores from reputable outlets (fifa.com, espn.com, olympics.com, theguardian.com, bbc.com, skysports.com, cbssports.com, nbcnews.com, apnews.com, reuters.com, aljazeera.com). **Cross-check each scoreline against ≥2 independent sources.** For each verified finished match, add/update an entry in `manual-scores.json` using the **exact feed key** (§10b). **Never fabricate** — if a played match can't be verified from ≥2 sources, skip it and say so.
3. **Rebuild:** run `node build-results.js` (no network needed).
4. **Verify:** `lastUpdated` is fresh; number of FINISHED matches equals games actually played; points/goals non-zero once games exist; `summaryText` lists recent results.
5. Only take "write" actions the task explicitly asks for. End with a one-line note of what changed (e.g. "2 new matches scored → 94 played total").

Guardrails: no API keys; if fetch/search fails or nothing new is verified, leave the previous `results.json` untouched (the build already guards this) and report the failure rather than guessing.

---

## 12) Website — information architecture (KNOCKOUT-FIRST hub)

Order top → bottom. The knockouts lead; the group-stage archive is tucked away.

1. **Sticky nav** — logo "KNOCKOUTS '26"; anchor links: Bracket, Predict, Leaderboard, Who's Alive, More; actions: "⭐ This is me", "🔗 Share". Hamburger on mobile.
2. **Hero** — cinematic broadcast panel: animated stadium light-beams (CSS), grain overlay, badge with tournament state, huge title "THE KNOCKOUTS", a live meta line ("Round of 16 · 6 of 8 played"), a **countdown to the next match**, and two CTAs ("View the bracket", "Predict the rest"). A **champion banner** appears once the Final is decided (confetti).
3. **On-Today strip** — today's knockout fixtures with **owned nations highlighted** and kickoff times; if none today, show "Next up". Shows `lastUpdated`.
4. **Interactive bracket** (centerpiece) — see §13.
5. **Predict-the-rest / What-if leaderboard** — see §14 (the signature feature).
6. **Leaderboard** (all 48) — Current ↔ Projected toggle; medals for top 3; "YOU" highlight; row click → player profile modal; "Share the table" (PNG).
7. **Who's still alive** — survival tracker with filters (Still in / All / Out), each row: flag, player, nation, status chip, next match, current points, and a **points ceiling** bar (max still achievable).
8. **More** (accordion, collapsed by default): Group tables (final), Hall of Shame (awards), The Draw (searchable/sortable 48 cards), Rules & pot, Every match (Results/Upcoming tabs).
9. **Footer**, **toast**, **you-bar** (sticky personal status once "This is me" is set), **back-to-top**, **modal root**.

---

## 13) Interactive bracket (spec)

- Columns per present round: Round of 32 → Last 16 → Quarter-finals → Semi-finals → Final → **Champion** node. Horizontal scroll on mobile; a round "segmented control" jumps/scrolls to a round.
- Each **match card** shows two team slots (flag, nation, **owner name**), the score (or kickoff time if unplayed), and highlights the **winner** (glow + check). Penalty results show "pens X–Y". Placeholder slots render friendly labels (§7).
- Clicking a match opens a **match-detail modal**: teams, owners, score, penalties, stage, date/venue if available, and both owners' current points.
- Connector lines between rounds (CSS pseudo-elements or an SVG layer) so it reads as a real bracket.
- A **Predict-mode toggle** turns undecided ties into pickers (see §14).

---

## 14) Predict-the-rest what-if engine (SIGNATURE FEATURE)

Behaviour:
- A **Predict-mode** toggle (mirrored in the bracket toolbar and the Predict section). When ON, every **undecided** knockout tie (both teams known but not yet played, OR reachable via prior picks) becomes clickable: tap a team to send them through. Their chip flows into the correct next-round slot (via the §8 feeder graph), which may itself unlock the next pick.
- A **projected leaderboard** updates live beside/below the bracket: each player's **baseline** = their real `results.json` points; add **+3 and the round bonus** for every tie you send their nation through. Show the **delta** vs current (e.g. `23 → 46 (+23)`) and re-rank.
- A **"your predicted champion"** callout; fire confetti when the Final pick is made.
- Buttons: **Reset picks**, and **Auto-fill by seed** (predict every remaining tie by the better FIFA seed, as a fun baseline).
- Picks persist in `localStorage` (key e.g. `sweepstake_predictions`) so a refresh keeps them; but they never touch `results.json`.

**Algorithm (precise):**

```
baseline[name] = results.points[name]           // do NOT recompute; trust the engine
proj[name]     = baseline[name]

// resolve teams round by round (89..104), using real winners where FINISHED,
// else the user's prediction, else leave TBD.
for num in [89..96, 97..100, 101,102, 104]:      // skip 103 (3rd place: no bonus)
    (a,b) = resolveSlots(num)                     // via feeder graph + winnerOfNum()
    if a and b known and match(num) NOT finished and prediction[num] set:
        w      = prediction[num]                  // 'a' or 'b'
        winner = (w==a? a : b)
        owner  = findParticipant(winner)
        if owner: proj[owner] += 3 + KNOCKOUT_BONUS[stageOf(num)]

// projected leaderboard = sort by proj desc, then goals desc, then name
```

Model note (state it in the UI): a prediction assumes a **win in normal/extra time** (so +3 + bonus). Real penalty draws are scored differently by the pipeline, but for a *prediction* the simple win model is intended and transparent. Already-finished matches always show their real result and their real points are already in the baseline — never double-count.

Edge cases: don't let a user pick a team that's already lost; when a pick upstream changes, invalidate downstream picks that depended on the replaced team; guard against a slot where only one side is known.

---

## 15) Visual design system — "Broadcast / Stadium premium"

Dark, cinematic, gold-and-neon "match night" feel. Big type, subtle motion, glows. CSS variables:

```css
:root{
  --bg:#070a14; --bg-2:#0c1120; --panel:#111827cc; --panel-solid:#121a2e;
  --line:#26304a; --line-soft:#1a2236;
  --text:#eef2fb; --text-dim:#9aa7c7; --text-mute:#66739a;
  --gold:#f5c518; --gold-2:#ffd95a;          /* trophy gold — primary accent */
  --neon:#37e6c0;                             /* pitch/neon cyan-green */
  --hot:#ff2d78;                              /* alert/live pink */
  --win:#4ade80; --out:#ef4767;
  --radius:16px; --radius-sm:10px;
  --shadow:0 20px 60px rgba(0,0,0,.5);
  --glow-gold:0 0 0 1px #f5c51833, 0 0 30px #f5c51826;
  --font-display:'Outfit',system-ui,sans-serif;
  --font-cond:'Oswald',system-ui,sans-serif;   /* scores/numbers */
  --font-body:'Inter',system-ui,sans-serif;
}
```

Rules of thumb:
- **Hero:** near-black gradient, 3–4 diagonal light-beams (`linear-gradient` + `blur` + slow `@keyframes` sweep), a faint grain layer (SVG/`radial-gradient`), gold title with a soft glow. Honor `prefers-reduced-motion` (freeze beams).
- **Bracket:** dark match cards with a 1px `--line` border; the advancing team gets a gold left-accent + subtle `--glow-gold`; scores in condensed `Oswald`. "Live/today" ties get a pulsing pink dot.
- **Leaderboard:** rank 1/2/3 get gold/silver/bronze accents; "YOU" row gets a neon left-border. Projected mode tints deltas green.
- **Buttons:** pill-shaped; primary = gold fill on dark text; ghost = 1px border. Clear `:focus-visible` ring.
- **Micro-motion:** cards lift on hover; number changes animate (count-up or flash); confetti only on champion/final pick.
- **Type scale:** hero title clamp(3rem, 9vw, 7rem); section titles ~2rem; keep body 15–16px.
- Maintain WCAG-AA contrast on text; test at 320/375/768/1280px.

---

## 16) Cross-cutting features

- **"This is me":** first click opens a searchable player picker (modal); selection saved to `localStorage` (`sweepstake_me`). Thereafter the user's row/nation is highlighted everywhere and a sticky **you-bar** shows their rank, points, and their team's next match.
- **Share:** "Share" copies the URL (with a toast). "Share the table" and player cards render a **PNG via canvas** (gradient card, flag, name, nation, points, goals) using `navigator.share` when available, else download.
- **Modal:** one modal root reused for match detail, player profile, and the player picker. Focus-trap, `Esc` to close, backdrop click closes, restore focus on close.
- **Countdown:** to the next non-finished match's `utcDate`; updates each second; shows "Kicking off" / "Live" states.
- **Toast:** transient messages ("🔄 Scores updated" when `lastUpdated` changes between polls).
- **Auto-refresh:** re-fetch `results.json?t=<timestamp>` every ~60s; diff `lastUpdated`; re-render without losing predictions/scroll.
- **Scroll-reveal** on sections (IntersectionObserver); **back-to-top** button after scrolling.
- Everything guarded: if `results.json` is missing/short, show empty states and keep the shell usable.

---

## 17) Verification & acceptance (do this — don't skip)

Because the Node sandbox has no browser, verify logic headlessly:

1. `node --check script.js && node --check build-results.js && node --check update-results.js` — must pass.
2. **Pipeline unit test (Node):** run `computeResults` on a fixture set and assert the sum of `points` matches a hand-worked example; assert a penalty tie gives 1 pt each + bonus to the pens winner; assert a third-place win gives +3 and no bonus.
3. **jsdom render test:** load `index.html`, stub `fetch('results.json')` to return the real file, run `script.js`, then assert:
   - the leaderboard renders **48 rows**, sorted correctly (the true leader is on top with the right total);
   - the bracket renders a column per present round and the correct number of match cards (R32 16, R16 8, …);
   - toggling Predict mode + choosing the **Final** winner increases that owner's projected total by **exactly +23** (3 + 20) and re-ranks;
   - "Reset picks" returns projected == current;
   - no uncaught exceptions; empty `results.json` yields empty states, not errors.
4. **Manual visual pass** (if a browser is available): screenshots at 375px and 1280px; check the bracket scrolls on mobile, winners glow, contrast is AA, and `prefers-reduced-motion` calms the hero.

**Acceptance checklist:**
- [ ] Site reads only `results.json`; nothing hand-edited.
- [ ] All 48 players appear in leaderboard, draw, and survival tracker.
- [ ] Scoring matches §4 exactly (verified in code, not by eye).
- [ ] Bracket shows real names for decided ties, friendly labels for undecided.
- [ ] Predictor flows winners forward and re-scores live; persists to `localStorage`; never mutates `results.json`.
- [ ] Broadcast theme applied; responsive 320→1280px; keyboard + screen-reader friendly.
- [ ] Graceful failure on bad/missing data.
- [ ] Daily job finds & verifies real scores (≥2 sources), rebuilds, never fabricates, never wipes.

---

## 18) Suggested build order

1. `update-results.js` (roster + scoring + helpers) → unit-test the scoring.
2. `manual-scores-util.js` + `build-results.js` → generate a first `results.json` from seed data.
3. `index.html` skeleton with all hooks/IDs → `script.js` data layer (`fetchResults`, `findParticipant`, state) → render leaderboard.
4. Bracket rendering (read-only) → then Predict-mode engine → projected leaderboard.
5. Survival tracker, accordion extras, personalization, sharing, modal, countdown.
6. `style.css` broadcast theme pass; responsive + reduced-motion.
7. Verification (§17); fix; ship.

---

## 19) Stretch goals (optional, nice)
- "Race over time" line chart from `history.json` (Chart.js via CDN, guarded).
- "Biggest climber since yesterday" callout from history deltas.
- Group-stage view auto-collapses once knockouts begin; a small "tournament progress" ring in the hero.
- Per-player "journey" timeline in the profile modal (every result their nation had + points earned).
- PWA installability (manifest + icons already listed); offline shell via a tiny service worker (cache the shell, always network-first for `results.json`).
- Shareable **predicted bracket** image.

---

### Golden rules (repeat)
1. **One source of truth** for the UI (`results.json`) and **one place** for scoring (`update-results.js`).
2. **Never fabricate** scores; verify against ≥2 sources; the daily job feeds `manual-scores.json` with **exact feed keys**.
3. The build **never** overwrites a good board with zeros and writes **atomically**.
4. The predictor uses `results.json` points as the **baseline** and only **adds** projected bonuses; it never edits saved data.
5. Degrade gracefully, always.
