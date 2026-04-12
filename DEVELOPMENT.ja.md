[English](DEVELOPMENT.md) | [日本語](DEVELOPMENT.ja.md)

# 開発ガイド

## コマンド

```bash
npm run compile    # 型チェックして dist/content-script.js にバンドル
npm run lint       # src/ に対して ESLint
npm run format     # src/ と tests/ に対して Prettier
npm run build      # compile -> lint -> format を順に実行

npm test           # Vitest を 1 回実行
npm run test:watch # Vitest をウォッチモードで実行
```

## バージョン管理

拡張のバージョンは [dist/manifest.json](dist/manifest.json) で管理します。`package.json` は意図的に `0.0.0` のまま放置し、バージョン管理には使いません。

## アーキテクチャ

ソースは [src/](src/) 以下の 2 ファイル構成です。`tsc` が型チェック、`esbuild` がバンドルを担当し、[dist/content-script.js](dist/content-script.js) として単一ファイルに出力されます。

- [src/converters.ts](src/converters.ts) — Markdown 変換の純粋関数 (`textContentBuilder` / `listBuilder` / `textBuilder`) を提供します。ユニットテストの対象です。
- [src/content-script.ts](src/content-script.ts) — DOM 監視、ボタン挿入、ダウンロード処理を担当します。`converters.ts` に依存します。

Chrome 拡張のファイル構成:

- [dist/manifest.json](dist/manifest.json) — Manifest V3 のエントリーポイント。`dist/` ディレクトリ全体を「パッケージ化されていない拡張機能」として読み込みます。
- [dist/content-script.js](dist/content-script.js) — バンドル済みのコンテンツスクリプト。`src/content-script.ts` から生成されます。
- [dist/images/download.svg](dist/images/download.svg) — ダウンロードボタンのアイコン。

### content-script の動作フロー

1. `MutationObserver` で `ul.menu_left` の出現を監視し、見つかった時点で `observer.disconnect()` してから `mainScript()` を呼びます。
2. `mainScript()` はメニューにセパレーターとダウンロードボタンを挿入します。
3. ボタンクリック時:
   - `.pad:not(.hidden) .content-container` から本文 DOM を取得します。
   - `textContentBuilder()` がインライン要素 (STRONG, EM, S, CODE, A, BR など) を再帰的に Markdown テキストへ変換します。
   - `listBuilder()` が UL/OL/LI を Markdown リストに変換し、ネスト深さをインデントで表現します。
   - `textBuilder()` がブロック要素 (P, H1〜H3, BLOCKQUOTE, DIV[code_block], UL, OL, HR, TABLE) を走査してテキストを組み立てます。第 3 引数 `separateBlocks` で異種ブロック間の空行挿入を制御します (BLOCKQUOTE やコードブロック内部では無効)。
   - `.pad:not(.hidden) .document-title` からファイル名を取得し、`Blob` 経由で `<タイトル>.md` としてダウンロードします。

### 実装上の注意点

- テーブルは `tbody > tr > td` を走査して GFM テーブル形式で出力します。1 行目をヘッダーとして扱い、その後ろに区切り行を挿入します。`colspan` / `rowspan` は 2D グリッド展開で対応しています。結合セルの後続は空セルで埋めます。セル内に複数の `<p>` がある場合は `<br>` で連結します。
- `.content-container` の直接の子は `DIV.table-wrapper` であり、TABLE 要素が直接来ることはありません。DIV の再帰処理を経由して TABLE ケースに到達します。
- 複数の Box Notes タブを開いていると `.pad` 要素が複数存在します。`.pad:not(.hidden)` で現在表示中のものを選択します。
- コードブロックは `div[data-component-type="code_block"]` 内の `div.cm-line` を行単位で読み取ります。空行は `<div class="cm-line"><br></div>` として表現されます。`textContentBuilder` が `<br>` を `"\n"` に変換するため、`cm-line` の内容が `"\n"` のみの場合は空文字として扱い、改行が 2 行分にならないようにしています。
- 言語ラベルは `.codeblock-topbar .languages-dropdown-button .menu-toggle` から取得します。`"Plain text"` は info string なしとして扱い、それ以外は小さなエイリアスマップ (`Shell → sh`, `C++ → cpp`, `C# → csharp`, ...) を経由したうえで、マップになければ `toLowerCase()` にフォールバックします。
- `collab-cursor-container` 要素はコラボレーターのカーソル名を含むため、出力から除外します。

## 手動確認チェックリスト

1. Box Notes のドキュメントを開きます (`https://notes.services.box.com/p/note?...`)。
2. 上部メニューにダウンロードボタンが表示されることを確認します。
3. ボタンをクリックし、ダウンロードされた `.md` に以下が正しく含まれていることを確認します:
   - ネストした UL/OL
   - チェックリストの状態 (`[ ]` / `[x]`)
   - コードブロック (言語指定あり/なし両方)
   - ブロック引用
   - テーブル (結合セルがある場合はそれも含めて)
