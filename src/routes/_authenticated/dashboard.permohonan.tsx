import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, XCircle, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, NoAccess } from "@/components/dash-bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard/permohonan")({
  head: () => ({ meta: [{ title: "Permohonan Data — Satu Data Buton Selatan" }, { name: "description", content: "Tinjau permohonan akses dataset berlisensi terbatas." }, { property: "og:title", content: "Permohonan Data — Satu Data Buton Selatan" }, { property: "og:description", content: "Tinjau permohonan akses dataset berlisensi terbatas." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Requests,
});

const LABEL = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" } as const;

function Requests() {
  const { hasRole, user } = useAuth();
  const qc = useQueryClient();
  const allowed = hasRole("wali_data") || hasRole("admin");
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const { data = [], isLoading } = useQuery({
    queryKey: ["data-requests"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase.from("data_requests").select("*, datasets(title, file_url, file_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (!allowed) return <NoAccess />;

  async function decide(id: string, status: "approved" | "rejected") {
    const note = status === "rejected" ? prompt("Alasan penolakan:") : null;
    if (status === "rejected" && !note) return;
    const { error } = await supabase.from("data_requests").update({ status, review_note: note, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(status === "approved" ? "Disetujui — buat tautan unduhan untuk pemohon" : "Permohonan ditolak"); qc.invalidateQueries({ queryKey: ["data-requests"] }); }
  }
  async function makeLink(path: string | null | undefined, name: string | null | undefined) {
    if (!path) { toast.error("Dataset tidak memiliki berkas"); return; }
    const { data: s, error } = await supabase.storage.from("dataset-files").createSignedUrl(path, 60 * 60 * 24 * 7, { download: name ?? true });
    if (error || !s) { toast.error("Gagal membuat tautan"); return; }
    await navigator.clipboard.writeText(s.signedUrl);
    toast.success("Tautan unduhan (berlaku 7 hari) disalin. Kirimkan ke email pemohon.");
  }

  const list = data.filter((r) => r.status === tab);
  return (
    <div>
      <PageHeader title="Permohonan Data" desc="Tinjau permohonan akses dataset berlisensi Terbatas" />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>{(Object.keys(LABEL) as (keyof typeof LABEL)[]).map((k) => <TabsTrigger key={k} value={k}>{LABEL[k]}</TabsTrigger>)}</TabsList>
      </Tabs>
      {isLoading && <p className="text-muted-foreground">Memuat…</p>}
      {!isLoading && list.length === 0 && <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">Tidak ada permohonan.</p>}
      <div className="grid gap-3">
        {list.map((r) => (
          <div key={r.id} className="rounded-2xl border bg-card p-4 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold break-words">{r.datasets?.title}</p>
                <p className="text-sm text-muted-foreground break-words">{r.name} · {r.email}{r.institution ? ` · ${r.institution}` : ""}</p>
              </div>
              <Badge variant="outline">{formatDate(r.created_at)}</Badge>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{r.purpose}</p>
            {r.review_note && <p className="mt-2 text-xs text-destructive">Catatan: {r.review_note}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status === "pending" && <>
                <Button size="sm" onClick={() => decide(r.id, "approved")}><CheckCircle2 className="h-4 w-4" /> Setujui</Button>
                <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}><XCircle className="h-4 w-4" /> Tolak</Button>
              </>}
              {r.status === "approved" && <Button size="sm" variant="outline" onClick={() => makeLink(r.datasets?.file_url, r.datasets?.file_name)}><Link2 className="h-4 w-4" /> Salin tautan unduhan</Button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
