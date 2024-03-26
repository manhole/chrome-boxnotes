'use strict';

// 画面上部のメニュー部
const menuElem = document.querySelector('ul.menu_left');

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
        const contentElem = document.querySelector('.content-container');
        const textContentBuilder = (node) => {
            switch (node.nodeType) {
                case Node.ELEMENT_NODE: {
                    // コラボレーターの名称がテキストに出力されないようにする
                    if (node.tagName === 'DIV' && node.classList.contains('collab-cursor-container')) {
                        return "";
                    }
                    let text = "";
                    for (const child of node.childNodes) {
                        text += textContentBuilder(child);
                    }
                    return text;
                }
                case Node.TEXT_NODE: {
                    return node.textContent;
                }
            }
            return "";
        };

        let text = "";

        const listBuilder = (subElem, level) => {
            for (const child of subElem.children) {
                switch (child.tagName) {
                    case 'UL': {
                        listBuilder(child, level + 1);
                        break;
                    }
                    case 'LI': {
                        for (let i = 0; i < level; i++) {
                            text += '  ';
                        }
                        text += '- ';
                        if (child.classList.contains('check-list-item')) {
                            if (child.classList.contains('is-checked')) {
                                text += '[x] ';
                            } else {
                                text += '[ ] ';
                            }
                        }
                        text += textContentBuilder(child);
                        text += '\n';
                        break;
                    }
                }
            }
        };

        let prefix = "";
        const textBuilder = (parentElem) => {
            for (const elem of parentElem.children) {
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
                        prefix = '> ';
                        // ブロック引用の子要素はPだけと思われる
                        textBuilder(elem);
                        prefix = '';
                        break;
                    }
                    case 'DIV': {
                        // コードブロックの1行
                        if (elem.classList.contains('cm-line')) {
                            text += textContentBuilder(elem);
                            text += '\n';
                            break;
                        }
                        // コードブロック
                        if (elem.dataset.componentType === 'code_block') {
                            text += '```\n';
                            textBuilder(elem);
                            text += '```\n';
                            break;
                        }
                        textBuilder(elem);
                        break;
                    }
                    case 'UL': {
                        listBuilder(elem, 0);
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
                        console.warn('unsuppoerted', elem);
                        continue;
                    }
                }
            }
        };
        textBuilder(contentElem);

        // console.log(text);
        const title = document.querySelector('.document-title');
        const titleText = title.textContent + '-body.md';
        downloadText(text, titleText);
    });

    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('images/download.svg');
    img.style = 'width: 80%; height: 80%;'

    const span = document.createElement('span');
    span.classList.add('buttonicon');
    span.classList.add('buttonicon-svg');

    const li = document.createElement('li');

    span.appendChild(img);
    button.appendChild(span);
    li.appendChild(button);
    menuElem.appendChild(li);
}
