import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema } from "@/db/ensure";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  ensureSchema();
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="app-shell">
      <AppNav username={user.username} />
      <main className="page">{children}</main>
    </div>
  );
}
