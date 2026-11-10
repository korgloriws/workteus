"use client";

import { FormEvent, useState } from "react";

type Props = {
  disabled?: boolean;
  placeholder?: string;
  onCapture: (title: string) => Promise<void> | void;
};

export function QuickCapture({
  disabled,
  placeholder = "O que precisa fazer? Enter para anotar…",
  onCapture,
}: Props) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value || disabled || saving) return;
    setSaving(true);
    try {
      await onCapture(value);
      setTitle("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="quick-capture" onSubmit={submit}>
      <div className="quick-capture-dot" aria-hidden />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || saving}
        autoComplete="off"
        enterKeyHint="done"
      />
      <button type="submit" className="btn sm" disabled={disabled || saving || !title.trim()}>
        {saving ? "…" : "Anotar"}
      </button>
    </form>
  );
}
