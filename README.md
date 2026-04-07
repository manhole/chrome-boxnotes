# chrome-boxnotes

Box Notes の編集画面で本文を Markdown に変換してダウンロードする Chrome 拡張です。

## 機能

- Box Notes 画面のメニューにダウンロードボタンを追加
- 表示中ノート本文を Markdown に変換して `.md` として保存
- 対応要素
  - 見出し (H1-H3)
  - 段落
  - リンク
  - 太字
  - 箇条書き/番号付きリスト
  - チェックリスト
  - ブロック引用
  - コードブロック
  - 区切り線

## セットアップ

```bash
npm install
npm run compile
```

`dist/` を Chrome の「パッケージ化されていない拡張機能を読み込む」で指定してください。

## 開発コマンド

```bash
npm run compile   # TypeScript をコンパイルして dist/ に出力
npm run lint      # ESLint
npm run format    # Prettier で整形
npm run build     # compile → lint → format を順次実行
```

## 手動確認チェックリスト

1. Box Notes の対象ページを開く (`https://notes.services.box.com/p/note?...`)
2. 画面上部メニューにダウンロードボタンが表示される
3. ダウンロードした `.md` に以下が正しく出力される
   - ネストした UL/OL
   - チェックリスト状態 (`[ ]` / `[x]`)
   - コードブロック
   - 引用

## 既知の制約

- テーブルは未対応 (DOM は無視される)
- `colspan` / `rowspan` も未対応
- Box 側の DOM 変更により抽出ロジックが影響を受ける可能性あり
