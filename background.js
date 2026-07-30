/**
 * Claude Usage in Bookmarks
 *
 * Polls the claude.ai usage endpoint and writes the result into the title of a
 * bookmark on the bookmarks toolbar, which the extension creates and owns.
 */

// ── Configuration ──────────────────────────────────────────────────────────

/** Poll interval in minutes. Firefox silently clamps anything below 1. */
const PERIOD_MINUTES = 1;

const BOOKMARK_URL = "https://claude.ai/settings/usage";
const BOOKMARK_FOLDER_ID = "toolbar_____"; // Firefox's Bookmarks Toolbar

/** Title before the first successful poll, and after a failed one. */
const PLACEHOLDER_TITLE = "Claude usage";
const FALLBACK_TITLE = "—";

/**
 * Builds the bookmark title. Edit freely — the raw API response is passed in.
 *
 * Available fields (any of them may be null):
 *   five_hour, seven_day, seven_day_sonnet, seven_day_opus,
 *   seven_day_oauth_apps, seven_day_cowork
 * each shaped as { utilization: 17.0, resets_at: "2026-02-08T18:59:59Z" }
 *
 * Examples:
 *   minimal        →  return `${Math.round(u.five_hour.utilization)}%`;
 *   session only   →  return `${Math.round(u.five_hour.utilization)}% · ${timeLeft(u.five_hour.resets_at)}`;
 */
function formatTitle(u) {
  const parts = [];
  if (u.five_hour) {
    parts.push(`${Math.round(u.five_hour.utilization)}% · ${timeLeft(u.five_hour.resets_at)}`);
  }
  if (u.seven_day) parts.push(`7d ${Math.round(u.seven_day.utilization)}%`);
  if (u.seven_day_opus) parts.push(`op ${Math.round(u.seven_day_opus.utilization)}%`);
  return parts.join("  ");
}

// ── Usage API ──────────────────────────────────────────────────────────────

function timeLeft(iso) {
  if (!iso) return "—";
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${m}m`;
}

async function getOrgId() {
  const { orgId } = await browser.storage.local.get("orgId");
  if (orgId) return orgId;

  const res = await fetch("https://claude.ai/api/organizations", {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`organizations → HTTP ${res.status}`);

  const orgs = await res.json();
  const org = orgs.find((o) => (o.capabilities || []).includes("chat")) || orgs[0];
  if (!org) throw new Error("No organization found on this account");

  await browser.storage.local.set({ orgId: org.uuid });
  return org.uuid;
}

async function fetchUsage() {
  const request = (id) =>
    fetch(`https://claude.ai/api/organizations/${id}/usage`, {
      credentials: "include",
    });

  let res = await request(await getOrgId());

  // A cached org id can go stale — drop it and retry once.
  if (res.status === 403 || res.status === 404) {
    await browser.storage.local.remove("orgId");
    res = await request(await getOrgId());
  }

  if (res.status === 401) throw new Error("Not signed in to claude.ai");
  if (!res.ok) throw new Error(`usage → HTTP ${res.status}`);
  return res.json();
}

// ── Bookmark ───────────────────────────────────────────────────────────────

/** Returns the id of our bookmark, creating it on the toolbar if it isn't there. */
async function ensureBookmark() {
  const { bookmarkId } = await browser.storage.local.get("bookmarkId");
  if (bookmarkId) {
    try {
      const [node] = await browser.bookmarks.get(bookmarkId);
      if (node) return node.id;
    } catch {
      // Deleted by the user — make a new one below.
    }
  }

  const created = await browser.bookmarks.create({
    parentId: BOOKMARK_FOLDER_ID,
    title: PLACEHOLDER_TITLE,
    url: BOOKMARK_URL,
  });
  await browser.storage.local.set({ bookmarkId: created.id });
  return created.id;
}

// ── Refresh loop ───────────────────────────────────────────────────────────

function setBadge(text, color, title) {
  browser.action.setBadgeText({ text });
  browser.action.setBadgeBackgroundColor({ color });
  browser.action.setTitle({ title });
}

async function refresh() {
  let id;
  try {
    id = await ensureBookmark();
  } catch (err) {
    console.warn("[claude-usage]", err);
    setBadge("!", "#7f8c8d", `Claude usage: ${err.message}`);
    return;
  }

  try {
    const usage = await fetchUsage();
    await browser.bookmarks.update(id, { title: formatTitle(usage) });

    const pct = Math.round(usage.five_hour?.utilization ?? 0);
    setBadge(
      String(pct),
      pct >= 90 ? "#c0392b" : pct >= 70 ? "#d68910" : "#2d6a4f",
      `Claude: session ${pct}%`
    );
  } catch (err) {
    console.warn("[claude-usage]", err);
    setBadge("!", "#7f8c8d", `Claude usage: ${err.message}`);
    await browser.bookmarks.update(id, { title: FALLBACK_TITLE });
  }
}

browser.alarms.create("poll", {
  periodInMinutes: PERIOD_MINUTES,
  when: Date.now() + 500,
});
browser.alarms.onAlarm.addListener(refresh);
browser.runtime.onInstalled.addListener(refresh);
browser.runtime.onStartup.addListener(refresh);
browser.action.onClicked.addListener(refresh);
