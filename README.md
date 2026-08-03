<img width="1428" height="474" alt="demo" src="https://github.com/user-attachments/assets/f35cf11b-e81b-4c6f-877f-26ee0237ef0b" />

# Usage in Bookmarks for Claude

A tiny Firefox extension that keeps your Claude.ai usage limits visible on the
bookmarks toolbar. It renames a bookmark it owns once a minute, so the number is
just _there_ — no tab to open, no page to refresh.

Not affiliated with, endorsed by, or sponsored by Anthropic.

## Install

From [addons.mozilla.org](https://addons.mozilla.org/firefox/addon/usage-in-bookmarks-for-claude/),
or build it yourself:

```bash
npm ci
npm start          # opens a scratch Firefox with the extension loaded
npm run package    # writes artifacts/*.zip
```

To try the source without building, go to
`about:debugging#/runtime/this-firefox` → _Load Temporary Add-on_ → pick
`src/manifest.json`. Gone on restart.

Firefox on desktop only. The extension writes to the bookmarks toolbar, which
Firefox for Android does not show.

The one requirement is that you are signed in to claude.ai in the same browser.
On first run the extension adds its own bookmark to the bookmarks toolbar and
renames that one from then on — no setup, and none of your existing bookmarks
are touched.

## Settings

Open the add-on's preferences (`about:addons` → this extension →
_Preferences_) to choose:

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
