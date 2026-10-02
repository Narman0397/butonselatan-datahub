import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileStack, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL } from "@/lib/auth";
import { PageHeader } from "@/components/dash-bits";
import { StatusBadge } from "@/components/dataset-bits";
import { formatDate, type DatasetStatus } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Ringkasan Dashboard — Satu Data Buton Selatan" }, { name: "description", content: "Ringkasan pengelolaan dataset Satu Data Buton Selatan." }, { property: "og:title", content: "Ringkasan Dashboard — Satu Data Buton Selatan" }, { property: "og:description", content: "Ringkasan pengelolaan dataset Satu Data Buton Selatan." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Overview,
});

function Overview() {
  const { roles, profile } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["dash-datasets", roles.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datasets")
        .select("id, title, status, updated_at, organizations(acronym)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: roles.length > 0,
  });

  const count = (s: DatasetStatus) => data.filter((d) => d.status === s).length;
  const cards = [
    { label: "Draft", v: count("draft"), icon: FileStack, cls: "text-muted-foreground" },
    { label: "Menunggu Verifikasi", v: count("pending"), icon: Clock, cls: "text-warning-foreground" },
    { label: "Diterbitkan", v: count("published"), icon: CheckCircle2, cls: "text-success" },
    { label: "Ditolak", v: count("rejected"), icon: XCircle, cls: "text-destructive" },
  ];

  if (roles.length === 0)
    return (
      <div>
        <PageHeader title={`Halo, ${profile?.full_name ?? ""}`} />
        <div className="rounded-2xl border bg-card shadow-soft p-8">
          <h2 className="font-semibold">Akun Anda belum memiliki peran</h2>
          <p className="mt-2 text-sm text-muted-foreground">Hubungi Super Admin (Diskominfo) untuk ditetapkan sebagai Produsen Data OPD atau Wali Data. Sementara itu Anda tetap dapat menjelajah dan mengunduh dataset publik.</p>
          <Link to="/dataset" className="mt-4 inline-block text-sm font-medium text-primary">Buka katalog →</Link>
        </div>
      </div>
    );

  return (
    <div>
      <PageHeader title={`Halo, ${profile?.full_name ?? ""}`} desc={`Masuk sebagai ${roles.map((r) => ROLE_LABEL[r]).join(", ")}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card shadow-soft p-5">
            <c.icon className={`h-5 w-5 ${c.cls}`} />
            <div className="mt-3 font-display text-3xl font-bold">{c.v}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border bg-card shadow-soft">
        <div className="border-b px-5 py-3 font-semibold">Aktivitas terbaru</div>
        <ul className="divide-y">
          {data.slice(0, 8).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{d.title}</div>
                <div className="text-xs text-muted-foreground">{d.organizations?.acronym} · {formatDate(d.updated_at)}</div>
              </div>
              <StatusBadge status={d.status} />
            </li>
          ))}
          {data.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">Belum ada dataset.</li>}
        </ul>
      </div>
    </div>
  );
}
