import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SETTINGS,
  FALLBACK_TITLE,
  timeLeft,
  formatTitle,
  normalizeSettings,
} from '../../src/lib/usage.js';

const NOW = Date.parse('2026-08-03T12:00:00Z');
const at = (minutes) => new Date(NOW + minutes * 60000).toISOString();

test('timeLeft drops the hour when there is less than one', () => {
  assert.equal(timeLeft(at(45), NOW), '45m');
});

test('timeLeft shows hours and minutes together', () => {
  assert.equal(timeLeft(at(155), NOW), '2h 35m');
});

test('timeLeft floors an elapsed window rather than going negative', () => {
  assert.equal(timeLeft(at(-10), NOW), '0m');
});

test('timeLeft falls back when the reset time is missing', () => {
  assert.equal(timeLeft(null, NOW), FALLBACK_TITLE);
});

test('formatTitle renders the default selection', () => {
  const usage = {
    five_hour: { utilization: 42.4, resets_at: at(90) },
    seven_day: { utilization: 61.5, resets_at: at(4000) },
    seven_day_opus: { utilization: 17.6, resets_at: at(4000) },
  };
  const title = formatTitle(usage, DEFAULT_SETTINGS, NOW);
  assert.equal(title, '42% · 1h 30m  7d 62%  op 18%');
});

test('formatTitle skips limits the account does not have', () => {
  const usage = { five_hour: { utilization: 5, resets_at: at(30) } };
  assert.equal(formatTitle(usage, DEFAULT_SETTINGS, NOW), '5% · 30m');
});

test('formatTitle honours the chosen order of metrics', () => {
  const usage = {
    five_hour: { utilization: 10, resets_at: at(30) },
    seven_day: { utilization: 20, resets_at: null },
  };
  const settings = { ...DEFAULT_SETTINGS, metrics: ['seven_day', 'five_hour'] };
  assert.equal(formatTitle(usage, settings, NOW), '7d 20%  10% · 30m');
});

test('formatTitle can leave the reset countdown out', () => {
  const usage = { five_hour: { utilization: 42, resets_at: at(90) } };
  const settings = { ...DEFAULT_SETTINGS, showReset: false };
  assert.equal(formatTitle(usage, settings, NOW), '42%');
});

test('formatTitle falls back when nothing could be rendered', () => {
  assert.equal(formatTitle({}, DEFAULT_SETTINGS, NOW), FALLBACK_TITLE);
  assert.equal(formatTitle(null, DEFAULT_SETTINGS, NOW), FALLBACK_TITLE);
});

test('formatTitle ignores a metric with no utilization number', () => {
  const usage = { five_hour: { resets_at: at(30) } };
  assert.equal(formatTitle(usage, DEFAULT_SETTINGS, NOW), FALLBACK_TITLE);
});

test('normalizeSettings repairs anything unusable', () => {
  assert.deepEqual(normalizeSettings(undefined), DEFAULT_SETTINGS);
  assert.deepEqual(normalizeSettings({ metrics: [] }), DEFAULT_SETTINGS);
  assert.equal(normalizeSettings({ intervalMinutes: 0 }).intervalMinutes, 1);
  assert.equal(normalizeSettings({ intervalMinutes: 900 }).intervalMinutes, 60);
  assert.equal(
    normalizeSettings({ intervalMinutes: '15' }).intervalMinutes,
    15,
  );
});

test('normalizeSettings drops metric keys it does not know', () => {
  const settings = normalizeSettings({ metrics: ['five_hour', 'made_up'] });
  assert.deepEqual(settings.metrics, ['five_hour']);
});
