'use strict';
(() => {
  // src/converters.ts
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
  var textBuilder = (parentElem, prefix) => {
    let text = '';
    for (const child of parentElem.children) {
      const elem = child;
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
          text += textBuilder(elem, '> ');
          break;
        }
        case 'DIV': {
          if (elem.classList.contains('cm-line')) {
            const line = textContentBuilder(elem);
            text += (line === '\n' ? '' : line) + '\n';
            break;
          }
          if (elem.dataset.componentType === 'code_block') {
            text += '```\n';
            text += textBuilder(elem, '');
            text += '```\n';
            break;
          }
          text += textBuilder(elem, '');
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
        // テーブルは未対応
        case 'TABLE': {
          break;
        }
        default: {
          console.warn('unsupported', elem);
          continue;
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
