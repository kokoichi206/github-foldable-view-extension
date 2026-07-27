# Development

## Commands

```sh
pnpm install
pnpm build        # tsc --noEmit && vite build → dist/
pnpm test         # unit tests for the fold range computation
pnpm e2e          # loads dist/ into a real Chrome and drives live GitHub pages
pnpm assets       # regenerates the PNGs from icons/icon.svg and store/promo-tile.html
```

`pnpm e2e` writes its screenshots to `docs/verify/` at 1280x800, one of the two
sizes the Chrome Web Store accepts, so the same files serve as the store
screenshots and as the images in the README.

## Loading the extension

1. `pnpm build`
2. Open `chrome://extensions`, enable Developer mode, choose "Load unpacked" and
   select `dist/`

## Releasing

`version` in `package.json` is the single source of truth. The manifest, the tag
and the zip name are all derived from it, and `release.yml` fails if the three
ever disagree.

1. Raise `version` in `package.json` and merge it into `main`
2. Run the `tag` workflow from the Actions tab

`tag` pushes the tag and calls `release`, which zips `dist/`, creates the GitHub
Release and publishes to the Chrome Web Store.

## Chrome Web Store

The publish action can only update an item that already exists, so the first
submission has to go through the developer dashboard by hand. That is where the
extension id is issued. The listing copy, the permission justification and the
data usage declaration all live in [`store/listing.md`](./store/listing.md).

Once the extension is live:

- Put the issued id in `CWS_EXTENSION_ID` in `.github/workflows/release.yml`.
  Until it is set, `release` fails with an explicit message rather than
  attempting to publish.
- Set `vars.CWS_PUBLISHER_ID` to the publisher id shown in the dashboard's
  Account section. It is an identifier rather than a credential, so it is a
  repository variable — masking it would make a failing publish call harder to
  diagnose.
- Set `secrets.GOOGLE_SA_KEY_JSON` to the JSON key of a service account that has
  the Chrome Web Store API enabled and whose `client_email` is registered in the
  dashboard's Account section. The setup steps are in the
  [chrome-webstore-publish](https://github.com/kokoichi206/chrome-webstore-publish)
  README.

## GitHub Pages

`docs/` is published by `pages.yml` on every push that touches it. It serves the
landing page and the privacy policy whose URL the store listing points at.
