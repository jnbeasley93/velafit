// ─────────────────────────────────────────────
// Sudoku library
// Deterministic generator + validator + daily puzzle
// ─────────────────────────────────────────────

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Same seed → same sequence, making daily puzzles deterministic.
 */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a string to a 32-bit integer seed.
 */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Shuffle an array using a seeded rng.
 */
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Deep clone a 9x9 board.
 */
function cloneBoard(board) {
  return board.map((row) => [...row]);
}

/**
 * Generates a complete valid 9x9 sudoku solution.
 * Uses a base pattern + randomized transformations for speed.
 *
 * @param {number} [seed] - Optional deterministic seed
 * @returns {number[][]} 9x9 board filled with 1-9
 */
export function generateSolution(seed) {
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 2 ** 32));

  // Base pattern — a known valid sudoku template
  const board = [];
  for (let i = 0; i < 9; i++) {
    const row = [];
    for (let j = 0; j < 9; j++) {
      row.push(((i * 3 + Math.floor(i / 3) + j) % 9) + 1);
    }
    board.push(row);
  }

  // 1. Permute digits 1..9
  const digitMap = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      board[i][j] = digitMap[board[i][j] - 1];
    }
  }

  // 2. Shuffle rows within each band (rows 0-2, 3-5, 6-8)
  for (let band = 0; band < 3; band++) {
    const rows = [band * 3, band * 3 + 1, band * 3 + 2];
    const shuffled = shuffle(rows, rng);
    const newRows = shuffled.map((r) => [...board[r]]);
    for (let k = 0; k < 3; k++) board[band * 3 + k] = newRows[k];
  }

  // 3. Shuffle columns within each stack (cols 0-2, 3-5, 6-8)
  for (let stack = 0; stack < 3; stack++) {
    const cols = [stack * 3, stack * 3 + 1, stack * 3 + 2];
    const shuffled = shuffle(cols, rng);
    for (let r = 0; r < 9; r++) {
      const row = board[r];
      const newVals = shuffled.map((c) => row[c]);
      for (let k = 0; k < 3; k++) row[stack * 3 + k] = newVals[k];
    }
  }

  // 4. Shuffle bands (row-groups of 3)
  const bandOrder = shuffle([0, 1, 2], rng);
  const newBoardByBand = [];
  for (const b of bandOrder) {
    for (let k = 0; k < 3; k++) newBoardByBand.push(board[b * 3 + k]);
  }
  for (let i = 0; i < 9; i++) board[i] = newBoardByBand[i];

  // 5. Shuffle stacks (col-groups of 3)
  const stackOrder = shuffle([0, 1, 2], rng);
  for (let r = 0; r < 9; r++) {
    const row = board[r];
    const newRow = new Array(9);
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const s = stackOrder[sIdx];
      for (let k = 0; k < 3; k++) newRow[sIdx * 3 + k] = row[s * 3 + k];
    }
    board[r] = newRow;
  }

  return board;
}

/**
 * Removes numbers from a complete solution to create a puzzle.
 * Removes cells symmetrically when possible for aesthetic balance.
 *
 * @param {number[][]} solution - Complete 9x9 solution
 * @param {'easy'|'medium'|'hard'} difficulty
 * @param {number} [seed] - Optional deterministic seed
 * @returns {number[][]} 9x9 puzzle with 0 for empty cells
 */
export function createPuzzle(solution, difficulty = 'medium', seed) {
  const clues = { easy: 35, medium: 28, hard: 22 }[difficulty] ?? 28;
  const cellsToRemove = 81 - clues;
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 2 ** 32));

  const puzzle = cloneBoard(solution);
  const positions = [];
  for (let i = 0; i < 81; i++) positions.push(i);
  const order = shuffle(positions, rng);

  let removed = 0;
  for (const pos of order) {
    if (removed >= cellsToRemove) break;
    const r = Math.floor(pos / 9);
    const c = pos % 9;
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      removed++;
    }
  }

  return puzzle;
}

/**
 * Checks if placing `num` at (row, col) violates sudoku rules.
 * Ignores the cell itself when checking.
 */
export function isValidPlacement(board, row, col, num) {
  if (num < 1 || num > 9) return false;

  // Row check
  for (let c = 0; c < 9; c++) {
    if (c !== col && board[row][c] === num) return false;
  }
  // Column check
  for (let r = 0; r < 9; r++) {
    if (r !== row && board[r][col] === num) return false;
  }
  // 3x3 box check
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && board[r][c] === num) return false;
    }
  }
  return true;
}

/**
 * Checks if a board is completely filled AND all placements are valid.
 */
export function isSolved(board) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = board[r][c];
      if (!val || val < 1 || val > 9) return false;
      if (!isValidPlacement(board, r, c, val)) return false;
    }
  }
  return true;
}

/**
 * Returns the deterministic daily puzzle for the given date string.
 * All users get the same puzzle for a given day.
 *
 * @param {string} [dateStr] - YYYY-MM-DD; defaults to today local
 * @returns {{ puzzle: number[][], solution: number[][], date: string, difficulty: string }}
 */
export function getDailyPuzzle(dateStr) {
  const d = dateStr || (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const seed = hashString('velafit-sudoku-' + d);
  const solution = generateSolution(seed);
  const puzzle = createPuzzle(solution, 'medium', seed);

  return { puzzle, solution, date: d, difficulty: 'medium' };
}
