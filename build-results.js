// ============================================================================
//  Builds results.json from a LOCAL copy of the openfootball data.
//  Used by the daily scheduled task: the data is fetched separately (the
//  sandbox has no internet), saved to worldcup-raw.json, then this script
//  turns it into the scoreboard. No network access needed here.
//
//  BOMBPROOF BY DESIGN:
//   - If the raw file is missing, empty, or not valid JSON  -> exit, keep old results.json
//   - If the data has no usable matches array               -> exit, keep old results.json
//   - If computation throws for any reason                  -> exit, keep old results.json
//   - Writes atomically (temp file + rename) so a crash mid-write can't corrupt results.json
//   - Refuses to replace a populated scoreboard with an empty one (guards against a feed glitch)
// ============================================================================
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const RAW_FILE = path.join(DIR, 'worldcup-raw.json');
const OUT_FILE = path.join(DIR, 'results.json');
const TMP_FILE = path.join(DIR, 'results.json.tmp');

function fail(msg) {
  console.error('build-results: ' + msg + ' — leaving existing results.json untouched.');
  process.exit(1);
}

// 1) Load the scoring logic (pure, no network).
let computeResults;
try {
  ({ computeResults } = require('./update-results.js'));
  if (typeof computeResults !== 'function') throw new Error('computeResults not exported');
} catch (e) {
  fail('could not load scoring logic from update-results.js (' + e.message + ')');
}

// 2) Read + parse the raw data defensively.
if (!fs.existsSync(RAW_FILE)) {
  fail('worldcup-raw.json not found. Fetch the openfootball data and save it there first.');
}
let raw;
try {
  const text = fs.readFileSync(RAW_FILE, 'utf8');
  if (!text || !text.trim()) fail('worldcup-raw.json is empty.');
  raw = JSON.parse(text);
} catch (e) {
  fail('worldcup-raw.json is not valid JSON (' + e.message + ').');
}
if (!raw || !Array.isArray(raw.matches)) {
  fail('worldcup-raw.json has no "matches" array.');
}

// 3) Compute the scoreboard.
let output;
try {
  output = computeResults(raw.matches);
} catch (e) {
  fail('scoring computation threw (' + e.message + ').');
}

// 4) Sanity-check the output before we touch the live file.
if (!output || typeof output.points !== 'object' || typeof output.goals !== 'object') {
  fail('computed output looks malformed.');
}

// 5) Guard: don't overwrite a populated scoreboard with an all-zero one.
//    (Protects against a one-off feed glitch that returns fixtures but no scores.)
const newHasPoints = Object.values(output.points).some(v => Number(v) > 0);
if (!newHasPoints && fs.existsSync(OUT_FILE)) {
  try {
    const prev = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    const prevHadPoints = prev && prev.points && Object.values(prev.points).some(v => Number(v) > 0);
    if (prevHadPoints) {
      fail('new data has zero points but the existing scoreboard has points — refusing to wipe it.');
    }
  } catch (_) { /* previous file unreadable; safe to proceed with the fresh write */ }
}

// 6) Write atomically: temp file first, then rename over the real file.
try {
  fs.writeFileSync(TMP_FILE, JSON.stringify(output, null, 2));
  fs.renameSync(TMP_FILE, OUT_FILE);
} catch (e) {
  try { if (fs.existsSync(TMP_FILE)) fs.unlinkSync(TMP_FILE); } catch (_) {}
  fail('failed writing results.json (' + e.message + ').');
}

const played = output.matches.filter(m => m.status === 'FINISHED').length;
console.log(`build-results: OK — ${output.matches.length} matches, ${played} played. results.json updated.`);

// 7) Optional: record a daily snapshot for the website's trend chart.
//    Wrapped so it can NEVER affect the core build above (results.json is
//    already written and confirmed at this point).
try {
  const n = require('./history-util').appendDailySnapshot(DIR, output);
  if (n) console.log(`build-results: history snapshot saved (${n} day${n === 1 ? '' : 's'} tracked).`);
} catch (e) {
  console.warn('build-results: history snapshot skipped (' + e.message + ').');
}
