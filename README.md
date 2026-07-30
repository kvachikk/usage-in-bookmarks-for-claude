# Claude Usage in Bookmarks

A tiny Firefox extension that keeps your Claude.ai usage limits visible on the bookmarks toolbar. It renames one of your bookmarks once a minute, so the number is just *there* — no tab to open, no page to refresh.

```
┌───────────────────────────────────────────────┐
│  6% · 4h 4m  7d 11%  op 5%    │ dev │ archive │
└───────────────────────────────────────────────┘
```

Session usage and time until reset, weekly usage, weekly Opus usage. The toolbar icon also carries a colour-coded badge (green → amber → red) with the session percentage.

## Install

Firefox only — the extension relies on the `bookmarks` API, and Chrome does not show bookmark titles the same way.

**Try it out** — go to `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on* → pick `manifest.json`. Gone on restart.

**Keep it** — pick one:

- **Self-sign via AMO.** Zip the folder, upload to [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) as an **unlisted** add-on. Free, nothing becomes public, you get a signed `.xpi` back that installs permanently in release Firefox.
- **Disable signature enforcement.** Set `xpinstall.signatures.required` to `false` in `about:config`. Only works on Developer Edition, Nightly, and ESR — release Firefox ignores the pref.

The only requirement is that you are signed in to claude.ai in the same browser. On first run the extension adds its own bookmark to the bookmarks toolbar and renames that one from then on — no setup, and none of your existing bookmarks are touched.

## Configure

Everything tunable sits at the top of `background.js`.

```js
const PERIOD_MINUTES = 1;   // Firefox clamps anything below 1

function formatTitle(u) {
  const parts = [];
  if (u.five_hour) {
    parts.push(`${Math.round(u.five_hour.utilization)}% · ${timeLeft(u.five_hour.resets_at)}`);
  }
  if (u.seven_day) parts.push(`7d ${Math.round(u.seven_day.utilization)}%`);
  if (u.seven_day_opus) parts.push(`op ${Math.round(u.seven_day_opus.utilization)}%`);
  return parts.join("  ");
}
```

`formatTitle` receives the raw API response, so shortening it to a bare `6%` is a one-liner. Fields available (each nullable, each shaped `{ utilization, resets_at }`):

`five_hour` · `seven_day` · `seven_day_sonnet` · `seven_day_opus` · `seven_day_oauth_apps` · `seven_day_cowork`

## How it works

`GET https://claude.ai/api/organizations/{orgId}/usage`, authenticated by the `sessionKey` cookie you already have — this is the same endpoint the Settings → Usage page reads from. The org id comes from `/api/organizations` and is cached in `storage.local`, as is the bookmark id; both are re-resolved automatically if they go stale.

A one-minute `alarms` timer drives the refresh. Clicking the toolbar icon forces one immediately.

The bookmark's id lives in `storage.local`. Delete the bookmark and a fresh one appears on the next tick, so removing it for good means uninstalling the extension.

## Caveats

The endpoint is **unofficial and undocumented** — Anthropic can change or remove it without notice, and this extension will quietly show `—` if that happens. Nothing here is affiliated with or endorsed by Anthropic.

Everything stays local. No servers, no telemetry, no account. The extension only ever talks to `claude.ai`.

## License

MIT
