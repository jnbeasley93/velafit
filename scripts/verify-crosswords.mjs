// Usage:
//   node scripts/verify-crosswords.mjs                          # live file
//   node scripts/verify-crosswords.mjs scripts/new-puzzles-test.mjs
//
// Verifies the simplified 2-across / 1-down puzzle format:
//   - Across 1 at row 0, col 0, len 5
//   - Across 2 at row 4, col 0, len 5
//   - Down  1 at row 0, col 2, len 5  (crosses both)
//
// Checks for each puzzle:
//   - Declared length matches grid extraction
//   - No '#' inside an answer path
//   - Crossings agree: grid[0][2] is both across1[2] and down[0]
//                      grid[4][2] is both across2[2] and down[4]
//   - All three clues are present
//
// Does NOT check whether extracted letters spell a real English
// word — review the printout for semantic correctness.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

const argPath = process.argv[2] ?? 'src/data/crosswordPuzzles.js';
const absPath = path.resolve(process.cwd(), argPath);
const moduleUrl = pathToFileURL(absPath).href;

const { CROSSWORD_PUZZLES } = await import(moduleUrl);

function extractAcross(grid, row, col, len) {
  let word = '';
  for (let i = 0; i < len; i++) {
    const cell = grid[row]?.[col + i];
    word += cell === undefined ? '?' : cell;
  }
  return word;
}

function extractDown(grid, row, col, len) {
  let word = '';
  for (let i = 0; i < len; i++) {
    const cell = grid[row + i]?.[col];
    word += cell === undefined ? '?' : cell;
  }
  return word;
}

function flag(word, len) {
  if (word.length !== len) return '✗ (length)';
  if (word.includes('#')) return '✗ (hits #)';
  if (word.includes('?')) return '✗ (out of bounds)';
  return '';
}

console.log(`Verifying: ${argPath}`);
console.log(`Puzzles found: ${CROSSWORD_PUZZLES.length}\n`);

let total = 0;
let broken = 0;
const brokenEntries = [];

CROSSWORD_PUZZLES.forEach((p, idx) => {
  const num = idx + 1;
  console.log(`\n[${p.theme} ${p.difficulty} #${num}]`);

  const a1 = p.clues.across?.[1];
  const a2 = p.clues.across?.[2];
  const d1 = p.clues.down?.[1];

  if (!a1 || !a2 || !d1) {
    broken++;
    brokenEntries.push(`#${num}: missing clue (a1=${!!a1} a2=${!!a2} d1=${!!d1})`);
    console.log('  ✗ missing one of across.1 / across.2 / down.1');
    return;
  }

  const w1 = extractAcross(p.grid, a1.row, a1.col, a1.len);
  const w2 = extractAcross(p.grid, a2.row, a2.col, a2.len);
  const wd = extractDown(p.grid, d1.row, d1.col, d1.len);

  const s1 = flag(w1, a1.len);
  const s2 = flag(w2, a2.len);
  const sd = flag(wd, d1.len);

  total += 3;
  if (s1) { broken++; brokenEntries.push(`#${num} Across 1: ${w1} ${s1}`); }
  if (s2) { broken++; brokenEntries.push(`#${num} Across 2: ${w2} ${s2}`); }
  if (sd) { broken++; brokenEntries.push(`#${num} Down 1: ${wd} ${sd}`); }

  console.log(`Across 1 (len ${a1.len}): ${w1} — '${a1.clue}' ${s1}`);
  console.log(`Across 2 (len ${a2.len}): ${w2} — '${a2.clue}' ${s2}`);
  console.log(`Down 1   (len ${d1.len}): ${wd} — '${d1.clue}' ${sd}`);

  // Crossing consistency
  const topCross = p.grid[a1.row]?.[d1.col];
  const botCross = p.grid[a2.row]?.[d1.col];
  const downTop = wd[a1.row - d1.row];
  const downBot = wd[a2.row - d1.row];
  if (topCross !== downTop) {
    broken++;
    brokenEntries.push(`#${num}: top crossing mismatch grid[${a1.row}][${d1.col}]=${topCross} vs down[${a1.row - d1.row}]=${downTop}`);
    console.log(`  ✗ top crossing mismatch (${topCross} vs ${downTop})`);
  }
  if (botCross !== downBot) {
    broken++;
    brokenEntries.push(`#${num}: bottom crossing mismatch grid[${a2.row}][${d1.col}]=${botCross} vs down[${a2.row - d1.row}]=${downBot}`);
    console.log(`  ✗ bottom crossing mismatch (${botCross} vs ${downBot})`);
  }
});

console.log(
  `\n── Summary: ${broken} structural issues across ${CROSSWORD_PUZZLES.length} puzzles (${total} answers).`,
);
if (broken > 0) {
  console.log('\nBroken entries:');
  for (const e of brokenEntries) console.log('  ' + e);
  process.exit(1);
}
console.log('CLEAN ✓');
