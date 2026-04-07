# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Box Notes の編集画面で本文を Markdown に変換してダウンロードする Chrome 拡張 (Manifest V3)。対象ページは `https://notes.services.box.com/p/note?*`。

## Commands

```bash
npm run compile   # TypeScript -> dist/ にコンパイル (tsc)
npm run lint      # ESLint (src/ を対象)
npm run format    # Prettier で src/ と tests/ の .ts/.js を整形
npm run build     # compile -> lint -> format を順次実行
```

テストは現在 `package.json` の `test` スクリプトが未設定 (スタブのみ)。

## Architecture

ソースは [src/content-script.ts](src/content-script.ts) 1 ファイルのみ。`tsc` で [dist/content-script.js](dist/content-script.js) に直接出力される (バンドラなし)。

Chrome 拡張のファイル構成:

- [dist/manifest.json](dist/manifest.json) — 拡張のエントリポイント。`dist/` 全体を Chrome に「パッケージ化されていない拡張機能」として読み込む。
- [dist/content-script.js](dist/content-script.js) — コンパイル済みスクリプト。`src/content-script.ts` から生成。
- [dist/images/download.svg](dist/images/download.svg) — ダウンロードボタンのアイコン。

### content-script の動作フロー

1. `MutationObserver` で `ul.menu_left` の出現を監視し、見つかった時点で `observer.disconnect()` してから `mainScript()` を呼ぶ。
2. `mainScript()` はメニューにセパレーターとダウンロードボタンを追加する。
3. ボタンクリック時:
   - `.pad:not(.hidden) .content-container` から本文 DOM を取得。
   - `textContentBuilder()` — インライン要素 (STRONG, A, BR など) をテキストに変換する再帰関数。
   - `listBuilder()` — UL/OL/LI を Markdown リストに変換。ネスト深さをインデントで表現。
   - `textBuilder()` — ブロック要素 (P, H1-H3, BLOCKQUOTE, DIV[code_block], UL, OL, HR) を走査してテキストを組み立てる再帰関数。
   - `.pad:not(.hidden) .document-title` からファイル名を取得し `.md` として `Blob` ダウンロード。

### 注意点

- TABLE 要素は `textBuilder` 内で無視されている (未対応。README の既知の制約を参照)。
- 複数の Box Notes タブを遷移すると `.pad` 要素が複数存在するため、`.pad:not(.hidden)` で現在表示中のものを選択している。
- コードブロックは `div[data-component-type="code_block"]` 内の `div.cm-line` を行単位で取得する構造。
- `collab-cursor-container` はコラボレーターのカーソル名称を含むため、テキスト変換時に除外している。
