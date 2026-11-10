"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ServiceWorkspace } from "@/components/tasks/ServiceWorkspace";

function ServicesInner() {
  const params = useSearchParams();
  const id = params.get("id");
  return <ServiceWorkspace initialServiceId={id ? Number(id) : undefined} />;
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<p className="muted">Carregando…</p>}>
      <ServicesInner />
    </Suspense>
  );
}
