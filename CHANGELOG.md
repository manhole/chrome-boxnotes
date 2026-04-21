# Changelog

## 0.11.0

- Adapted to Box Notes toolbar DOM changes (selector changed from `ul.menu_left` to `ul[role='toolbar']`)
- Moved download button to the right of the "Insert image or file" button
- Updated download icon to an outline style matching existing toolbar buttons

## 0.10.1

- Normalized code block language labels into info strings (e.g. `Plain Text` → no info string)

## 0.10.0

- Added support for code block language info strings (e.g. ` ```sql `, ` ```java `). `Plain text` is output without an info string

## 0.9.0

- Added support for inline code (CODE) conversion to Markdown (`` `text` ``)

## 0.8.0

- Insert blank lines between different block elements (headings, lists, blockquotes, code blocks, tables, HR) for CommonMark compatibility
- No blank lines between same-kind blocks (P-P) or inside BLOCKQUOTE / code blocks

## 0.7.0

- Added support for italic (EM) conversion to Markdown (`*text*`)
- Added support for strikethrough (S) conversion to Markdown (`~~text~~`)

## 0.6.0

- Added support for `colspan` and `rowspan` in tables. Merged cells are padded with empty cells to maintain column count
- Multiple paragraphs within a cell are joined with `<br>`

## 0.5.0

- Added support for GFM table output (first row treated as header; `colspan` / `rowspan` not yet supported)

## 0.4.1

- Fixed a bug where blank lines inside code blocks were emitted as two newlines

## 0.4.0

- Changed menu detection to use MutationObserver to handle changes in page load timing

## 0.3.0

- Added support for HR (horizontal rule) Markdown output
- Development tooling: TypeScript, ESLint, Prettier

## 0.2.8

- Added support for OL (ordered list) Markdown output

## 0.2.7

- Changed download file name to use the document title

## 0.2.6

- Added support for link (A) Markdown output

## 0.2.5

- Fixed missing blank lines in some cases

## 0.2.4

- Added support for bold (STRONG) Markdown output

## 0.2.3

- Fixed an issue where the wrong note was targeted when multiple Box Notes tabs were open

## 0.2.2

- Internal improvement: removed references to variables outside scope

## 0.2.1

- Excluded collaborator cursor names from text output

## 0.2.0

- Added support for checklist items as Markdown ([ ] / [x])

## 0.1.0

- Initial release: convert Box Notes body to Markdown and download
