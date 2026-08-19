# Changesets

Run `pnpm changeset` for changes that affect a public `@keenpix/*` package or a platform app. The five platform apps, SDK, and framework package family are versioned together. Private platform apps are versioned without package-specific tags, and public packages override the default access with `publishConfig.access: public`.

Publishing happens only from a reviewed `vMAJOR.MINOR.PATCH` repository tag. That one tag publishes every public package at the matching version and creates one GitHub Release with notes grouped by component. Do not use package-specific tags or GitHub Releases.
