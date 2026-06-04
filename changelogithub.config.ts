// Config for `changelogithub` (run via `pnpm release:notes`).
// Builds GitHub release notes from Conventional Commits since the previous tag.
//
// Why this file exists:
// - changelogithub's built-in defaults only surface `feat`, `fix`, and `perf`,
//   so `refactor`, `ci`, `docs`, etc. were silently dropped from the notes
//   (e.g. v0.1.4 showed 1 of its 3 changes). The `types` map below opts every
//   meaningful Conventional Commit type into the changelog.
// - `contributors: false` keeps notes free of author/co-author attribution,
//   matching the hand-written v0.1.0–v0.1.3 notes (and changelogithub's bot
//   filter is hardcoded, so it cannot drop individual co-authors on its own).
//
// `chore` is intentionally omitted so the `chore(release): vX` tag commit does
// not appear in its own release notes.
export default {
  contributors: false,
  types: {
    feat: { title: "🚀 Features" },
    fix: { title: "🐞 Bug Fixes" },
    perf: { title: "🏎 Performance" },
    refactor: { title: "🛠 Refactors" },
    docs: { title: "📖 Documentation" },
    build: { title: "📦 Build" },
    types: { title: "🌊 Types" },
    test: { title: "✅ Tests" },
    style: { title: "🎨 Styles" },
    ci: { title: "🤖 CI" },
    revert: { title: "⏪ Reverts" },
  },
};
