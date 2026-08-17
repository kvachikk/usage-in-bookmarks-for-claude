<img width="1428" height="474" alt="demo" src="https://github.com/user-attachments/assets/f35cf11b-e81b-4c6f-877f-26ee0237ef0b" />

# Usage in Bookmarks for Claude

A tiny browser extension that keeps your Claude.ai usage limits visible on the
bookmarks bar. It renames a bookmark it owns once a minute, so the number is
just _there_ — no tab to open, no page to refresh.

Runs on Chrome, Edge, Brave and the other Chromium browsers, and on Firefox.

Not affiliated with, endorsed by, or sponsored by Anthropic.

## Install

- **Chrome and other Chromium browsers** — _(Chrome Web Store link goes here
  once the listing is live.)_
- **Firefox** —
  [addons.mozilla.org](https://addons.mozilla.org/firefox/addon/usage-in-bookmarks-for-claude/)

Or build it yourself:

```bash
npm ci
npm run build          # writes dist/chrome/ and dist/firefox/
npm start              # opens a scratch Firefox with the extension loaded
npm run start:chrome   # the same, in Chromium
npm run package        # writes artifacts/{chrome,firefox}/*.zip
```

To try the source without packaging:

- **Chromium** — `chrome://extensions` → _Developer mode_ → _Load unpacked_ →
  pick `dist/chrome`.
- **Firefox** — `about:debugging#/runtime/this-firefox` → _Load Temporary
  Add-on_ → pick `dist/firefox/manifest.json`. Gone on restart.

Desktop only. The extension writes to the bookmarks bar, which the mobile
browsers do not show.

### Why there is a build step

`src/` holds plain ES modules that both browsers load as they are — nothing is
bundled, transpiled or minified. The only genuine difference between the two
builds is the manifest: Chromium wants a `service_worker`, Firefox wants
`scripts` plus its `browser_specific_settings` block. `npm run build` copies
the sources verbatim and drops the right manifest in beside them, so the code
you read here is the code that ships.

The one requirement is that you are signed in to claude.ai in the same browser.
On first run the extension adds its own bookmark to the bookmarks toolbar and
renames that one from then on — no setup, and none of your existing bookmarks
are touched.

## Settings

Open the extension's options page — `chrome://extensions` → _Details_ →
_Extension options_ in Chromium, `about:addons` → this extension →
_Preferences_ in Firefox — to choose:

- **Which limits to show.** Current session, all models over seven days, and
  the per-model windows. They appear in the order the page lists them, and a
  limit your account does not have is skipped rather than shown as zero.
- **Whether to show the reset countdown** next to the session number.
- **How often it refreshes**, from one to sixty minutes.

A preview at the bottom of the page shows the title your choices produce.

## How it works

`GET https://claude.ai/api/organizations/{orgId}/usage`, authenticated by the
`sessionKey` cookie you already have — the same endpoint the Settings → Usage
page reads from. The org id comes from `/api/organizations` and is cached in
`storage.local`, as is the bookmark id; both are re-resolved automatically if
they go stale.

An `alarms` timer drives the refresh. Clicking the toolbar icon forces one
immediately, and the icon's badge carries the session percentage.

The bookmark's id lives in `storage.local`. Delete the bookmark and a fresh one
appears on the next tick, so removing it for good means uninstalling the
extension.

The background script is one file for both browsers: Chromium runs it as an MV3
service worker, Firefox as an event page, and both load it as an ES module.
Every listener is registered at the top level, which is what lets a worker that
has been shut down come back on the next alarm.

## Caveats

The endpoint is **unofficial and undocumented** — Anthropic can change or
remove it without notice, and this extension will quietly show `—` if that
happens.

## Privacy

Nothing is collected and nothing is transmitted anywhere except claude.ai
itself. See [PRIVACY.md](PRIVACY.md), which CI enforces on every commit through
`npm run lint:privacy`.

## Development

```bash
npm ci
npm run lint && npm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
