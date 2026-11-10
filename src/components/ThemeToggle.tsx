"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const isDark = theme === "dark";
  const label = !ready ? "Tema" : isDark ? "Claro" : "Escuro";

  return (
    <button
      type="button"
      className={`btn secondary sm theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
      suppressHydrationWarning
    >
      {label}
    </button>
  );
}
