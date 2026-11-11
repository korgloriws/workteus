"use client";

import { useEffect, useRef } from "react";
import { notepadPlainText, sanitizeNotepadHtml, toNotepadHtml } from "@/lib/notepadHtml";

type Props = {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  onChange: (html: string) => void;
  onSaveShortcut?: () => void;
  onBlur?: () => void;
};

function runFormat(command: string) {
  // contentEditable notepad clássico
  document.execCommand(command, false);
}

export function NotepadEditor({
  value,
  placeholder,
  disabled,
  className = "",
  compact,
  onChange,
  onSaveShortcut,
  onBlur,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastHtml = useRef("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = toNotepadHtml(value || "");
    if (html === lastHtml.current) return;
    if (document.activeElement === el) return;
    el.innerHTML = html || "";
    lastHtml.current = html;
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    const html = sanitizeNotepadHtml(el.innerHTML);
    lastHtml.current = html;
    onChange(html);
  }

  function format(command: string) {
    if (disabled) return;
    ref.current?.focus();
    runFormat(command);
    emit();
  }

  const empty = !notepadPlainText(value || "");

  return (
    <div className={`notepad ${compact ? "notepad-compact" : ""} ${className}`.trim()}>
      {!disabled ? (
        <div className="notepad-toolbar" role="toolbar" aria-label="Formatação">
          <button type="button" className="btn ghost sm" onMouseDown={(e) => e.preventDefault()} onClick={() => format("bold")}>
            Negrito
          </button>
          <button type="button" className="btn ghost sm" onMouseDown={(e) => e.preventDefault()} onClick={() => format("italic")}>
            Itálico
          </button>
          <button type="button" className="btn ghost sm" onMouseDown={(e) => e.preventDefault()} onClick={() => format("underline")}>
            Sublinhado
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => format("insertUnorderedList")}
          >
            Lista
          </button>
        </div>
      ) : null}

      <div className="notepad-surface-wrap">
        {empty && placeholder ? (
          <span className="notepad-placeholder" aria-hidden>
            {placeholder}
          </span>
        ) : null}
        <div
          ref={ref}
          className="notepad-surface"
          contentEditable={!disabled}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Bloco de notas"
          data-disabled={disabled ? "1" : "0"}
          onInput={emit}
          onBlur={() => {
            emit();
            onBlur?.();
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
              e.preventDefault();
              format("bold");
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
              e.preventDefault();
              format("italic");
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
              e.preventDefault();
              format("underline");
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              onSaveShortcut?.();
            }
          }}
        />
      </div>
    </div>
  );
}
