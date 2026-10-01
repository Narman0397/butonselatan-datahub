import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Calendar, Building2, Tag, Scale, RefreshCw, Eye } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { PublicLayout } from "@/components/site-chrome";
import { FormatBadge, SampleTable } from "@/components/dataset-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { DATASET_FIELDS, downloadDataset, formatDate, type SampleData } from "@/lib/data";

export const Route = createFileRoute("/dataset/$slug")({
  head: () => ({
    meta: [
      { title: "Detail Dataset — Satu Data Buton Selatan" },
      { name: "description", content: "Metadata lengkap, pratinjau data, dan unduhan dataset Kabupaten Buton Selatan." },
      { property: "og:title", content: "Detail Dataset — Satu Data Buton Selatan" },
      { property: "og:description", content: "Metadata lengkap, pratinjau data, dan unduhan dataset Kabupaten Buton Selatan." },
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

  const numericCols = sample ? sample.columns.filter((_, i) => sample.rows.every((r) => typeof r[i] === "number")) : [];
  const chartCols = numericCols.filter((c) => c !== sample?.columns[0]).slice(0, 3);
  const chartData = sample?.rows.map((r) => Object.fromEntries(sample.columns.map((c, i) => [c, r[i]]))) ?? [];

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
            <div className="max-w-3xl">
              <div className="mb-2 flex items-center gap-2"><FormatBadge format={ds.format} /><span className="text-sm text-muted-foreground">{ds.organizations?.acronym}</span></div>
              <h1 className="text-3xl font-bold">{ds.title}</h1>
              <p className="mt-3 text-muted-foreground">{ds.description}</p>
              <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{ds.views} dilihat</span>
                <span className="flex items-center gap-1"><Download className="h-4 w-4" />{ds.downloads} unduhan</span>
              </div>
            </div>
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={async () => { await downloadDataset(ds); qc.invalidateQueries({ queryKey: ["dataset", slug] }); }}>
              <Download className="h-4 w-4" /> Unduh {ds.file_url ? ds.format : "CSV"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <Tabs defaultValue="tabel">
            <TabsList>
              <TabsTrigger value="tabel">Pratinjau Tabel</TabsTrigger>
              {chartCols.length > 0 && <TabsTrigger value="grafik">Grafik</TabsTrigger>}
            </TabsList>
            <TabsContent value="tabel" className="mt-4 space-y-3">
              {filtered ? (
                <>
                  <Input placeholder="Saring baris…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
                  <SampleTable data={filtered} />
                  <p className="text-xs text-muted-foreground">Menampilkan {filtered.rows.length} dari {sample?.rows.length} baris sampel.</p>
                </>
              ) : (
                <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Pratinjau tidak tersedia untuk dataset ini.</p>
              )}
            </TabsContent>
            {chartCols.length > 0 && sample && (
              <TabsContent value="grafik" className="mt-4 rounded-2xl border bg-card shadow-soft p-4">
                <ChartContainer
                  config={Object.fromEntries(chartCols.map((c, i) => [c, { label: c, color: `var(--chart-${i + 1})` }]))}
                  className="h-80 w-full"
                >
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey={sample.columns[0] ?? ""} tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} width={60} fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {chartCols.map((c, i) => <Bar key={c} dataKey={c} fill={`var(--chart-${i + 1})`} radius={[4, 4, 0, 0]} />)}
                  </BarChart>
                </ChartContainer>
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
    </PublicLayout>
  );
}
