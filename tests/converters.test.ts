import { describe, it, expect } from "vitest";
import { textContentBuilder, listBuilder, textBuilder } from "../src/converters";

// Box Notes の実際の DOM 構造に基づいてテスト用要素を組み立てるヘルパー
const el = (html: string): HTMLElement => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.firstElementChild as HTMLElement;
};

// テキストを持つ Box Notes の LI を生成するヘルパー
// 実構造: <li><p><span data-author-id="...">テキスト</span></p></li>
const boxLi = (text: string, classes = ""): string =>
  `<li${classes ? ` class="${classes}"` : ""}><p><span data-author-id="123">${text}</span></p></li>`;

// チェックリスト用 LI (実構造に合わせて checkbox-container と list-item-content を含む)
const checkLi = (text: string, checked: boolean): string => {
  const cls = checked ? "check-list-item is-checked" : "check-list-item";
  return `<li class="${cls}"><span class="check-list-item-checkbox-container" contenteditable="false"><input class="check-list-item-checkbox-input" type="checkbox"${checked ? ' checked="true"' : ""}><span class="check-list-item-checkbox"></span></span><span class="list-item-content"><p><span data-author-id="123">${text}</span></p></span></li>`;
};

// -------------------------------------------------------------------
// textContentBuilder
// -------------------------------------------------------------------
describe("textContentBuilder", () => {
  it("T-01: テキストノードを返す", () => {
    const node = document.createTextNode("hello");
    expect(textContentBuilder(node as unknown as HTMLElement)).toBe("hello");
  });

  it("T-02: SPAN[data-author-id] — Box Notes の実構造でテキストが取れる", () => {
    const span = el(`<span data-author-id="209800292">本文テキスト</span>`);
    expect(textContentBuilder(span)).toBe("本文テキスト");
  });

  it("T-03: STRONG → **bold**", () => {
    const strong = el(`<strong>bold</strong>`);
    expect(textContentBuilder(strong)).toBe("**bold**");
  });

  it("T-04: A タグ (テキスト≠href) → [text](url)", () => {
    const a = el(`<a href="https://example.com">link</a>`);
    // jsdom は href を正規化するため末尾スラッシュが付く
    expect(textContentBuilder(a)).toBe("[link](https://example.com/)");
  });

  it("T-05: A タグ (テキスト=href) → URL そのまま", () => {
    // jsdom は href を正規化する (末尾スラッシュ付き) ため、テキストも同じ正規化後の URL にする
    const a = el(`<a href="https://example.com/">https://example.com/</a>`);
    expect(textContentBuilder(a)).toBe("https://example.com/");
  });

  it("T-06: BR (通常) → 改行", () => {
    const br = el(`<br>`);
    expect(textContentBuilder(br)).toBe("\n");
  });

  it("T-07: BR.ProseMirror-trailingBreak → 空文字", () => {
    const br = el(`<br class="ProseMirror-trailingBreak">`);
    expect(textContentBuilder(br)).toBe("");
  });

  it("T-08: collab-cursor-container → 空文字", () => {
    const div = el(`<div class="collab-cursor-container">Alice</div>`);
    expect(textContentBuilder(div)).toBe("");
  });

  it("T-09: collab-cursor-container が混入しない", () => {
    // jsdom は <p> 直下の <div> を許容しないため親を <div> にする
    const div = document.createElement("div");
    div.innerHTML = `<span data-author-id="1">real</span><div class="collab-cursor-container">ghost</div><span data-author-id="1">text</span>`;
    expect(textContentBuilder(div)).toBe("realtext");
  });

  it("T-10: STRONG 内に A タグ (ネスト)", () => {
    const strong = el(`<strong><a href="https://x.com">x</a></strong>`);
    // jsdom は href を正規化するため末尾スラッシュが付く
    expect(textContentBuilder(strong)).toBe("**[x](https://x.com/)**");
  });

  it("T-11: 複数の子ノード混在", () => {
    const p = el(`<p>hello <strong>world</strong></p>`);
    expect(textContentBuilder(p)).toBe("hello **world**");
  });

  it("T-12: EM → *italic*", () => {
    const em = el(`<em><span data-author-id="209800292">イタリック</span></em>`);
    expect(textContentBuilder(em)).toBe("*イタリック*");
  });

  it("T-13: EM を含む P — 前後テキストとの混在", () => {
    const p = el(
      `<p><span data-author-id="209800292">あいうえお、</span><em><span data-author-id="209800292">イタリック</span></em><span data-author-id="209800292">、かきくけこ</span></p>`,
    );
    expect(textContentBuilder(p)).toBe("あいうえお、*イタリック*、かきくけこ");
  });

  it("T-14: S → ~~取り消し線~~", () => {
    const s = el(`<s><span data-author-id="209800292">取り消し線</span></s>`);
    expect(textContentBuilder(s)).toBe("~~取り消し線~~");
  });

  it("T-15: S を含む P — 前後テキストとの混在", () => {
    const p = el(
      `<p><span data-author-id="209800292">あいうえお、</span><s><span data-author-id="209800292">取り消し線</span></s><span data-author-id="209800292">、かきくけこ</span></p>`,
    );
    expect(textContentBuilder(p)).toBe("あいうえお、~~取り消し線~~、かきくけこ");
  });

  it("T-16: CODE → `inline code`", () => {
    const code = el(`<code class="inline-code"><span data-author-id="209800292">hoge</span></code>`);
    expect(textContentBuilder(code)).toBe("`hoge`");
  });

  it("T-17: CODE を含む P — 前後テキストとの混在", () => {
    const p = el(
      `<p><span data-author-id="209800292">変数名 </span><code class="inline-code"><span data-author-id="209800292">hoge</span></code><span data-author-id="209800292"> だよ。</span></p>`,
    );
    expect(textContentBuilder(p)).toBe("変数名 `hoge` だよ。");
  });
});

// -------------------------------------------------------------------
// listBuilder
// -------------------------------------------------------------------
describe("listBuilder", () => {
  it("L-01: UL 単一項目", () => {
    const ul = el(`<ul>${boxLi("項目")}</ul>`);
    expect(listBuilder(ul, 0)).toBe("- 項目\n");
  });

  it("L-02: OL 単一項目", () => {
    const ol = el(`<ol>${boxLi("項目")}</ol>`);
    expect(listBuilder(ol, 0)).toBe("1. 項目\n");
  });

  it("L-03: UL 複数項目", () => {
    const ul = el(`<ul>${boxLi("a")}${boxLi("b")}</ul>`);
    expect(listBuilder(ul, 0)).toBe("- a\n- b\n");
  });

  it("L-04: UL ネスト2階層 — 実際の DOM は LI の兄弟として UL が並ぶ構造", () => {
    const ul = el(`<ul>${boxLi("親")}<ul>${boxLi("子")}</ul></ul>`);
    expect(listBuilder(ul, 0)).toBe("- 親\n  - 子\n");
  });

  it("L-05: UL ネスト3階層", () => {
    const ul = el(`<ul>${boxLi("a")}<ul>${boxLi("b")}<ul>${boxLi("c")}</ul></ul></ul>`);
    expect(listBuilder(ul, 0)).toBe("- a\n  - b\n    - c\n");
  });

  it("L-06: OL ネスト2階層", () => {
    const ol = el(`<ol>${boxLi("親")}<ol>${boxLi("子")}</ol></ol>`);
    expect(listBuilder(ol, 0)).toBe("1. 親\n  1. 子\n");
  });

  it("L-07: チェックリスト OFF", () => {
    const ul = el(`<ul>${checkLi("todo", false)}</ul>`);
    expect(listBuilder(ul, 0)).toBe("- [ ] todo\n");
  });

  it("L-08: チェックリスト ON (is-checked)", () => {
    const ul = el(`<ul>${checkLi("done", true)}</ul>`);
    expect(listBuilder(ul, 0)).toBe("- [x] done\n");
  });

  it("L-09: チェックリスト ON/OFF 混在", () => {
    const ul = el(`<ul>${checkLi("a", true)}${checkLi("b", false)}</ul>`);
    expect(listBuilder(ul, 0)).toBe("- [x] a\n- [ ] b\n");
  });

  it("L-10: チェックリスト ネスト (実際の Box Notes 構造に基づく)", () => {
    const ul = el(
      `<ul class="check-list">${checkLi("親", false)}<ul class="check-list">${checkLi("子", true)}</ul></ul>`,
    );
    expect(listBuilder(ul, 0)).toBe("- [ ] 親\n  - [x] 子\n");
  });
});

// -------------------------------------------------------------------
// textBuilder
// -------------------------------------------------------------------
describe("textBuilder", () => {
  it("B-01: P → テキスト + 改行", () => {
    const div = document.createElement("div");
    div.innerHTML = `<p><span data-author-id="1">hello</span></p>`;
    expect(textBuilder(div, "")).toBe("hello\n");
  });

  it("B-02: P + prefix (blockquote 用)", () => {
    const div = document.createElement("div");
    div.innerHTML = `<p><span data-author-id="1">hello</span></p>`;
    expect(textBuilder(div, "> ")).toBe("> hello\n");
  });

  it("B-03: H1 → # 見出し", () => {
    const div = document.createElement("div");
    div.innerHTML = `<h1><span data-author-id="1">見出し1</span></h1>`;
    expect(textBuilder(div, "")).toBe("# 見出し1\n");
  });

  it("B-04: H2 → ## 見出し", () => {
    const div = document.createElement("div");
    div.innerHTML = `<h2><span data-author-id="1">見出し2</span></h2>`;
    expect(textBuilder(div, "")).toBe("## 見出し2\n");
  });

  it("B-05: H3 → ### 見出し", () => {
    const div = document.createElement("div");
    div.innerHTML = `<h3><span data-author-id="1">見出し3</span></h3>`;
    expect(textBuilder(div, "")).toBe("### 見出し3\n");
  });

  it("B-06: HR → ---", () => {
    const div = document.createElement("div");
    div.innerHTML = `<hr>`;
    expect(textBuilder(div, "")).toBe("---\n");
  });

  it("B-07: BLOCKQUOTE 内の複数 P", () => {
    const div = document.createElement("div");
    div.innerHTML = `<blockquote><p><span data-author-id="1">引用1行目</span></p><p><span data-author-id="1">引用2行目</span></p></blockquote>`;
    expect(textBuilder(div, "")).toBe("> 引用1行目\n> 引用2行目\n");
  });

  it("B-08: コードブロック 複数行 (空行なし)", () => {
    const div = document.createElement("div");
    div.innerHTML = `<div data-component-type="code_block"><div class="cm-content"><div class="cm-line">1行目</div><div class="cm-line">3行目</div></div></div>`;
    expect(textBuilder(div, "")).toBe("```\n1行目\n3行目\n```\n");
  });

  it("B-09: コードブロック 空行 — <br> のみの cm-line は1行分の改行になる", () => {
    const div = document.createElement("div");
    div.innerHTML = `<div data-component-type="code_block"><div class="cm-content"><div class="cm-line">1行目</div><div class="cm-line"><br></div><div class="cm-line">3行目</div></div></div>`;
    expect(textBuilder(div, "")).toBe("```\n1行目\n\n3行目\n```\n");
  });

  it("B-10: UL in textBuilder", () => {
    const div = document.createElement("div");
    div.innerHTML = `<ul>${boxLi("項目")}</ul>`;
    expect(textBuilder(div, "")).toBe("- 項目\n");
  });

  it("B-11: OL in textBuilder", () => {
    const div = document.createElement("div");
    div.innerHTML = `<ol>${boxLi("項目")}</ol>`;
    expect(textBuilder(div, "")).toBe("1. 項目\n");
  });

  it("B-12: TABLE (3行3列) → GFM テーブル出力 (1行目はヘッダー)", () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <table>
        <colgroup><col><col><col></colgroup>
        <tbody>
          <tr>
            <td><p><span data-author-id="209800292">1-1</span></p></td>
            <td><p><span data-author-id="209800292">1-2</span></p></td>
            <td><p><span data-author-id="209800292">1-3</span></p></td>
          </tr>
          <tr>
            <td><p><span data-author-id="209800292">2-1</span></p></td>
            <td><p><span data-author-id="209800292">2-2</span></p></td>
            <td><p><span data-author-id="209800292">2-3</span></p></td>
          </tr>
          <tr>
            <td><p><span data-author-id="209800292">3-1</span></p></td>
            <td><p><span data-author-id="209800292">3-2</span></p></td>
            <td><p><span data-author-id="209800292">3-3</span></p></td>
          </tr>
        </tbody>
      </table>`;
    expect(textBuilder(div, "")).toBe(
      "| 1-1 | 1-2 | 1-3 |\n" + "| --- | --- | --- |\n" + "| 2-1 | 2-2 | 2-3 |\n" + "| 3-1 | 3-2 | 3-3 |\n",
    );
  });

  it("B-12b: table-wrapper DIV 経由でも TABLE が GFM 形式で出力される", () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <div class="table-wrapper notes-table-improvements-enabled">
        <table>
          <tbody>
            <tr>
              <td><p><span data-author-id="1">A</span></p></td>
              <td><p><span data-author-id="1">B</span></p></td>
            </tr>
          </tbody>
        </table>
        <div class="table-sticky-scrollbar"></div>
      </div>`;
    expect(textBuilder(div, "")).toBe("| A | B |\n" + "| --- | --- |\n");
  });

  it("B-13: BUTTON → 無視", () => {
    const div = document.createElement("div");
    div.innerHTML = `<button>click</button>`;
    expect(textBuilder(div, "")).toBe("");
  });

  it("B-14: rowspan=2 (列0が2行にまたがる) — 後続行の列0は空セル", () => {
    const div = document.createElement("div");
    div.innerHTML = `<div class="table-wrapper notes-table-improvements-enabled scrollable" spellcheck="true"><table style="width: 420px;"><colgroup><col><col><col></colgroup><tbody><tr><td><p><span data-author-id="209800292">1-1</span></p></td><td><p><span data-author-id="209800292">1-2</span></p></td><td><p><span data-author-id="209800292">1-3</span></p></td></tr><tr><td rowspan="2"><p><span data-author-id="209800292">2-1</span></p><p><span data-author-id="209800292">3-1</span></p></td><td><p><span data-author-id="209800292">2-2</span></p></td><td><p><span data-author-id="209800292">2-3</span></p></td></tr><tr><td><p><span data-author-id="209800292">3-2</span></p></td><td><p><span data-author-id="209800292">3-3</span></p></td></tr></tbody></table></div>`;
    expect(textBuilder(div, "")).toBe(
      "| 1-1 | 1-2 | 1-3 |\n" + "| --- | --- | --- |\n" + "| 2-1<br>3-1 | 2-2 | 2-3 |\n" + "|   | 3-2 | 3-3 |\n",
    );
  });

  it("B-15: colspan=2 (行1の列1-2が結合) — 結合後の列は空セル", () => {
    const div = document.createElement("div");
    div.innerHTML = `<div class="table-wrapper notes-table-improvements-enabled" spellcheck="true"><table style="min-width: 420px;"><colgroup><col><col><col></colgroup><tbody><tr><td><p><span data-author-id="209800292">1-1</span></p></td><td><p><span data-author-id="209800292">1-2</span></p></td><td><p><span data-author-id="209800292">1-3</span></p></td></tr><tr><td><p><span data-author-id="209800292">2-1</span></p></td><td colspan="2"><p><span data-author-id="209800292">2-2</span></p><p><span data-author-id="209800292">2-3</span></p></td></tr><tr><td><p><span data-author-id="209800292">3-1</span></p></td><td><p><span data-author-id="209800292">3-2</span></p></td><td><p><span data-author-id="209800292">3-3</span></p></td></tr></tbody></table></div>`;
    expect(textBuilder(div, "")).toBe(
      "| 1-1 | 1-2 | 1-3 |\n" + "| --- | --- | --- |\n" + "| 2-1 | 2-2<br>2-3 |   |\n" + "| 3-1 | 3-2 | 3-3 |\n",
    );
  });
});

// -------------------------------------------------------------------
// 組み合わせテスト (実際の Box Notes HTML に近い構造)
// -------------------------------------------------------------------
describe("組み合わせ", () => {
  it("C-01: H1 + H2 + UL ネスト3階層", () => {
    const div = document.createElement("div");
    div.innerHTML = [
      `<h1><span data-author-id="1">見出し1</span></h1>`,
      `<h2><span data-author-id="1">見出し2</span></h2>`,
      `<ul>${boxLi("a")}<ul>${boxLi("b")}<ul>${boxLi("c")}</ul></ul></ul>`,
    ].join("");
    expect(textBuilder(div, "")).toBe("# 見出し1\n\n## 見出し2\n\n- a\n  - b\n    - c\n");
  });

  it("C-02: チェックリスト ON/OFF 混在 + ネスト (実際の Box Notes 構造)", () => {
    const div = document.createElement("div");
    div.innerHTML = `<ul class="check-list">
      ${checkLi("1", false)}
      <ul class="check-list">
        ${checkLi("1-1", false)}
        <ul class="check-list">${checkLi("1-1-1", true)}</ul>
        ${checkLi("1-2", true)}
      </ul>
      ${checkLi("2", false)}
    </ul>`;
    expect(textBuilder(div, "")).toBe("- [ ] 1\n  - [ ] 1-1\n    - [x] 1-1-1\n  - [x] 1-2\n- [ ] 2\n");
  });

  it("C-03: コードブロック (空行あり)", () => {
    const div = document.createElement("div");
    div.innerHTML = `<div data-component-type="code_block"><div class="cm-content"><div class="cm-line">コードブロック1行目</div><div class="cm-line"><br></div><div class="cm-line">コードブロック3行目</div></div></div>`;
    expect(textBuilder(div, "")).toBe("```\nコードブロック1行目\n\nコードブロック3行目\n```\n");
  });

  it("C-04: BLOCKQUOTE 3行", () => {
    const div = document.createElement("div");
    div.innerHTML = `<blockquote>
      <p><span data-author-id="1">引用1行目</span></p>
      <p><span data-author-id="1">引用2行目</span></p>
      <p><span data-author-id="1">引用3行目</span></p>
    </blockquote>`;
    expect(textBuilder(div, "")).toBe("> 引用1行目\n> 引用2行目\n> 引用3行目\n");
  });

  it("C-05: 空の P (ProseMirror-trailingBreak) → 空行", () => {
    const div = document.createElement("div");
    div.innerHTML = `<p><br class="ProseMirror-trailingBreak"></p>`;
    expect(textBuilder(div, "")).toBe("\n");
  });

  it("C-06: P + TABLE + P の混在", () => {
    const div = document.createElement("div");
    div.innerHTML = [
      `<p><span data-author-id="1">前段落</span></p>`,
      `<table><tbody>`,
      `<tr><td><p><span data-author-id="1">A</span></p></td><td><p><span data-author-id="1">B</span></p></td></tr>`,
      `<tr><td><p><span data-author-id="1">C</span></p></td><td><p><span data-author-id="1">D</span></p></td></tr>`,
      `</tbody></table>`,
      `<p><span data-author-id="1">後段落</span></p>`,
    ].join("");
    expect(textBuilder(div, "")).toBe("前段落\n" + "\n| A | B |\n" + "| --- | --- |\n" + "| C | D |\n" + "\n後段落\n");
  });

  it("C-07: 連続する P 要素間に空行が入らないこと", () => {
    const div = document.createElement("div");
    div.innerHTML = [
      `<p><span data-author-id="1">段落1</span></p>`,
      `<p><span data-author-id="1">段落2</span></p>`,
      `<p><span data-author-id="1">段落3</span></p>`,
    ].join("");
    expect(textBuilder(div, "")).toBe("段落1\n段落2\n段落3\n");
  });

  it("C-08: BLOCKQUOTE 前後に空行が入り、内部 P 間には入らない", () => {
    const div = document.createElement("div");
    div.innerHTML = [
      `<p><span data-author-id="1">前段落</span></p>`,
      `<blockquote><p><span data-author-id="1">引用1</span></p><p><span data-author-id="1">引用2</span></p></blockquote>`,
      `<p><span data-author-id="1">後段落</span></p>`,
    ].join("");
    expect(textBuilder(div, "")).toBe("前段落\n\n> 引用1\n> 引用2\n\n後段落\n");
  });

  it("C-09: H1 → P → UL の混在パターン", () => {
    const div = document.createElement("div");
    div.innerHTML = [
      `<h1><span data-author-id="1">見出し</span></h1>`,
      `<p><span data-author-id="1">段落</span></p>`,
      `<ul>${boxLi("項目")}</ul>`,
    ].join("");
    expect(textBuilder(div, "")).toBe("# 見出し\n\n段落\n\n- 項目\n");
  });

  it("C-10: UL → 空 P → UL — 空行が3つにならず1つだけ", () => {
    const div = document.createElement("div");
    div.innerHTML = [
      `<ul>${boxLi("項目1")}</ul>`,
      `<p><br class="ProseMirror-trailingBreak"></p>`,
      `<ul>${boxLi("項目2")}</ul>`,
    ].join("");
    expect(textBuilder(div, "")).toBe("- 項目1\n\n- 項目2\n");
  });
});
