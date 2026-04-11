# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Box Notes の編集画面で本文を Markdown に変換してダウンロードする Chrome 拡張 (Manifest V3)。対象ページは `https://notes.services.box.com/p/note?*`。

## バージョン管理

バージョン番号は [dist/manifest.json](dist/manifest.json) の `version` フィールドで管理する。
`package.json` の `version` は使用しないため、常に `0.0.0` のままにしておく。

## Commands

```bash
npm run compile   # TypeScript -> dist/ にコンパイル (tsc)
npm run lint      # ESLint (src/ を対象)
npm run format    # Prettier で src/ と tests/ の .ts/.js を整形
npm run build     # compile -> lint -> format を順次実行
```

```bash
npm test           # Vitest でテストを実行
npm run test:watch # ウォッチモードで実行
```

## Architecture

ソースは [src/](src/) 以下の2ファイル。型チェックは `tsc`、バンドルは `esbuild` が行い [dist/content-script.js](dist/content-script.js) として単一ファイルに出力される。

- [src/converters.ts](src/converters.ts) — Markdown 変換の純粋関数 (`textContentBuilder` / `listBuilder` / `textBuilder`) をエクスポート。テスト対象。
- [src/content-script.ts](src/content-script.ts) — DOM 操作・MutationObserver・ボタン登録。`converters.ts` の関数を使う。

Chrome 拡張のファイル構成:

- [dist/manifest.json](dist/manifest.json) — 拡張のエントリポイント。`dist/` 全体を Chrome に「パッケージ化されていない拡張機能」として読み込む。
- [dist/content-script.js](dist/content-script.js) — コンパイル済みスクリプト。`src/content-script.ts` から生成。
- [dist/images/download.svg](dist/images/download.svg) — ダウンロードボタンのアイコン。

### content-script の動作フロー

1. `MutationObserver` で `ul.menu_left` の出現を監視し、見つかった時点で `observer.disconnect()` してから `mainScript()` を呼ぶ。
2. `mainScript()` はメニューにセパレーターとダウンロードボタンを追加する。
3. ボタンクリック時:
   - `.pad:not(.hidden) .content-container` から本文 DOM を取得。
   - `textContentBuilder()` — インライン要素 (STRONG, EM, S, A, BR など) をテキストに変換する再帰関数。
   - `listBuilder()` — UL/OL/LI を Markdown リストに変換。ネスト深さをインデントで表現。
   - `textBuilder()` — ブロック要素 (P, H1-H3, BLOCKQUOTE, DIV[code_block], UL, OL, HR, TABLE) を走査してテキストを組み立てる再帰関数。
   - `.pad:not(.hidden) .document-title` からファイル名を取得し `.md` として `Blob` ダウンロード。

### 注意点

- TABLE 要素は `tbody > tr > td` を走査し、GFM テーブル形式で出力する。1行目をヘッダーとして扱い区切り行を挿入。`.content-container` の直接の子は `DIV.table-wrapper` であり、既存の DIV 再帰処理を経由して TABLE ケースに到達する。`colspan` / `rowspan` は 2D グリッド展開で対応済み。結合セルの後続は空セルで補完する。セル内に複数 P がある場合は `<br>` で区切って連結する。
- 複数の Box Notes タブを遷移すると `.pad` 要素が複数存在するため、`.pad:not(.hidden)` で現在表示中のものを選択している。
- コードブロックは `div[data-component-type="code_block"]` 内の `div.cm-line` を行単位で取得する構造。
- `collab-cursor-container` はコラボレーターのカーソル名称を含むため、テキスト変換時に除外している。

## Box Notes の DOM 構造 (2026-04 時点)

Box Notes 側の DOM が変更されたときの確認用に記録する。

### テキスト・段落

```html
<p spellcheck="true">
  <span data-author-id="209800292">本文テキスト</span>
</p>
```

`data-author-id` は著者 ID。複数著者が編集した箇所では SPAN が分割される。

### インライン装飾 (イタリック・取り消し線)

```html
<em><span data-author-id="209800292">イタリック</span></em>
<s><span data-author-id="209800292">取り消し線</span></s>
```

P 内で通常テキストの SPAN と混在する。`EM` → `*text*`、`S` → `~~text~~` に変換。

### 見出し (H1)

```html
<h1 id="g-...">
  <span data-author-id="...">見出しテキスト</span>
  <!-- 折りたたみ/アンカーボタンが表示状態によって出没する -->
</h1>
```

### UL/OL のネスト

LI の **兄弟要素** として子 UL/OL が並ぶ構造 (LI の子ではない)。

```html
<ul>
  <li><p><span data-author-id="...">項目1</span></p></li>
  <ul>
    <li><p><span data-author-id="...">項目1-1</span></p></li>
  </ul>
  <li><p><span data-author-id="...">項目2</span></p></li>
</ul>
```

### チェックリスト

```html
<ul class="check-list">
  <li class="check-list-item">            <!-- 未チェック -->
  <li class="check-list-item is-checked"> <!-- チェック済み -->
```

LI 内部は `SPAN.check-list-item-checkbox-container` (チェックボックス UI) と `SPAN.list-item-content > P` (テキスト) の2要素。`is-checked` クラスの有無で判定する。

### コードブロック

```html
<div data-component-type="code_block" class="react-node-view ...">
  <div class="codeblock-container">
    <div role="none">
      <div class="codeblock-topbar"> ... </div>  <!-- 言語選択・"..."ボタン -->
      <div class="codemirror-wrapper">
        <div class="cm-editor">
          <div class="cm-scroller">
            <div class="cm-gutters"> ... </div>  <!-- 行番号 -->
            <div class="cm-content">
              <div class="cm-line">コード1行目</div>
              <div class="cm-line"><br></div>     <!-- 空行 -->
              <div class="cm-line">コード3行目</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

空行は `<div class="cm-line"><br></div>`。`<br>` が `textContentBuilder` で `"\n"` になるため、cm-line 処理では `line === "\n"` のとき `""` として扱う (そうしないと改行が2行分になる)。

### BLOCKQUOTE

```html
<blockquote>
  <p><span data-author-id="...">引用1行目</span></p>
  <p><span data-author-id="...">引用2行目</span></p>
</blockquote>
```

直下は P のみ。

### テーブル

```html
<div class="table-wrapper notes-table-improvements-enabled" spellcheck="true">
  <table style="min-width: 420px;">
    <colgroup><col><col><col></colgroup>
    <tbody>
      <tr>
        <td><p><span data-author-id="209800292">1-1</span></p></td>
        <td><p><span data-author-id="209800292">1-2</span></p></td>
      </tr>
    </tbody>
  </table>
  <div class="table-sticky-scrollbar" style="display: none;"></div>
</div>
```

`<thead>` / `<th>` は存在せず、全セルが `<tbody>` 内の `<td>`。`.content-container` の直接の子は `DIV.table-wrapper` であり、TABLE 要素が直接来ることはない。`textBuilder` の DIV 再帰処理を経由して TABLE ケースに到達する。
