/**
 * Pure helpers shared by the background script and the options page.
 *
 * Plain ES module: the same file is imported by the background script, by the
 * options page and by `node --test`, with no build step in between.
 */

/**
 * Every field the usage endpoint is known to return, in the order the options
 * page lists them. `label` is the prefix shown in the bookmark title; the
 * session window carries no prefix because it is the number people mean.
 */
export const METRICS = [
  { key: 'five_hour', label: '', name: 'Current session (5 hours)' },
  { key: 'seven_day', label: '7d', name: 'All models (7 days)' },
  { key: 'seven_day_opus', label: 'op', name: 'Opus (7 days)' },
  { key: 'seven_day_sonnet', label: 'so', name: 'Sonnet (7 days)' },
  {
    key: 'seven_day_oauth_apps',
    label: 'api',
    name: 'Connected apps (7 days)',
  },
  { key: 'seven_day_cowork', label: 'cw', name: 'Cowork (7 days)' },
];

export const DEFAULT_SETTINGS = {
  intervalMinutes: 1,
  metrics: ['five_hour', 'seven_day', 'seven_day_opus'],
  showReset: true,
  separator: '  ',
};

/** Title before the first successful poll. */
export const PLACEHOLDER_TITLE = 'Claude usage';

/** Title after a failed poll, so a stale number is never left on screen. */
export const FALLBACK_TITLE = '—';

const MINUTE = 60000;
const HOUR = 3600000;

/** Renders the time until `iso` as `2h 5m`, or `12m` under an hour. */
export const timeLeft = (iso, now = Date.now()) => {
  if (!iso) return FALLBACK_TITLE;
  const remaining = new Date(iso).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return '0m';
  const hours = Math.floor(remaining / HOUR);
  const minutes = Math.floor((remaining % HOUR) / MINUTE);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const labelFor = (key) => {
  const metric = METRICS.find((entry) => entry.key === key);
  return metric ? metric.label : '';
};

/**
 * Builds the bookmark title from a raw usage response. Metrics the account
 * does not have are skipped rather than rendered as zero, so a Pro account
 * does not advertise limits that do not apply to it.
 */
export const formatTitle = (
  usage,
  settings = DEFAULT_SETTINGS,
  now = Date.now(),
) => {
  const parts = [];
  for (const key of settings.metrics) {
    const metric = usage?.[key];
    if (!metric || typeof metric.utilization !== 'number') continue;
    const label = labelFor(key);
    const percent = `${Math.round(metric.utilization)}%`;
    const head = label ? `${label} ${percent}` : percent;
    const withReset =
      key === 'five_hour' && settings.showReset
        ? `${head} · ${timeLeft(metric.resets_at, now)}`
        : head;
    parts.push(withReset);
  }
  return parts.length ? parts.join(settings.separator) : FALLBACK_TITLE;
};

const clampInt = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

/** Drops unknown keys and out-of-range values read back out of storage. */
export const normalizeSettings = (stored) => {
  const source = stored && typeof stored === 'object' ? stored : {};
  const known = new Set(METRICS.map((entry) => entry.key));
  const metrics = Array.isArray(source.metrics)
    ? source.metrics.filter((key) => known.has(key))
    : DEFAULT_SETTINGS.metrics;
  return {
    intervalMinutes: clampInt(
      source.intervalMinutes,
      1,
      60,
      DEFAULT_SETTINGS.intervalMinutes,
    ),
    metrics: metrics.length ? metrics : DEFAULT_SETTINGS.metrics,
    showReset:
      typeof source.showReset === 'boolean'
        ? source.showReset
        : DEFAULT_SETTINGS.showReset,
    separator: DEFAULT_SETTINGS.separator,
  };
};
