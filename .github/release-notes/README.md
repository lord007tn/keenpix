# Release notes

Each unified Keenpix release has one reviewed, versioned Markdown file named `vMAJOR.MINOR.PATCH.md` in this directory. This file is the complete source for the corresponding GitHub Release.

Use the following structure:

1. `# Keenpix vMAJOR.MINOR.PATCH`
2. `## Highlights`
3. `## Platform`
4. One `### \`@keenpix/name\`` section for each platform component with meaningful changes
5. `## Public packages`
6. One `### \`@keenpix/name\`` section for each public package with meaningful changes
7. `## Published components` followed by `{{version_matrix}}`
8. `## Upgrade notes`
9. `## Contributors`
10. A full-diff link

Within a component, group user-facing bullets under headings such as `#### Breaking changes`, `#### Features`, `#### Bug fixes`, `#### Improvements`, or `#### Maintenance`. Keep entries concise and include migration instructions immediately after any breaking change.

The release renderer supports `{{version}}`, `{{tag}}`, `{{previous_tag}}`, `{{compare_url}}`, and `{{version_matrix}}`. It verifies the title, required sections, changed-component names, duplicates, and unresolved placeholders before npm publication begins. The generated matrix lists every platform component and public package, including components without a meaningful user-facing change.

Do not generate the GitHub Release body from package history files. Release notes should be self-contained and useful without following another link.
