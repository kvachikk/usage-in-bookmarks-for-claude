# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased][unreleased]

## [1.5.0][] - 2026-08-03

First release submitted to addons.mozilla.org. The extension was renamed from
"Claude Usage in Bookmarks" so the listing cannot be read as an official
Anthropic product, and what used to be edited by hand at the top of
`background.js` is now a settings page.

### Added

- Settings page: which limits appear in the bookmark title and in what order,
  whether the session reset countdown is shown, and a refresh interval from one
  to sixty minutes. A live preview renders the resulting title.
- `data_collection_permissions: { required: ["none"] }` in the manifest, so the
  absence of data collection is machine-checkable rather than merely
  documented.
- Toolbar badge carrying the session percentage, coloured by how close the
  limit is.
- Privacy check that fails the build on any network API, dynamic-code API,
  synced storage, sensor API, analytics name, or URL outside `claude.ai`, and
  on any manifest permission beyond the four the extension declares. It runs in
  CI on every commit.
- Unit tests for title formatting, the reset countdown, and settings
  normalization, run by `node --test`.
- Linting with `eslint-config-metarhia` and Prettier, commit-message linting,
  Git hooks, Dependabot, and CI running all of it plus `web-ext lint`.
- CONTRIBUTING, SECURITY and PRIVACY documents.

### Changed

- Extension id is now `usage-in-bookmarks-for-claude@kvachikk.github.io`.
  Anyone who loaded the old temporary add-on gets a separate entry rather than
  an upgrade, and should remove the old one.
- Source moved into `src/`, with pure helpers split into `src/lib/usage.js` so
  they can be tested outside a browser.
- Minimum Firefox raised to 140, the first version that understands the data
  collection consent key.
- A metric whose value is not a number is skipped rather than rendered as `0%`.
- The refresh interval is clamped into range on read, so a settings object
  edited by hand cannot leave the alarm unarmed.

### Notes

- The usage endpoint is unofficial and undocumented. If Anthropic changes it,
  the bookmark falls back to `—` rather than showing a stale number.

[unreleased]:
  https://github.com/kvachikk/usage-in-bookmarks-for-claude/compare/v1.5.0...HEAD
[1.5.0]:
  https://github.com/kvachikk/usage-in-bookmarks-for-claude/releases/tag/v1.5.0
