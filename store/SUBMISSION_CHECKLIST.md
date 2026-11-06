# Web Store submission checklist

Run `npm run release` first: unit tests, e2e tests in real Chromium, build, and
fresh screenshots. Then:

- [ ] `dist/digital-rain-keyboard-v<version>.zip` uploaded (built by `npm run build`).
- [ ] Version is higher than the live listing (bump with `npm version patch|minor|major`;
      it updates manifest.json too).
- [ ] Listing text pasted from `store/STORE_LISTING.md`.
- [ ] Store icon, 3 screenshots, small + marquee promo tiles uploaded from `assets/store/`.
- [ ] Privacy policy **hosted at a public URL** and linked in the dashboard
      (e.g. a GitHub Gist or GitHub Pages copy of `store/PRIVACY_POLICY.md`).
- [ ] Privacy practices tab: single purpose, permission justifications, "no remote
      code", no data collected (all from `STORE_LISTING.md`).
- [ ] Load `dist/extension` unpacked once and type on a real site before submitting.
- [ ] Existing users: the store name changes from "Matrix Rain Keyboard"; their
      on/off setting carries over automatically.
