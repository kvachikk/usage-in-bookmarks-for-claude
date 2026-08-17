/**
 * Usage in Bookmarks for Claude
 *
 * Polls the claude.ai usage endpoint and writes the result into the title of a
 * bookmark on the bookmarks toolbar, which the extension creates and owns.
 *
 * Runs as a service worker in Chromium and as an event page in Firefox. Both
 * load it as an ES module, so this one file serves both browsers: every
 * listener below is registered at the top level, which is what lets a worker
 * that has been shut down come back on the next alarm.
 */

import { browser } from './lib/browser.js';
import { bookmarksBarId } from './lib/bookmarks-bar.js';
import {
  DEFAULT_SETTINGS,
  PLACEHOLDER_TITLE,
  FALLBACK_TITLE,
  formatTitle,
  normalizeSettings,
} from './lib/usage.js';

const ORIGIN = 'https://claude.ai';
const BOOKMARK_URL = `${ORIGIN}/settings/usage`;
const ALARM_NAME = 'poll';

const BADGE_ERROR = '#7f8c8d';
const BADGE_HIGH = '#c0392b';
const BADGE_MEDIUM = '#d68910';
const BADGE_LOW = '#2d6a4f';

// ── Settings ───────────────────────────────────────────────────────────────

const readSettings = async () => {
  const { settings } = await browser.storage.local.get('settings');
  return normalizeSettings(settings ?? DEFAULT_SETTINGS);
};

// ── Usage API ──────────────────────────────────────────────────────────────

const getOrgId = async () => {
  const { orgId } = await browser.storage.local.get('orgId');
  if (orgId) return orgId;

  const res = await fetch(`${ORIGIN}/api/organizations`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`organizations → HTTP ${res.status}`);

  const orgs = await res.json();
  const chat = orgs.find((org) => (org.capabilities || []).includes('chat'));
  const org = chat ?? orgs[0];
  if (!org) throw new Error('No organization found on this account');

  await browser.storage.local.set({ orgId: org.uuid });
  return org.uuid;
};

const fetchUsage = async () => {
  const request = (id) =>
    fetch(`${ORIGIN}/api/organizations/${id}/usage`, {
      credentials: 'include',
    });

  let res = await request(await getOrgId());

  // A cached org id can go stale — drop it and retry once.
  if (res.status === 403 || res.status === 404) {
    await browser.storage.local.remove('orgId');
    res = await request(await getOrgId());
  }

  if (res.status === 401) throw new Error('Not signed in to claude.ai');
  if (!res.ok) throw new Error(`usage → HTTP ${res.status}`);
  return res.json();
};

// ── Bookmark ───────────────────────────────────────────────────────────────

/** Returns the id of our bookmark, creating it on the toolbar if it is gone. */
const ensureBookmark = async () => {
  const { bookmarkId } = await browser.storage.local.get('bookmarkId');
  if (bookmarkId) {
    try {
      const [node] = await browser.bookmarks.get(bookmarkId);
      if (node) return node.id;
    } catch {
      // Deleted by the user — make a new one below.
    }
  }

  const created = await browser.bookmarks.create({
    parentId: await bookmarksBarId(),
    title: PLACEHOLDER_TITLE,
    url: BOOKMARK_URL,
  });
  await browser.storage.local.set({ bookmarkId: created.id });
  return created.id;
};

// ── Refresh loop ───────────────────────────────────────────────────────────

const setBadge = (text, color, title) => {
  browser.action.setBadgeText({ text });
  browser.action.setBadgeBackgroundColor({ color });
  browser.action.setTitle({ title });
};

const badgeColorFor = (percent) => {
  if (percent >= 90) return BADGE_HIGH;
  if (percent >= 70) return BADGE_MEDIUM;
  return BADGE_LOW;
};

const refresh = async () => {
  let id;
  try {
    id = await ensureBookmark();
  } catch (error) {
    console.warn('[usage-in-bookmarks]', error);
    setBadge('!', BADGE_ERROR, `Claude usage: ${error.message}`);
    return;
  }

  try {
    const [usage, settings] = await Promise.all([fetchUsage(), readSettings()]);
    await browser.bookmarks.update(id, { title: formatTitle(usage, settings) });

    const percent = Math.round(usage.five_hour?.utilization ?? 0);
    setBadge(
      String(percent),
      badgeColorFor(percent),
      `Claude: session ${percent}%`,
    );
  } catch (error) {
    console.warn('[usage-in-bookmarks]', error);
    setBadge('!', BADGE_ERROR, `Claude usage: ${error.message}`);
    await browser.bookmarks.update(id, { title: FALLBACK_TITLE });
  }
};

/** (Re)arms the poll timer. Browsers clamp periods below one minute. */
const scheduleAlarm = async () => {
  const { intervalMinutes } = await readSettings();
  await browser.alarms.clear(ALARM_NAME);
  browser.alarms.create(ALARM_NAME, {
    periodInMinutes: intervalMinutes,
    when: Date.now() + 500,
  });
};

// Changing the interval has to rebuild the alarm; every other setting only
// changes the next title, which the following tick picks up anyway.
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.settings) return;
  const before = changes.settings.oldValue?.intervalMinutes;
  const after = changes.settings.newValue?.intervalMinutes;
  if (before !== after) scheduleAlarm();
  else refresh();
});

browser.alarms.onAlarm.addListener(refresh);
browser.runtime.onInstalled.addListener(scheduleAlarm);
browser.runtime.onStartup.addListener(scheduleAlarm);
browser.action.onClicked.addListener(refresh);

scheduleAlarm();
