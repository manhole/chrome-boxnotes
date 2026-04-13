[English](README.md) | [日本語](README.ja.md)

# chrome-boxnotes

A Chrome extension (Manifest V3) that converts the body of a Box Notes document to Markdown and downloads it as a `.md` file.

## Features

- Adds a download button to the Box Notes editor menu
- Converts the currently displayed note to Markdown and saves it as `<note title>.md`
- Supported elements:
  - Headings (H1–H3)
  - Paragraphs
  - Bold, italic, strikethrough
  - Inline code and code blocks (with language info strings: `sh`, `cpp`, `csharp`, etc.)
  - Links
  - Bulleted and numbered lists (nested)
  - Checklists (`[ ]` / `[x]`)
  - Block quotes
  - Horizontal rules
  - Tables in GFM format, including `colspan` / `rowspan`

## Installation

This extension is not published to the Chrome Web Store. Load it as an unpacked extension:

1. Clone this repository:
   ```bash
   git clone https://github.com/manhole/chrome-boxnotes.git
   ```
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `dist/` directory.

## Usage

1. Open a Box Notes document (`https://notes.services.box.com/p/note?...`).
2. A download button appears in the top menu of the editor.
3. Click it to download the note as `<note title>.md`.

## Limitations

- Relies on the current Box Notes DOM structure. Changes on the Box side may break extraction until the extension is updated.
- Images embedded in the note are not exported.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for build commands, architecture notes, and the manual verification checklist.

## License

MIT
