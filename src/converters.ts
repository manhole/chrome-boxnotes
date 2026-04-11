"use strict";

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

export const textBuilder = (parentElem: HTMLElement, prefix: string): string => {
  let text = "";
  for (const child of parentElem.children) {
    const elem = child as HTMLElement;
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
        text += textBuilder(elem, "> ");
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
          text += "```\n";
          text += textBuilder(elem, "");
          text += "```\n";
          break;
        }
        text += textBuilder(elem, "");
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
        const rows: string[][] = [];
        for (const trChild of tbody.children) {
          const tr = trChild as HTMLElement;
          if (tr.tagName !== "TR") continue;
          const cells: string[] = [];
          for (const tdChild of tr.children) {
            const td = tdChild as HTMLElement;
            if (td.tagName !== "TD") continue;
            cells.push(textContentBuilder(td));
          }
          rows.push(cells);
        }
        if (rows.length === 0) break;
        const colCount = Math.max(...rows.map((r) => r.length));
        const toRow = (cells: string[]) => "| " + cells.map((c) => c || " ").join(" | ") + " |";
        const separator = "| " + Array(colCount).fill("---").join(" | ") + " |";
        text += toRow(rows[0]) + "\n";
        text += separator + "\n";
        for (const row of rows.slice(1)) {
          text += toRow(row) + "\n";
        }
        text += "\n";
        break;
      }
      default: {
        console.warn("unsupported", elem);
        continue;
      }
    }
  }
  return text;
};
