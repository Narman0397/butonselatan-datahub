import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Calendar, Building2, Tag, Scale, RefreshCw, Eye, Copy, Lock } from "lucide-react";
import { PublicLayout } from "@/components/site-chrome";
import { DatasetChart, FormatBadge, LicenseInfoBox, SampleTable, chartSpec } from "@/components/dataset-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { DATASET_FIELDS, LICENSE_INFO, buildCitation, downloadDataset, formatDate, type SampleData } from "@/lib/data";
import { DatasetHistory } from "@/components/activity-bits";

export const Route = createFileRoute("/dataset/$slug")({
  head: () => ({
    meta: [
      { title: "Detail Dataset — Satu Data Buton Selatan" },
      { name: "description", content: "Metadata lengkap, pratinjau data, dan unduhan dataset Kabupaten Buton Selatan." },
      { property: "og:title", content: "Detail Dataset — Satu Data Buton Selatan" },
      { property: "og:description", content: "Metadata lengkap, pratinjau data, dan unduhan dataset Kabupaten Buton Selatan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Detail,
});

function Detail() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const { data: ds, isLoading } = useQuery({
    queryKey: ["dataset", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select(DATASET_FIELDS).eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (ds?.id && ds.status === "published") supabase.rpc("increment_dataset_stat", { _id: ds.id, _kind: "view" });
  }, [ds?.id, ds?.status]);

  const sample = ds?.sample_data as SampleData | null;
  const filtered = useMemo(() => {
    if (!sample) return null;
    const f = filter.toLowerCase();
    return { ...sample, rows: f ? sample.rows.filter((r) => r.some((v) => String(v).toLowerCase().includes(f))) : sample.rows };
  }, [sample, filter]);

  const chartCols = sample ? chartSpec(sample).series : [];
  const [reqOpen, setReqOpen] = useState(false);

  if (isLoading) return <PublicLayout><p className="mx-auto max-w-7xl px-4 py-16 text-muted-foreground">Memuat…</p></PublicLayout>;
  if (!ds)
    return (
      <PublicLayout>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Dataset tidak ditemukan</h1>
          <p className="mt-2 text-muted-foreground">Dataset mungkin belum diterbitkan.</p>
          <Button asChild className="mt-6"><Link to="/dataset">Ke katalog</Link></Button>
        </div>
      </PublicLayout>
    );

  const meta = [
    { icon: Building2, k: "Produsen data", v: ds.organizations?.name },
    { icon: Tag, k: "Topik", v: ds.topics?.name ?? "-" },
    { icon: Scale, k: "Lisensi", v: ds.license },
    { icon: RefreshCw, k: "Frekuensi", v: ds.frequency },
    { icon: Calendar, k: "Diterbitkan", v: formatDate(ds.published_at) },
    { icon: Calendar, k: "Diperbarui", v: formatDate(ds.updated_at) },
  ];

  return (
    <PublicLayout>
      <div className="border-b bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Link to="/dataset" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Katalog
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0 max-w-3xl">
              <div className="mb-2 flex items-center gap-2"><FormatBadge format={ds.format} /><span className="text-sm text-muted-foreground">{ds.organizations?.acronym}</span></div>
              <h1 className="break-words text-2xl font-bold sm:text-3xl">{ds.title}</h1>
              <p className="mt-3 text-muted-foreground">{ds.description}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{ds.views} dilihat</span>
                <span className="flex items-center gap-1"><Download className="h-4 w-4" />{ds.downloads} unduhan</span>
              </div>
            </div>
            {LICENSE_INFO[ds.license]?.open === false ? (
              <Button size="lg" className="w-full rounded-full sm:w-auto" onClick={() => setReqOpen(true)}><Lock className="h-4 w-4" /> Ajukan Permohonan Data</Button>
            ) : (
              <Button size="lg" className="w-full rounded-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={async () => { await downloadDataset(ds); qc.invalidateQueries({ queryKey: ["dataset", slug] }); }}>
                <Download className="h-4 w-4" /> Unduh {ds.file_url ? ds.format : "CSV"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <Tabs defaultValue="tabel">
            <TabsList>
              <TabsTrigger value="tabel">Pratinjau Tabel</TabsTrigger>
              {chartCols.length > 0 && <TabsTrigger value="grafik">Grafik</TabsTrigger>}
            </TabsList>
            <TabsContent value="tabel" className="mt-4 space-y-3">
              {filtered ? (
                <>
                  <Input placeholder="Saring baris…" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-full sm:max-w-xs" />
                  <SampleTable data={filtered} />
                  <p className="text-xs text-muted-foreground">Menampilkan {filtered.rows.length} dari {sample?.rows.length} baris sampel.</p>
                </>
              ) : (
                <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Pratinjau tidak tersedia untuk dataset ini.</p>
              )}
            </TabsContent>
            {chartCols.length > 0 && sample && (
              <TabsContent value="grafik" className="mt-4 rounded-2xl border bg-card shadow-soft p-4">
                <DatasetChart data={sample} />
              </TabsContent>
            )}
          </Tabs>
        </div>
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card shadow-soft p-5">
            <h3 className="mb-4 font-semibold">Metadata</h3>
            <dl className="space-y-3 text-sm">
              {meta.map((m) => (
                <div key={m.k} className="flex gap-3">
                  <m.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div><dt className="text-xs text-muted-foreground">{m.k}</dt><dd className="font-medium">{m.v}</dd></div>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-2xl border bg-card shadow-soft p-5 space-y-3">
            <h3 className="font-semibold">Lisensi: {ds.license}</h3>
            <LicenseInfoBox license={ds.license} />
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Sitasi</p>
              <p className="rounded-lg bg-muted p-2 text-xs break-words">{buildCitation(ds, typeof window === "undefined" ? "" : window.location.origin)}</p>
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => { navigator.clipboard.writeText(buildCitation(ds, window.location.origin)); toast.success("Sitasi disalin"); }}><Copy className="h-3.5 w-3.5" /> Salin sitasi</Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-card shadow-soft p-5"><DatasetHistory datasetId={ds.id} /></div>
          {ds.tags.length > 0 && (
            <div className="rounded-2xl border bg-card shadow-soft p-5">
              <h3 className="mb-3 font-semibold">Tag</h3>
              <div className="flex flex-wrap gap-1.5">
                {ds.tags.map((t) => (
                  <Link key={t} to="/dataset" search={{ q: t }} className="rounded-full bg-secondary px-2.5 py-1 text-xs hover:bg-primary hover:text-primary-foreground">#{t}</Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
      <RequestDialog open={reqOpen} onOpenChange={setReqOpen} datasetId={ds.id} title={ds.title} />
    </PublicLayout>
  );
}

const reqSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
  email: z.string().trim().email("Email tidak valid").max(200),
  institution: z.string().trim().max(200),
  purpose: z.string().trim().min(10, "Jelaskan tujuan minimal 10 karakter").max(2000),
});

function RequestDialog({ open, onOpenChange, datasetId, title }: { open: boolean; onOpenChange: (o: boolean) => void; datasetId: string; title: string }) {
  const [f, setF] = useState({ name: "", email: "", institution: "", purpose: "" });
  const [busy, setBusy] = useState(false);
  async function send() {
    const r = reqSchema.safeParse(f);
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Data tidak valid"); return; }
    setBusy(true);
    const { error } = await supabase.from("data_requests").insert({ dataset_id: datasetId, ...r.data, institution: r.data.institution || null });
    setBusy(false);
    if (error) { toast.error("Gagal mengirim permohonan"); return; }
    toast.success("Permohonan terkirim. Wali Data akan menghubungi Anda melalui email.");
    setF({ name: "", email: "", institution: "", purpose: "" });
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Permohonan Data</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Dataset <b>{title}</b> berlisensi Terbatas. Isi formulir berikut; Wali Data akan meninjau dan mengirim tautan unduhan ke email Anda bila disetujui.</p>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nama lengkap *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Instansi / lembaga</Label><Input value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Tujuan penggunaan *</Label><Textarea rows={4} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} /></div>
          <Button className="w-full" disabled={busy} onClick={send}>Kirim Permohonan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
