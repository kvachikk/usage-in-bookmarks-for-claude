'use strict';

/* global METRICS, DEFAULT_SETTINGS, formatTitle, normalizeSettings */

/** Stand-in response used only to render the preview. */
const SAMPLE_USAGE = {
  five_hour: { utilization: 42, resets_at: null },
  seven_day: { utilization: 61, resets_at: null },
  seven_day_opus: { utilization: 18, resets_at: null },
  seven_day_sonnet: { utilization: 55, resets_at: null },
  seven_day_oauth_apps: { utilization: 7, resets_at: null },
  seven_day_cowork: { utilization: 3, resets_at: null },
};

const SAMPLE_RESET_MS = 95 * 60000;

const list = document.getElementById('metrics');
const showReset = document.getElementById('show-reset');
const interval = document.getElementById('interval');
const preview = document.getElementById('preview');
const statusLine = document.getElementById('status');
const resetButton = document.getElementById('reset');

let statusTimer = null;

const say = (message) => {
  statusLine.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusLine.textContent = '';
  }, 1500);
};

const buildMetricRows = () => {
  for (const metric of METRICS) {
    const item = document.createElement('li');
    const label = document.createElement('label');
    label.className = 'row';

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.dataset.key = metric.key;

    const text = document.createElement('span');
    text.textContent = metric.name;

    label.append(box, text);
    item.append(label);
    list.append(item);
  }
};

/** Reads the form back into a settings object, keeping METRICS order. */
const collect = () => ({
  intervalMinutes: Number(interval.value),
  metrics: METRICS.map((metric) => metric.key).filter((key) => {
    const box = list.querySelector(`input[data-key="${key}"]`);
    return box.checked;
  }),
  showReset: showReset.checked,
});

const paintPreview = (settings) => {
  const sample = structuredClone(SAMPLE_USAGE);
  sample.five_hour.resets_at = new Date(
    Date.now() + SAMPLE_RESET_MS,
  ).toISOString();
  preview.textContent = formatTitle(sample, settings);
};

const apply = (settings) => {
  interval.value = String(settings.intervalMinutes);
  showReset.checked = settings.showReset;
  for (const box of list.querySelectorAll('input[data-key]')) {
    box.checked = settings.metrics.includes(box.dataset.key);
  }
  paintPreview(settings);
};

/**
 * Normalizing before saving means a rejected choice — clearing every metric,
 * an interval outside the range — is replaced rather than stored, and painting
 * the form back means the page shows what the background script will use.
 */
const save = async () => {
  const settings = normalizeSettings(collect());
  await browser.storage.local.set({ settings });
  apply(settings);
  say('Saved');
};

const load = async () => {
  const { settings } = await browser.storage.local.get('settings');
  apply(normalizeSettings(settings ?? DEFAULT_SETTINGS));
};

buildMetricRows();

document.addEventListener('change', save);
resetButton.addEventListener('click', async () => {
  apply(DEFAULT_SETTINGS);
  await browser.storage.local.set({ settings: DEFAULT_SETTINGS });
  say('Defaults restored');
});

load();
