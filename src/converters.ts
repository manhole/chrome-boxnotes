"use strict";

// Box Notes の言語ドロップダウン表示名 → Markdown info string。
// 小文字化しただけでは一般的なハイライタに認識されない言語のみ明示マッピングする。
const LANG_INFO_STRING_MAP: Record<string, string> = {
  shell: "sh",
  "c++": "cpp",
  "c#": "csharp",
};

const toInfoString = (langLabel: string): string => {
  if (!langLabel || langLabel === "Plain text") return "";
  const key = langLabel.toLowerCase();
  return LANG_INFO_STRING_MAP[key] ?? key;
};

export const textContentBuilder = (node: HTMLElement): string => {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE: {
      // コラボレーターの名称がテキストに出力されないようにする
      if (node.tagName === "DIV" && node.classList.contains("collab-cursor-container")) {
        return "";
      }
      // "ProseMirror-trailingBreak" は P 要素内の text が空のときに登場しているようだ。P 自体の改行と重複するので除く。
      if (node.tagName === "BR" && !node.classList.contains("ProseMirror-trailingBreak")) {
        return "\n";
      }
      if (node.tagName === "STRONG") {
        let text = "**";
        for (const child of node.childNodes) {
          text += textContentBuilder(child as HTMLElement);
        }
        text += "**";
        return text;
      }
      if (node.tagName === "EM") {
        let text = "*";
        for (const child of node.childNodes) {
          text += textContentBuilder(child as HTMLElement);
        }
        text += "*";
        return text;
      }
      if (node.tagName === "S") {
        let text = "~~";
        for (const child of node.childNodes) {
          text += textContentBuilder(child as HTMLElement);
        }
        text += "~~";
        return text;
      }
      if (node.tagName === "CODE") {
        let text = "`";
        for (const child of node.childNodes) {
          text += textContentBuilder(child as HTMLElement);
        }
        text += "`";
        return text;
      }
      if (node.tagName === "A") {
        const anchor = node as HTMLAnchorElement;
        let text = "";
        for (const child of node.childNodes) {
          text += textContentBuilder(child as HTMLElement);
        }
        // URLが本文にそのまま出現している場合は、わざわざmarkdownせず、URL文字列をそのまま出力する
        if (text === anchor.href) {
          return text;
        }
        return `[${text}](${anchor.href})`;
      }

      let text = "";
      for (const child of node.childNodes) {
        text += textContentBuilder(child as HTMLElement);
      }
      return text;
    }
    case Node.TEXT_NODE: {
      return node.textContent ?? "";
    }
  }
  return "";
};

export const listBuilder = (parentElem: HTMLElement, level: number): string => {
  let text = "";
  for (const child of parentElem.children) {
    const elem = child as HTMLElement;
    switch (elem.tagName) {
      case "UL": {
        text += listBuilder(elem, level + 1);
        break;
      }
      case "OL": {
        text += listBuilder(elem, level + 1);
        break;
      }
      case "LI": {
        for (let i = 0; i < level; i++) {
          text += "  ";
        }
        if (parentElem.tagName === "OL") {
          text += "1. ";
        } else {
          // UL しか来ないとは思うが...
          text += "- ";
        }
        if (elem.classList.contains("check-list-item")) {
          if (elem.classList.contains("is-checked")) {
            text += "[x] ";
          } else {
            text += "[ ] ";
          }
        }
        text += textContentBuilder(elem);
        text += "\n";
        break;
      }
    }
  }
  return text;
};

export const textBuilder = (parentElem: HTMLElement, prefix: string, separateBlocks = true): string => {
  let text = "";
  let prevTag = "";
  for (const child of parentElem.children) {
    const elem = child as HTMLElement;
    const prevLen = text.length;
    switch (elem.tagName) {
      case "P": {
        text += prefix + textContentBuilder(elem);
        text += "\n";
        break;
      }
      case "H1": {
        text += "# " + textContentBuilder(elem);
        text += "\n";
        break;
      }
      case "H2": {
        text += "## " + textContentBuilder(elem);
        text += "\n";
        break;
      }
      case "H3": {
        text += "### " + textContentBuilder(elem);
        text += "\n";
        break;
      }
      // ブロック引用
      case "BLOCKQUOTE": {
        // ブロック引用の子要素はPだけと思われる
        text += textBuilder(elem, "> ", false);
        break;
      }
      case "DIV": {
        // コードブロックの1行
        if (elem.classList.contains("cm-line")) {
          const line = textContentBuilder(elem);
          // <br> のみの空行は textContentBuilder が "\n" を返すため、
          // そのまま追加すると末尾の "\n" と合わさって2行分になってしまう。
          text += (line === "\n" ? "" : line) + "\n";
          break;
        }
        // コードブロック
        if (elem.dataset.componentType === "code_block") {
          // codeblock-topbar の languages-dropdown-button から言語名を取得し info string に正規化する。
          // "Plain text" は言語指定なし。それ以外は一般的な Markdown info string へマッピングする
          // (Linguist / highlight.js 互換)。マップにないものはフォールバックで小文字化する。
          const langLabel = elem.querySelector(".languages-dropdown-button .menu-toggle")?.textContent?.trim() ?? "";
          const lang = toInfoString(langLabel);
          text += "```" + lang + "\n";
          text += textBuilder(elem, "", false);
          text += "```\n";
          break;
        }
        text += textBuilder(elem, "", separateBlocks);
        break;
      }
      case "UL": {
        text += listBuilder(elem, 0);
        break;
      }
      case "OL": {
        text += listBuilder(elem, 0);
        break;
      }
      case "HR": {
        text += "---";
        text += "\n";
        break;
      }
      // コードブロック右上の "..." 部分
      case "BUTTON": {
        break;
      }
      case "TABLE": {
        const tbody = elem.querySelector("tbody");
        if (!tbody) break;
        // TD 専用テキスト化: 直接の子が P の場合は <br> で連結、それ以外は textContentBuilder に委譲
        const cellContentBuilder = (td: HTMLTableCellElement): string => {
          const pChildren = Array.from(td.children).filter((c) => c.tagName === "P");
          if (pChildren.length === 0) {
            return textContentBuilder(td);
          }
          return pChildren.map((p) => textContentBuilder(p as HTMLElement)).join("<br>");
        };
        // colspan/rowspan に対応した 2D グリッド展開
        type PendingCell = { value: string; remaining: number };
        const pendingRowspan: (PendingCell | undefined)[] = [];
        const grid: string[][] = [];
        for (const trChild of tbody.children) {
          const tr = trChild as HTMLElement;
          if (tr.tagName !== "TR") continue;
          const rowIndex = grid.length;
          grid.push([]);
          // Phase 1: pending セルを現在行に書き込み、remaining を -1 する
          // occupiedCols: この行で pending が占有している列の集合 (Phase 2 のスキップ判定に使う)
          const occupiedCols = new Set<number>();
          for (let col = 0; col < pendingRowspan.length; col++) {
            const p = pendingRowspan[col];
            if (p != null) {
              grid[rowIndex][col] = p.value;
              occupiedCols.add(col);
              p.remaining -= 1;
              if (p.remaining === 0) {
                pendingRowspan[col] = undefined;
              }
            }
          }
          // Phase 2: TD を走査してグリッドに配置
          let gridCol = 0;
          for (const tdChild of tr.children) {
            const td = tdChild as HTMLTableCellElement;
            if (td.tagName !== "TD") continue;
            // pending が占有している列をスキップ
            while (occupiedCols.has(gridCol)) {
              gridCol++;
            }
            const colspan = td.colSpan;
            const rowspan = td.rowSpan;
            const value = cellContentBuilder(td);
            // colspan 分だけ書き込む (先頭は value、以降は空)
            for (let c = 0; c < colspan; c++) {
              grid[rowIndex][gridCol + c] = c === 0 ? value : "";
            }
            // rowspan > 1 なら次行以降への引き継ぎを登録
            if (rowspan > 1) {
              for (let c = 0; c < colspan; c++) {
                pendingRowspan[gridCol + c] = { value: "", remaining: rowspan - 1 };
              }
            }
            gridCol += colspan;
          }
        }
        if (grid.length === 0) break;
        const colCount = Math.max(...grid.map((r) => r.length));
        const rows = grid.map((row) => Array.from({ length: colCount }, (_, i) => row[i] ?? ""));
        const toRow = (cells: string[]) => "| " + cells.map((c) => c || " ").join(" | ") + " |";
        const separator = "| " + Array(colCount).fill("---").join(" | ") + " |";
        text += toRow(rows[0]) + "\n";
        text += separator + "\n";
        for (const row of rows.slice(1)) {
          text += toRow(row) + "\n";
        }
        break;
      }
      default: {
        console.warn("unsupported", elem);
        continue;
      }
    }
    // 異種ブロック境界に空行を挿入 (同種ブロック間・空 P の前後は入れない)
    if (text.length > prevLen) {
      // 空 P (改行のみ) はユーザーが意図した空行なので、境界判定に関与させない
      const isEmptyP = elem.tagName === "P" && text.length - prevLen === 1;
      if (!isEmptyP) {
        if (prevTag !== "" && prevTag !== elem.tagName && separateBlocks) {
          text = text.slice(0, prevLen) + "\n" + text.slice(prevLen);
        }
        prevTag = elem.tagName;
      }
    }
  }
  return text;
};
