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

  const appendSeparator = () => {
    const separator = document.createElement("li");
    separator.classList.add("separator");
    menuElem.appendChild(separator);
  };

  appendSeparator();

  {
    const button = document.createElement("button");
    button.title = "Download body";
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
    img.style.cssText = "width: 80%; height: 80%;";

    const span = document.createElement("span");
    span.classList.add("buttonicon");
    span.classList.add("buttonicon-svg");

    const li = document.createElement("li");

    span.appendChild(img);
    button.appendChild(span);
    li.appendChild(button);
    menuElem.appendChild(li);
  }
};

const observer = new MutationObserver(() => {
  // 画面上部のメニュー部
  const menuElem = document.querySelector("ul.menu_left");
  if (menuElem) {
    observer.disconnect();
    mainScript(menuElem);
  }
});
observer.observe(document.body, { subtree: true, childList: true, attributes: true });
