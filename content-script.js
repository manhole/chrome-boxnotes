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

{
    appendSeparator();
    const li = document.createElement('li');
    menuElem.appendChild(li);

    const button = document.createElement('button');
    button.textContent = 'TC';
    button.title = 'Copy TOC';
    button.addEventListener('click', async () => {
        const items = document.querySelectorAll('.table-of-contents-list ol > li');
        let text = "";
        for (const item of items) {
            text += item.textContent;
            text += '\n';
        }
        // iframeでallowされていないので、コピーできない。
        //await navigator.clipboard.writeText(text);
        //console.log(text);

        if (0 < text.length) {
            const title = document.querySelector('.document-title');
            const titleText = title.textContent + '-toc.md';
            downloadText(text, titleText);
        }
    });

    li.appendChild(button);
}

{
    appendSeparator();
    const li = document.createElement('li');
    menuElem.appendChild(li);

    const button = document.createElement('button');
    button.textContent = 'B';
    button.title = 'Download body';
    button.addEventListener('click', async () => {
        const contentElem = document.querySelector('.content-container');
        // console.log('contentElem', contentElem);
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
                        text += child.textContent;
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
                        text += prefix + elem.textContent;
                        text += '\n';
                        break;
                    }
                    case 'H1': {
                        text += '# ' + elem.textContent;
                        text += '\n';
                        break;
                    }
                    case 'H2': {
                        text += '## ' + elem.textContent;
                        text += '\n';
                        break;
                    }
                    case 'H3': {
                        text += '### ' + elem.textContent;
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
                            text += elem.textContent;
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

    li.appendChild(button);
}
