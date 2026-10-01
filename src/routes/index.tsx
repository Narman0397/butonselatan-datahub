import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Database, Building2, Download, Layers, ArrowRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts";
import { PublicLayout } from "@/components/site-chrome";
import { DatasetCard } from "@/components/dataset-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { orgsQuery, publishedQuery, topicsQuery } from "@/lib/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Satu Data Buton Selatan — Portal Data Terbuka" },
      { name: "description", content: "Cari, pratinjau, dan unduh dataset resmi dari seluruh OPD Kabupaten Buton Selatan." },
      { property: "og:title", content: "Satu Data Buton Selatan — Portal Data Terbuka" },
      { property: "og:description", content: "Cari, pratinjau, dan unduh dataset resmi dari seluruh OPD Kabupaten Buton Selatan." },
    ],
  }),
  component: Home,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: datasets = [] } = useQuery(publishedQuery);
  const { data: orgs = [] } = useQuery(orgsQuery);
  const { data: topics = [] } = useQuery(topicsQuery);

  const totalDownloads = datasets.reduce((a, d) => a + d.downloads, 0);
  const activeOrgs = new Set(datasets.map((d) => d.organization_id)).size;
  const byTopic = topics
    .map((t) => ({ name: t.name, jumlah: datasets.filter((d) => d.topic_id === t.id).length }))
    .filter((x) => x.jumlah > 0);
  const byFormat = ["CSV", "XLSX", "PDF"].map((f) => ({ name: f, value: datasets.filter((d) => d.format === f).length }));

  const stats = [
    { icon: Database, label: "Dataset terbuka", value: datasets.length },
    { icon: Building2, label: "OPD berkontribusi", value: activeOrgs },
    { icon: Layers, label: "Topik sektoral", value: topics.length },
    { icon: Download, label: "Total unduhan", value: totalDownloads.toLocaleString("id-ID") },
  ];

  return (
    <PublicLayout>
      <section className="bg-sea relative overflow-hidden text-ocean-foreground">
        <div className="contour absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
          <p className="mb-4 inline-flex rounded-full border border-ocean-foreground/20 px-3 py-1 text-xs font-medium tracking-wide">
            Portal Resmi Pemerintah Kabupaten Buton Selatan
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            Satu data, untuk <span className="text-accent">pesisir</span> dan pulau-pulau Buton Selatan.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ocean-foreground/80">
            Temukan data kependudukan, kesehatan, perikanan, hingga keuangan daerah — terverifikasi Wali Data dan siap diunduh.
          </p>
          <form
            className="mt-8 flex max-w-2xl gap-2 rounded-xl bg-card p-2 shadow-2xl"
            onSubmit={(e) => { e.preventDefault(); navigate({ to: "/dataset", search: { q } }); }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari dataset, mis. penduduk, ikan, puskesmas…" className="h-12 border-0 pl-10 text-base text-foreground shadow-none focus-visible:ring-0" />
            </div>
            <Button type="submit" size="lg" className="h-12 bg-accent text-accent-foreground hover:bg-accent/90">Cari</Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            {topics.slice(0, 5).map((t) => (
              <Link key={t.id} to="/dataset" search={{ topik: t.slug }} className="rounded-full bg-ocean-foreground/10 px-3 py-1 hover:bg-ocean-foreground/20">
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-10 grid max-w-7xl grid-cols-2 gap-3 px-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="relative rounded-xl border bg-card p-5 shadow-sm">
            <s.icon className="h-5 w-5 text-accent" />
            <div className="mt-3 font-display text-3xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Dataset per topik</h2>
          <p className="mb-4 text-sm text-muted-foreground">Sebaran dataset terbuka menurut sektor</p>
          <ChartContainer config={{ jumlah: { label: "Dataset", color: "var(--chart-1)" } }} className="h-72 w-full">
            <BarChart data={byTopic}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-15} height={50} textAnchor="end" />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="jumlah" fill="var(--color-jumlah)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Format file</h2>
          <p className="mb-4 text-sm text-muted-foreground">Komposisi format dataset</p>
          <ChartContainer config={{ value: { label: "Dataset" } }} className="mx-auto h-56">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie data={byFormat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                {byFormat.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-2 flex justify-center gap-4 text-sm">
            {byFormat.map((f, i) => (
              <span key={f.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
                {f.name} ({f.value})
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dataset terbaru</h2>
            <p className="text-muted-foreground">Baru diterbitkan oleh Wali Data</p>
          </div>
          <Link to="/dataset" className="flex items-center gap-1 text-sm font-medium text-primary">Semua dataset <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {datasets.slice(0, 6).map((d) => <DatasetCard key={d.id} ds={d} />)}
        </div>
      </section>

      <section className="bg-secondary/60 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">Instansi / OPD</h2>
              <p className="text-muted-foreground">Produsen data di lingkungan Pemkab Buton Selatan</p>
            </div>
            <Link to="/organisasi" className="flex items-center gap-1 text-sm font-medium text-primary">Direktori <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {orgs.map((o) => (
              <Link key={o.id} to="/dataset" search={{ opd: o.slug }} className="rounded-xl border bg-card p-4 transition hover:border-primary/40">
                <div className="font-display text-lg font-bold text-primary">{o.acronym}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{o.name}</div>
                <div className="mt-3 text-xs font-medium">{datasets.filter((d) => d.organization_id === o.id).length} dataset</div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
