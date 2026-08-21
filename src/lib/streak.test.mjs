// Run with: node --test src/lib/streak.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak } from './streak.js';
import { localDateStr } from './dates.js';

// Fixed local "now" so results don't depend on when the test runs.
const NOW = new Date(2026, 7, 21, 9, 30); // Aug 21, 2026, 9:30am local
const daysAgo = (n) => {
  const d = new Date(2026, 7, 21);
  d.setDate(d.getDate() - n);
  return localDateStr(d);
};

test('logged yesterday only → 1 (grace day, no reset overnight)', () => {
  assert.equal(computeStreak([daysAgo(1)], NOW), 1);
});

test('logged today → includes today', () => {
  assert.equal(computeStreak([daysAgo(0)], NOW), 1);
  assert.equal(computeStreak([daysAgo(0), daysAgo(1), daysAgo(2)], NOW), 3);
});

test('most recent log 2+ days ago → 0', () => {
  assert.equal(computeStreak([daysAgo(2)], NOW), 0);
  assert.equal(computeStreak([daysAgo(2), daysAgo(3)], NOW), 0);
});

test('grace start still counts the run behind yesterday', () => {
  assert.equal(computeStreak([daysAgo(1), daysAgo(2), daysAgo(3)], NOW), 3);
});

test('gap inside the run stops the count', () => {
  assert.equal(computeStreak([daysAgo(0), daysAgo(2)], NOW), 1);
});

test('no logs → 0', () => {
  assert.equal(computeStreak([], NOW), 0);
});
