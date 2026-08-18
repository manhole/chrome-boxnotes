# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Box Notes の編集画面で本文を Markdown に変換してダウンロードする Chrome 拡張 (Manifest V3)。対象ページは `https://notes.services.box.com/p/note?*`。

## バージョン管理

バージョン番号は [dist/manifest.json](dist/manifest.json) の `version` フィールドで管理する。
`package.json` の `version` は使用しないため、常に `0.0.0` のままにしておく。

バージョンを上げるときは、[CHANGELOG.md](CHANGELOG.md) と [CHANGELOG.ja.md](CHANGELOG.ja.md) の両方に該当バージョンのエントリを追加してから、バージョン番号と changelog をまとめて1つのコミットにすること。

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

## 開発方針

### TDD

新機能・バグ修正は TDD で進める。

1. 失敗するテストを書く (`npm test` で失敗することを確認)
2. テストが通る最小限の実装をする
3. `npm test` で全テストが通ることを確認
4. `npm run build` でビルドして完了

## コミットワークフロー

コミットメッセージは英語で書く。

`src/` 以下を変更したときは、コミット前に必ず `npm run build` を実行し、生成された `dist/content-script.js` もコミットに含めること。Chrome 拡張は `dist/` を直接読み込むため、ソースとビルド成果物が一致していないと動作しない。

手順:

1. `npm run build` を実行 (compile → lint → format)
2. `npm test` でテストが通ることを確認
3. `dist/content-script.js` を `git add` してコミットに含める

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
   - `.pad[data-active-state='active'] .content-container` から本文 DOM を取得。
   - `textContentBuilder()` — インライン要素 (STRONG, EM, S, CODE, A, BR など) をテキストに変換する再帰関数。
   - `listBuilder()` — UL/OL/LI を Markdown リストに変換。ネスト深さをインデントで表現。
   - `textBuilder()` — ブロック要素 (P, H1-H3, BLOCKQUOTE, コードブロック DIV, UL, OL, HR, TABLE) を走査してテキストを組み立てる再帰関数。第3引数 `separateBlocks` で異種ブロック間の空行挿入を制御 (BLOCKQUOTE・コードブロック内部では `false`)。
   - `.pad[data-active-state='active'] .editor-title-root input` の `value` からファイル名を取得し `.md` として `Blob` ダウンロード。

### 注意点

- TABLE 要素は `tbody > tr > td` を走査し、GFM テーブル形式で出力する。1行目をヘッダーとして扱い区切り行を挿入。`.content-container` の直接の子は `DIV.table-wrapper` であり、既存の DIV 再帰処理を経由して TABLE ケースに到達する。`colspan` / `rowspan` は 2D グリッド展開で対応済み。結合セルの後続は空セルで補完する。セル内に複数 P がある場合は `<br>` で区切って連結する。
- 複数の Box Notes タブを遷移すると `.pad` 要素が複数存在するため、`data-active-state="active"` 属性で現在表示中のものを選択している。
- コードブロックは `div.codeblock-container-card` (旧: `div[data-component-type="code_block"]`) 内の `div.cm-line` を行単位で取得する構造。旧構造の検出も後方互換のため残している。
- `collab-cursor-container` はコラボレーターのカーソル名称を含むため、テキスト変換時に除外している。

## Box Notes の DOM 構造 (2026-05 時点)

Box Notes 側の DOM が変更されたときの確認用に記録する。

### タイトル (2026-05 変更)

タイトルは `input[type=text]` の `value` 属性から取得する。旧 `.document-title` クラスは廃止。

```html
<div class="pad" data-active-state="active">
  <div class="pm-inner-container">
    <div class="innerdocbody">
      <div class="editor-title-root">
        <div class="ClientEditorTitle-module__editor-title-slot--...">
          <div class="...ClientEditorTitle-module__editor-title--...">
            <input type="text" value="ドキュメントタイトル">
          </div>
        </div>
      </div>
      ...
    </div>
  </div>
</div>
```

アクティブな `.pad` の判定は `data-active-state="active"` 属性で行う (旧: `.pad:not(.hidden)`)。

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

### インラインコード

```html
<code class="inline-code"><span data-author-id="209800292">hoge</span></code>
```

P 内で通常テキストの SPAN と混在する。`CODE` → `` `text` `` に変換。

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

### コードブロック (2026-08 変更)

`data-component-type="code_block"` 属性は廃止された。コードブロックの検出は `div.codeblock-container-card` クラスで行う (`data-testid="codeblock-container-card"` も付く)。

```html
<div class="react-node-view" contenteditable="false">
  <div data-testid="codeblock-container-card" data-codeblock-expand="open"
       class="bp_card_module_card--... codeblock-container-card" data-modern="true">
    <div class="codeblock-topbar">
      <div class="code-block-language-menu-combobox">
        <button data-testid="code-block-languages-dropdown-button" type="button">
          <span class="">プレーンテキスト</span>  <!-- 言語名 -->
          <span class="..."><svg>...</svg></span>  <!-- ドロップダウン矢印アイコン -->
        </button>
      </div>
      <div class="codeblock-topbar__actions"> ... </div>  <!-- コピー・"..."ボタン -->
    </div>
    <div data-testid="codemirror-wrapper" class="codeblock-codemirror-wrapper">
      <div class="cm-editor">
        <div class="cm-announced"></div>
        <div class="cm-scroller">
          <div class="cm-gutters"> ... </div>  <!-- 行番号 (cm-gutterElement) -->
          <div class="cm-content">
            <div class="cm-line">コード1行目</div>
            <div class="cm-line"><br></div>     <!-- 空行 -->
            <div class="cm-line">コード3行目</div>
          </div>
          <div class="cm-layer ..."> ... </div>  <!-- カーソルレイヤー -->
        </div>
      </div>
    </div>
  </div>
</div>
```

空行は `<div class="cm-line"><br></div>`。`<br>` が `textContentBuilder` で `"\n"` になるため、cm-line 処理では `line === "\n"` のとき `""` として扱う (そうしないと改行が2行分になる)。

言語名は `button[data-testid="code-block-languages-dropdown-button"]` の textContent から取得する (旧: `.languages-dropdown-button .menu-toggle`)。プレーンテキストの表示名は UI 言語でローカライズされる (日本語 UI では `"プレーンテキスト"`、英語 UI では `"Plain text"`) ため、既知の表記を `PLAIN_TEXT_LABELS` に列挙して info string なしとして扱う。それ以外の言語名 (`"SQL"`, `"Java"`, `"C++"` など) はローカライズされず、小文字化 + `LANG_INFO_STRING_MAP` の変換で `` ```sql ``, `` ```java ``, `` ```cpp `` のように出力する。

`data-codeblock-expand` 属性が追加されており、コードブロックに折りたたみ状態が存在する可能性がある (折りたたみ時の DOM は未確認)。

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

通常は `<thead>` / `<th>` は存在せず、全セルが `<tbody>` 内の `<td>`。ただし「行見出しを設定」すると1行目のセルが `<th>` になる (下記参照)。`.content-container` の直接の子は `DIV.table-wrapper` であり、TABLE 要素が直接来ることはない。`textBuilder` の DIV 再帰処理を経由して TABLE ケースに到達する。

「行見出しを設定」した場合の構造:

```html
<tbody>
  <tr>
    <th><div class="align-center"><p><span data-author-id="...">見出し</span></p></div></th>
  </tr>
  <tr>
    <td><p><span data-author-id="...">セル</span></p></td>
  </tr>
</tbody>
```

`<th>` の直下は `<div class="align-center">` であり、`<p>` は孫要素になる点に注意。
