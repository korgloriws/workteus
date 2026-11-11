"use client";

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { api } from "@/lib/client";
import { notepadPlainText } from "@/lib/notepadHtml";
import {
  DEFAULT_STICKY_COLOR,
  normalizeStickyColor,
  stickyGlueFor,
} from "@/lib/types";
import { NotepadEditor } from "./NotepadEditor";
import { NotesColorSheet } from "./NotesColorSheet";

export type NoteItem = {
  id: number;
  title: string;
  body: string;
  color: string;
  pinned: boolean | number;
  sensitive: boolean | number;
  sortOrder: number;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

function isOn(value: boolean | number | undefined) {
  return value === true || value === 1;
}

function NoteComposer({
  sensitive,
  onSensitiveChange,
  onCreate,
}: {
  sensitive: boolean;
  onSensitiveChange: (v: boolean) => void;
  onCreate: (input: { title: string; body: string; sensitive: boolean }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const canSave = Boolean(title.trim() || notepadPlainText(body));

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (saving || !canSave) return;
    setSaving(true);
    try {
      await onCreate({ title: title.trim(), body, sensitive });
      setTitle("");
      setBody("");
      setEditorKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="note-composer panel panel-pad" onSubmit={submit}>
      <div className="note-composer-head">
        <strong>Novo post-it</strong>
        <label className="notes-sensitive-toggle">
          <input
            type="checkbox"
            checked={sensitive}
            onChange={(e) => onSensitiveChange(e.target.checked)}
          />
          <span>Modo sigilo</span>
        </label>
      </div>

      <input
        className="note-composer-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={sensitive ? "Título visível (ex.: Wi-Fi casa)" : "Título (opcional)"}
        disabled={saving}
      />

      <NotepadEditor
        key={editorKey}
        value={body}
        disabled={saving}
        placeholder={
          sensitive
            ? "Escreva a senha/acesso aqui (fica oculto no mural)…"
            : "Escreva como num bloco de notas — Enter muda de linha."
        }
        onChange={setBody}
        onSaveShortcut={() => {
          submit().catch(console.error);
        }}
      />

      <div className="note-composer-actions">
        <span className="muted note-format-hint">Ctrl+Enter salva o post-it</span>
        <button type="submit" className="btn" disabled={saving || !canSave}>
          {saving ? "Salvando…" : "Fixar no bloco"}
        </button>
      </div>
    </form>
  );
}

function NoteCard({
  note,
  archived,
  revealed,
  onReveal,
  onHide,
  onPatch,
  onColor,
  onArchive,
  onRestore,
  onHardDelete,
}: {
  note: NoteItem;
  archived?: boolean;
  revealed: boolean;
  onReveal: () => void;
  onHide: () => void;
  onPatch: (id: number, patch: Partial<NoteItem>) => Promise<void>;
  onColor: (note: NoteItem) => void;
  onArchive: (note: NoteItem) => void;
  onRestore: (note: NoteItem) => void;
  onHardDelete: (note: NoteItem) => void;
}) {
  const color = normalizeStickyColor(note.color || DEFAULT_STICKY_COLOR);
  const [title, setTitle] = useState(note.title || "");
  const [body, setBody] = useState(note.body || "");
  const [saving, setSaving] = useState(false);
  const sensitive = isOn(note.sensitive);
  const pinned = isOn(note.pinned);
  const masked = sensitive && !revealed;

  useEffect(() => {
    setTitle(note.title || "");
    setBody(note.body || "");
  }, [note.id, note.title, note.body]);

  async function commit() {
    if (archived) return;
    const nextTitle = title.trim();
    const nextBody = body;
    if (nextTitle === (note.title || "") && nextBody === (note.body || "")) return;
    setSaving(true);
    try {
      await onPatch(note.id, {
        title: nextTitle || (sensitive ? "Sigilo" : "Nota"),
        body: nextBody,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className={`sticky-card note-sticky${pinned ? " note-sticky-pinned" : ""}${
        sensitive ? " note-sticky-sensitive" : ""
      }`}
      style={
        {
          "--sticky-face": color,
          "--sticky-glue": stickyGlueFor(color),
        } as CSSProperties
      }
    >
      <div className="sticky-glue" aria-hidden />
      <div className="sticky-body">
        <div className="sticky-top">
          <span className="sticky-code">{pinned ? "Destaque" : archived ? "Arquivado" : "Nota"}</span>
          {sensitive ? <span className="note-sensitive-badge">Senha / sigilo</span> : null}
        </div>

        {masked ? (
          <>
            <p className="note-masked-title">{title || "Sigilo"}</p>
            <button type="button" className="note-mask" onClick={onReveal}>
              Conteúdo oculto — toque para revelar
            </button>
          </>
        ) : (
          <>
            <input
              className="note-title-input"
              value={title}
              placeholder="Título"
              disabled={saving || archived}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commit}
            />
            <NotepadEditor
              value={body}
              compact
              disabled={saving || archived}
              placeholder="Escrever no post-it…"
              onChange={setBody}
              onBlur={commit}
            />
          </>
        )}
      </div>

      <div className="sticky-toolbar">
        {archived ? (
          <>
            <button type="button" className="btn ghost sm" onClick={() => onRestore(note)}>
              Restaurar
            </button>
            <button type="button" className="btn ghost sm" onClick={() => onHardDelete(note)}>
              Excluir
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={`btn ghost sm${pinned ? " note-action-on" : ""}`}
              onClick={() => onPatch(note.id, { pinned: !pinned })}
            >
              {pinned ? "Tirar destaque" : "Destacar"}
            </button>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => onPatch(note.id, { sensitive: !sensitive })}
            >
              {sensitive ? "Normal" : "Sigilo"}
            </button>
            {sensitive && revealed ? (
              <button type="button" className="btn ghost sm" onClick={onHide}>
                Ocultar
              </button>
            ) : null}
            <button type="button" className="btn ghost sm" onClick={() => onColor(note)}>
              Cor
            </button>
            <button type="button" className="btn ghost sm" onClick={() => onArchive(note)}>
              Arquivar
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export function NotesWorkspace() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"active" | "archived">("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [colorNote, setColorNote] = useState<NoteItem | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [captureSensitive, setCaptureSensitive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ scope });
      if (q.trim()) params.set("q", q.trim());
      const rows = await api<NoteItem[]>(`/api/notes?${params}`);
      setNotes(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [q, scope]);

  useEffect(() => {
    const t = setTimeout(() => {
      load().catch(console.error);
    }, q ? 220 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function createNote(input: { title: string; body: string; sensitive: boolean }) {
    const created = await api<NoteItem>("/api/notes", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (scope === "active") {
      setNotes((prev) => [created, ...prev]);
    }
  }

  async function patch(id: number, data: Partial<NoteItem>) {
    const updated = await api<NoteItem>(`/api/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...updated } : n));
      return next.sort((a, b) => {
        if (isOn(a.pinned) !== isOn(b.pinned)) return isOn(a.pinned) ? -1 : 1;
        return String(b.updatedAt).localeCompare(String(a.updatedAt));
      });
    });
  }

  async function archive(note: NoteItem) {
    if (!confirm("Arquivar este post-it? Ele vai para a aba Arquivados.")) return;
    await api(`/api/notes/${note.id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  }

  async function restore(note: NoteItem) {
    await api(`/api/notes/${note.id}`, {
      method: "PATCH",
      body: JSON.stringify({ restore: true }),
    });
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  }

  async function hardDelete(note: NoteItem) {
    if (!confirm("Excluir permanentemente? Não dá para desfazer.")) return;
    await api(`/api/notes/${note.id}?hard=1`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  }

  return (
    <div className="desk-page">
      <div className="page-header">
        <div>
          <h1 className="hero-title">Bloco de post-its</h1>
          <p className="desk-copy">
            Bloco de notas em post-its — texto livre, destaque, cor e sigilo.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className={`btn sm ${scope === "active" ? "" : "secondary"}`}
            onClick={() => setScope("active")}
          >
            Ativos
          </button>
          <button
            type="button"
            className={`btn sm ${scope === "archived" ? "" : "secondary"}`}
            onClick={() => setScope("archived")}
          >
            Arquivados
          </button>
          <input
            className="search-input"
            placeholder="Buscar no bloco…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {scope === "active" ? (
        <NoteComposer
          sensitive={captureSensitive}
          onSensitiveChange={setCaptureSensitive}
          onCreate={createNote}
        />
      ) : (
        <p className="desk-copy" style={{ marginTop: "1rem" }}>
          Arquivados ficam guardados aqui — dá para restaurar ou excluir de vez.
        </p>
      )}

      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}

      {loading && !notes.length ? (
        <p className="desk-copy">Abrindo o bloco…</p>
      ) : !notes.length ? (
        <div className="empty-desk panel panel-pad">
          <p>{scope === "archived" ? "Nada arquivado." : "Bloco ainda vazio."}</p>
          <span className="muted">
            {scope === "archived"
              ? "Ao arquivar um post-it ativo, ele aparece nesta lista."
              : "Escreva no bloco acima e fixe no mural."}
          </span>
        </div>
      ) : (
        <div className="sticky-board notes-board">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              archived={scope === "archived"}
              revealed={!!revealed[note.id]}
              onReveal={() => setRevealed((r) => ({ ...r, [note.id]: true }))}
              onHide={() => setRevealed((r) => ({ ...r, [note.id]: false }))}
              onPatch={patch}
              onColor={setColorNote}
              onArchive={archive}
              onRestore={restore}
              onHardDelete={hardDelete}
            />
          ))}
        </div>
      )}

      <NotesColorSheet
        open={!!colorNote}
        note={colorNote}
        onClose={() => setColorNote(null)}
        onPick={(note, color) => {
          patch(note.id, { color }).catch(console.error);
        }}
      />
    </div>
  );
}
