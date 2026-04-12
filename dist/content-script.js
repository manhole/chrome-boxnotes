'use strict';
(() => {
  // src/converters.ts
  var LANG_INFO_STRING_MAP = {
    shell: 'sh',
    'c++': 'cpp',
    'c#': 'csharp',
  };
  var toInfoString = (langLabel) => {
    if (!langLabel || langLabel === 'Plain text') return '';
    const key = langLabel.toLowerCase();
    return LANG_INFO_STRING_MAP[key] ?? key;
  };
  var textContentBuilder = (node) => {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE: {
        if (node.tagName === 'DIV' && node.classList.contains('collab-cursor-container')) {
          return '';
        }
        if (node.tagName === 'BR' && !node.classList.contains('ProseMirror-trailingBreak')) {
          return '\n';
        }
        if (node.tagName === 'STRONG') {
          let text2 = '**';
          for (const child of node.childNodes) {
            text2 += textContentBuilder(child);
          }
          text2 += '**';
          return text2;
        }
        if (node.tagName === 'EM') {
          let text2 = '*';
          for (const child of node.childNodes) {
            text2 += textContentBuilder(child);
          }
          text2 += '*';
          return text2;
        }
        if (node.tagName === 'S') {
          let text2 = '~~';
          for (const child of node.childNodes) {
            text2 += textContentBuilder(child);
          }
          text2 += '~~';
          return text2;
        }
        if (node.tagName === 'CODE') {
          let text2 = '`';
          for (const child of node.childNodes) {
            text2 += textContentBuilder(child);
          }
          text2 += '`';
          return text2;
        }
        if (node.tagName === 'A') {
          const anchor = node;
          let text2 = '';
          for (const child of node.childNodes) {
            text2 += textContentBuilder(child);
          }
          if (text2 === anchor.href) {
            return text2;
          }
          return `[${text2}](${anchor.href})`;
        }
        let text = '';
        for (const child of node.childNodes) {
          text += textContentBuilder(child);
        }
        return text;
      }
      case Node.TEXT_NODE: {
        return node.textContent ?? '';
      }
    }
    return '';
  };
  var listBuilder = (parentElem, level) => {
    let text = '';
    for (const child of parentElem.children) {
      const elem = child;
      switch (elem.tagName) {
        case 'UL': {
          text += listBuilder(elem, level + 1);
          break;
        }
        case 'OL': {
          text += listBuilder(elem, level + 1);
          break;
        }
        case 'LI': {
          for (let i = 0; i < level; i++) {
            text += '  ';
          }
          if (parentElem.tagName === 'OL') {
            text += '1. ';
          } else {
            text += '- ';
          }
          if (elem.classList.contains('check-list-item')) {
            if (elem.classList.contains('is-checked')) {
              text += '[x] ';
            } else {
              text += '[ ] ';
            }
          }
          text += textContentBuilder(elem);
          text += '\n';
          break;
        }
      }
    }
    return text;
  };
  var textBuilder = (parentElem, prefix, separateBlocks = true) => {
    let text = '';
    let prevTag = '';
    for (const child of parentElem.children) {
      const elem = child;
      const prevLen = text.length;
      switch (elem.tagName) {
        case 'P': {
          text += prefix + textContentBuilder(elem);
          text += '\n';
          break;
        }
        case 'H1': {
          text += '# ' + textContentBuilder(elem);
          text += '\n';
          break;
        }
        case 'H2': {
          text += '## ' + textContentBuilder(elem);
          text += '\n';
          break;
        }
        case 'H3': {
          text += '### ' + textContentBuilder(elem);
          text += '\n';
          break;
        }
        // ブロック引用
        case 'BLOCKQUOTE': {
          text += textBuilder(elem, '> ', false);
          break;
        }
        case 'DIV': {
          if (elem.classList.contains('cm-line')) {
            const line = textContentBuilder(elem);
            text += (line === '\n' ? '' : line) + '\n';
            break;
          }
          if (elem.dataset.componentType === 'code_block') {
            const langLabel = elem.querySelector('.languages-dropdown-button .menu-toggle')?.textContent?.trim() ?? '';
            const lang = toInfoString(langLabel);
            text += '```' + lang + '\n';
            text += textBuilder(elem, '', false);
            text += '```\n';
            break;
          }
          text += textBuilder(elem, '', separateBlocks);
          break;
        }
        case 'UL': {
          text += listBuilder(elem, 0);
          break;
        }
        case 'OL': {
          text += listBuilder(elem, 0);
          break;
        }
        case 'HR': {
          text += '---';
          text += '\n';
          break;
        }
        // コードブロック右上の "..." 部分
        case 'BUTTON': {
          break;
        }
        case 'TABLE': {
          const tbody = elem.querySelector('tbody');
          if (!tbody) break;
          const cellContentBuilder = (td) => {
            const pChildren = Array.from(td.children).filter((c) => c.tagName === 'P');
            if (pChildren.length === 0) {
              return textContentBuilder(td);
            }
            return pChildren.map((p) => textContentBuilder(p)).join('<br>');
          };
          const pendingRowspan = [];
          const grid = [];
          for (const trChild of tbody.children) {
            const tr = trChild;
            if (tr.tagName !== 'TR') continue;
            const rowIndex = grid.length;
            grid.push([]);
            const occupiedCols = /* @__PURE__ */ new Set();
            for (let col = 0; col < pendingRowspan.length; col++) {
              const p = pendingRowspan[col];
              if (p != null) {
                grid[rowIndex][col] = p.value;
                occupiedCols.add(col);
                p.remaining -= 1;
                if (p.remaining === 0) {
                  pendingRowspan[col] = void 0;
                }
              }
            }
            let gridCol = 0;
            for (const tdChild of tr.children) {
              const td = tdChild;
              if (td.tagName !== 'TD') continue;
              while (occupiedCols.has(gridCol)) {
                gridCol++;
              }
              const colspan = td.colSpan;
              const rowspan = td.rowSpan;
              const value = cellContentBuilder(td);
              for (let c = 0; c < colspan; c++) {
                grid[rowIndex][gridCol + c] = c === 0 ? value : '';
              }
              if (rowspan > 1) {
                for (let c = 0; c < colspan; c++) {
                  pendingRowspan[gridCol + c] = { value: '', remaining: rowspan - 1 };
                }
              }
              gridCol += colspan;
            }
          }
          if (grid.length === 0) break;
          const colCount = Math.max(...grid.map((r) => r.length));
          const rows = grid.map((row) => Array.from({ length: colCount }, (_, i) => row[i] ?? ''));
          const toRow = (cells) => '| ' + cells.map((c) => c || ' ').join(' | ') + ' |';
          const separator = '| ' + Array(colCount).fill('---').join(' | ') + ' |';
          text += toRow(rows[0]) + '\n';
          text += separator + '\n';
          for (const row of rows.slice(1)) {
            text += toRow(row) + '\n';
          }
          break;
        }
        default: {
          console.warn('unsupported', elem);
          continue;
        }
      }
      if (text.length > prevLen) {
        const isEmptyP = elem.tagName === 'P' && text.length - prevLen === 1;
        if (!isEmptyP) {
          if (prevTag !== '' && prevTag !== elem.tagName && separateBlocks) {
            text = text.slice(0, prevLen) + '\n' + text.slice(prevLen);
          }
          prevTag = elem.tagName;
        }
      }
    }
    return text;
  };

  // src/content-script.ts
  var mainScript = (menuElem) => {
    const downloadText = (text, fileName) => {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.setAttribute('download', fileName);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };
    const appendSeparator = () => {
      const separator = document.createElement('li');
      separator.classList.add('separator');
      menuElem.appendChild(separator);
    };
    appendSeparator();
    {
      const button = document.createElement('button');
      button.title = 'Download body';
      button.addEventListener('click', async () => {
        const contentElem = document.querySelector('.pad:not(.hidden) .content-container');
        const text = textBuilder(contentElem, '');
        const title = document.querySelector('.pad:not(.hidden) .document-title');
        const titleText = title.textContent + '.md';
        downloadText(text, titleText);
      });
      const img = document.createElement('img');
      img.src = chrome.runtime.getURL('images/download.svg');
      img.style.cssText = 'width: 80%; height: 80%;';
      const span = document.createElement('span');
      span.classList.add('buttonicon');
      span.classList.add('buttonicon-svg');
      const li = document.createElement('li');
      span.appendChild(img);
      button.appendChild(span);
      li.appendChild(button);
      menuElem.appendChild(li);
    }
  };
  var observer = new MutationObserver(() => {
    const menuElem = document.querySelector('ul.menu_left');
    if (menuElem) {
      observer.disconnect();
      mainScript(menuElem);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, attributes: true });
})();
