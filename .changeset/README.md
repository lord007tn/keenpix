# Changesets

Run `pnpm changeset` for changes that affect a public `@keenpix/*` package or a platform app. The five platform apps, SDK, and framework package family are versioned together. Private platform apps are versioned without package-specific tags, and public packages override the default access with `publishConfig.access: public`.

Before tagging, author `.github/release-notes/vMAJOR.MINOR.PATCH.md` with highlights, semantic change categories for meaningfully changed components, the complete generated version matrix, upgrade guidance, and contributors. Publishing happens only from the reviewed repository tag. That one tag publishes every public package at the matching version through npm Trusted Publishing and creates one self-contained GitHub Release. The npm publisher must trust the `lord007tn/keenpix` repository's `release.yml` workflow; do not add a long-lived npm token to the workflow. Do not use package-specific tags or GitHub Releases.
