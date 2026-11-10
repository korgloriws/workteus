"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppNav({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const links = [
    { href: "/dashboard", label: "Hoje", short: "Hoje" },
    { href: "/services", label: "Pastas", short: "Pastas" },
    { href: "/stats", label: "Relatórios", short: "Relatos" },
  ];

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <BrandLogo href="/dashboard" />
          <nav className="nav-links nav-desktop">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`nav-link ${pathname.startsWith(l.href) ? "active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
            <span className="muted nav-user">{username}</span>
            <ThemeToggle />
            <button className="btn secondary sm" type="button" onClick={logout}>
              Sair
            </button>
          </nav>
          <div className="topbar-mobile-actions">
            <ThemeToggle />
            <button className="btn secondary sm nav-logout-mobile" type="button" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <nav className="bottom-nav" aria-label="Navegação principal">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`bottom-nav-item ${pathname.startsWith(l.href) ? "active" : ""}`}
          >
            <span className="bottom-nav-dot" />
            {l.short}
          </Link>
        ))}
      </nav>
    </>
  );
}
