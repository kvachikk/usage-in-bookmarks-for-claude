# Privacy Policy

**Usage in Bookmarks for Claude collects nothing and transmits nothing.**

That is the entire policy. The rest of this document explains how you can check
that claim yourself rather than taking it on trust.

## What is collected

Nothing. No personal data, no usage data, no crash reports, no identifiers, no
analytics, no advertising, no "anonymous statistics". The extension has no
server, no account, and no operator to send anything to.

## What leaves your device

One request, to `claude.ai`, on the interval you chose:

| Request                                              | Why                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `GET https://claude.ai/api/organizations`            | Find the organization id for your account. Cached after the first call. |
| `GET https://claude.ai/api/organizations/{id}/usage` | Read the usage percentages that go into the bookmark title.             |

These go to Anthropic's own servers, are authenticated by the `sessionKey`
cookie already in your browser, and carry nothing the Settings → Usage page in
claude.ai does not already send. No other host is ever contacted — the
extension holds a host permission for `https://claude.ai/*` and nothing else,
so it is not technically able to reach one.

## What is stored

On your device, through the WebExtension `storage.local` API:

- Your settings — which limits to show, whether to show the reset countdown,
  and the refresh interval.
- The id of the bookmark the extension created, so it renames that one and
  never touches another.
- The organization id returned by the API, so it does not have to be looked up
  on every tick.

The extension deliberately does **not** use `storage.sync`, because that would
copy the above through a Mozilla account. Uninstalling removes everything it
stored.

## Permissions

| Permission            | Why                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `bookmarks`           | Create one bookmark on the toolbar and rename it. No other bookmark is read or changed.   |
| `alarms`              | Wake up on the interval you chose. Firefox event pages cannot hold a timer any other way. |
| `storage`             | Remember your settings and the two ids above, on your device.                             |
| `https://claude.ai/*` | Read the usage endpoint. This is the only host the extension may contact.                 |

There is no content script, so the extension runs on no web page at all.

## How to verify this

1. **Read the manifest.** `src/manifest.json` is under fifty lines and lists
   every permission the extension can ever have.
2. **Run the privacy check.** `npm run lint:privacy` scans the source for
   `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `eval`,
   `storage.sync`, device-sensor APIs, analytics SDK names, and any URL
   pointing anywhere other than `claude.ai`. It also fails if the manifest
   grows a permission, a content script, or a data-collection declaration. It
   runs in CI on every commit.
3. **Read the shipped code.** There is no build step. The JavaScript inside the
   add-on is byte for byte the JavaScript in `src/`.
4. **Watch the network.** Open `about:debugging`, inspect the extension, and
   look at the Network tab. Only claude.ai appears.

## Third parties

There are none. No SDKs, no CDNs, no fonts, no remote resources of any kind.
All dependencies are development-time only and never reach your browser.

## Changes

Any change to this policy will appear in [CHANGELOG.md](CHANGELOG.md) and in
the Git history of this file.

## Contact

Open an issue at
<https://github.com/kvachikk/usage-in-bookmarks-for-claude/issues>.
