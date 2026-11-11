const ALLOWED = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "BR",
  "DIV",
  "P",
  "UL",
  "OL",
  "LI",
  "SPAN",
]);

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Texto puro → HTML do editor; HTML antigo → sanitizado. */
export function toNotepadHtml(value: string) {
  if (!value) return "";
  if (looksLikeHtml(value)) return sanitizeNotepadHtml(value);
  return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br>");
}

export function notepadPlainText(html: string) {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const box = document.createElement("div");
  box.innerHTML = sanitizeNotepadHtml(html);
  return (box.innerText || box.textContent || "").replace(/\u00a0/g, " ").trim();
}

export function sanitizeNotepadHtml(dirty: string) {
  if (typeof document === "undefined") {
    return dirty.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  }
  const root = document.createElement("div");
  root.innerHTML = dirty;

  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED.has(el.tagName)) {
          const text = document.createTextNode(el.textContent || "");
          el.replaceWith(text);
          continue;
        }
        for (const attr of Array.from(el.attributes)) {
          el.removeAttribute(attr.name);
        }
        walk(el);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        child.parentNode?.removeChild(child);
      }
    }
  };

  walk(root);
  return root.innerHTML;
}
