[English](DEVELOPMENT.md) | [日本語](DEVELOPMENT.ja.md)

# Development

## Commands

```bash
npm run compile    # Type-check and bundle to dist/content-script.js
npm run lint       # ESLint on src/
npm run format     # Prettier on src/ and tests/
npm run build      # compile -> lint -> format

npm test           # Run Vitest once
npm run test:watch # Run Vitest in watch mode
```

## Versioning

The extension version is managed in [dist/manifest.json](dist/manifest.json). `package.json` is kept at `0.0.0` on purpose and is not used for versioning.

## Architecture

The source lives under [src/](src/) and is split into two files. `tsc` type-checks and `esbuild` bundles the content script into [dist/content-script.js](dist/content-script.js).

- [src/converters.ts](src/converters.ts) — Pure Markdown conversion functions (`textContentBuilder`, `listBuilder`, `textBuilder`). These are the unit-test target.
- [src/content-script.ts](src/content-script.ts) — DOM observation, button injection, and download trigger. Depends on `converters.ts`.

Chrome extension layout:

- [dist/manifest.json](dist/manifest.json) — Manifest V3 entry point. The entire `dist/` directory is loaded as an unpacked extension.
- [dist/content-script.js](dist/content-script.js) — Bundled content script, built from `src/content-script.ts`.
- [dist/images/download.svg](dist/images/download.svg) — Download button icon.

### Content-script flow

1. A `MutationObserver` watches for `ul.menu_left` to appear. When found, it disconnects and calls `mainScript()`.
2. `mainScript()` injects a separator and a download button into the menu.
3. On button click:
   - Reads the body DOM from `.pad:not(.hidden) .content-container`.
   - `textContentBuilder()` recursively converts inline elements (STRONG, EM, S, CODE, A, BR, …) to Markdown text.
   - `listBuilder()` converts UL/OL/LI to Markdown lists, expressing nesting via indentation.
   - `textBuilder()` walks block elements (P, H1–H3, BLOCKQUOTE, DIV[code_block], UL, OL, HR, TABLE). Its third argument `separateBlocks` controls whether a blank line is inserted between different block kinds (disabled inside BLOCKQUOTE and code blocks).
   - Reads the file name from `.pad:not(.hidden) .document-title` and downloads the result as `<title>.md` via a `Blob`.

### Implementation notes

- Tables are walked as `tbody > tr > td` and emitted as GFM tables. The first row is treated as the header and the separator row is inserted after it. `colspan` / `rowspan` are handled by expanding cells onto a 2D grid; continuation cells of merged regions are emitted as empty. Cells with multiple `<p>` children are joined with `<br>`.
- The direct child of `.content-container` for tables is `DIV.table-wrapper`; the TABLE case is reached through the existing DIV recursion.
- When multiple Box Notes tabs are open, multiple `.pad` elements exist. `.pad:not(.hidden)` selects the currently visible one.
- Code blocks are read as `div[data-component-type="code_block"]` containing `div.cm-line` per line. A blank line is represented as `<div class="cm-line"><br></div>`. Because `textContentBuilder` turns `<br>` into `"\n"`, a `cm-line` whose content is exactly `"\n"` is treated as an empty string to avoid double newlines.
- The language label is read from `.codeblock-topbar .languages-dropdown-button .menu-toggle`. `"Plain text"` becomes an empty info string; other labels go through a small alias map (`Shell → sh`, `C++ → cpp`, `C# → csharp`, …) and fall back to `toLowerCase()`.
- `collab-cursor-container` elements contain collaborator cursor names and are excluded from the output.

## Manual verification checklist

1. Open a Box Notes document (`https://notes.services.box.com/p/note?...`).
2. Confirm that the download button appears in the top menu.
3. Click the button and confirm that the downloaded `.md` correctly includes:
   - Nested UL/OL
   - Checklist state (`[ ]` / `[x]`)
   - Code blocks (with and without language info strings)
   - Block quotes
   - Tables (including merged cells if present)
