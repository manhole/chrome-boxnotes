"use strict";

import { textBuilder } from "./converters";

const mainScript = (menuElem: Element) => {
  const downloadText = (text: string, fileName: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = url;
    link.setAttribute("download", fileName);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const button = document.createElement("button");
  // 既存のアイコンボタン (太字・イタリックなど) と同じ見た目にするための CSS モジュールクラス (2026-04-21 時点)。
  // Box Notes の UI 更新でハッシュ部分が変わると見た目が崩れるが、機能には影響しない。
  button.className =
    "bp_icon_button_module_iconButton--a2d49 bp_icon_button_module_default--a2d49 bp_icon_button_module_small--a2d49 magnifyIcon";
  button.setAttribute("data-modern", "false");
  button.type = "button";
  button.title = "Download as Markdown";
  button.addEventListener("click", async () => {
    // 複数のBox Notesを遷移すると ".pad" 要素が複数になる。選択されているものは ".hidden" が付かない。
    const contentElem = document.querySelector(".pad:not(.hidden) .content-container") as HTMLElement;
    const text = textBuilder(contentElem!, "");

    const title = document.querySelector(".pad:not(.hidden) .document-title")!;
    const titleText = title.textContent + ".md";
    downloadText(text, titleText);
  });

  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("images/download.svg");
  img.style.cssText = "width: 1.5rem; height: 1.5rem;"; // 隣接するアイコンボタンの SVG サイズに合わせた値

  button.appendChild(img);

  // セパレーターのクラスを既存要素からコピーして再現する
  const existingSeparator = menuElem.querySelector("li:empty");
  const separator = document.createElement("li");
  if (existingSeparator) {
    separator.className = existingSeparator.className;
  }

  const li = document.createElement("li");
  li.appendChild(button);

  const insertMediaLi = menuElem.querySelector("li:has(button[data-testid='insert-media'])");
  insertMediaLi?.after(separator, li);
};

const observer = new MutationObserver(() => {
  // 画面上部のツールバー部 (フォントサイズや色を変えるボタンが並んでいる)
  const menuElem = document.querySelector("ul[role='toolbar']");
  if (menuElem) {
    observer.disconnect();
    mainScript(menuElem);
  }
});
observer.observe(document.body, { subtree: true, childList: true, attributes: true });
