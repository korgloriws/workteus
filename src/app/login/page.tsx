"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

function LoginForm() {
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha no login");
        setLoading(false);
        return;
      }
      // Navegação completa para garantir que o cookie de sessão vá na próxima request
      const next = params.get("next") || "/dashboard";
      window.location.assign(next);
    } catch {
      setError("Não foi possível entrar");
      setLoading(false);
    }
  }

  return (
    <form className="panel login-card fade-in" onSubmit={onSubmit}>
      <div className="brand" style={{ marginBottom: "0.35rem" }}>
        Workteus
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Mesa de trabalho — post-its, pastas e o dia a dia sob controle.
      </p>
      <div style={{ display: "grid", gap: "0.85rem", marginTop: "1.25rem" }}>
        <div className="field">
          <label htmlFor="username">Usuário</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error ? <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p> : null}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <ThemeToggle className="login-theme" />
      <Suspense fallback={<div className="panel login-card">Carregando…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
