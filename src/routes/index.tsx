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
import { leaderPhotosQuery, orgsQuery, publishedQuery, settingsQuery, topicsQuery } from "@/lib/data";

function initials(name: string) {
  return name.replace(/^(H|Hj|Dr|Ir|Drs)\.?\s+/i, "").split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Satu Data Buton Selatan — Portal Data Terbuka" },
      { name: "description", content: "Cari, pratinjau, dan unduh dataset resmi dari seluruh OPD Kabupaten Buton Selatan." },
      { property: "og:title", content: "Satu Data Buton Selatan — Portal Data Terbuka" },
      { property: "og:description", content: "Cari, pratinjau, dan unduh dataset resmi dari seluruh OPD Kabupaten Buton Selatan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"baru" | "populer">("baru");
  const { data: datasets = [] } = useQuery(publishedQuery);
  const { data: orgs = [] } = useQuery(orgsQuery);
  const { data: topics = [] } = useQuery(topicsQuery);
  const { data: leaders } = useQuery(leaderPhotosQuery);
  const { data: s } = useQuery(settingsQuery);
  const leadersList = [
    { key: "b", name: s?.bupati_name || "Nama Bupati", title: s?.bupati_title || "Bupati Buton Selatan", photo: leaders?.bupati },
    { key: "w", name: s?.wabup_name || "Nama Wakil Bupati", title: s?.wabup_title || "Wakil Bupati Buton Selatan", photo: leaders?.wabup },
  ].filter((p) => p.key === "b" || !s || s.wabup_name || s.wabup_photo_url || !s.bupati_name);
  const welcomeParas = (s?.welcome_body?.trim()
    ? s.welcome_body.split(/\n\s*\n/)
    : [
        "Portal Satu Data Buton Selatan hadir sebagai wujud komitmen pemerintah daerah dalam menyediakan data yang akurat, mutakhir, terpadu, dan dapat dipertanggungjawabkan sesuai Perpres No. 39 Tahun 2019.",
        "Kami mengajak seluruh perangkat daerah, akademisi, dan masyarakat memanfaatkan data ini untuk perencanaan pembangunan, riset, dan inovasi demi kesejahteraan masyarakat pesisir dan kepulauan.",
      ]).map((p) => p.trim()).filter(Boolean);

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
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20 md:py-28">
          <div className="flex flex-col items-center text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-ocean-foreground/20 bg-ocean-foreground/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em]">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Platform Data Terbuka
          </p>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-accent">{s?.hero_kicker || "Kabupaten Buton Selatan · Sulawesi Tenggara"}</p>
          <h1 className="animate-rise max-w-4xl break-words text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            {s?.hero_title || <>Data Publik <span className="text-accent">Buton Selatan</span><br className="hidden sm:block" /> Terbuka &amp; Terpadu</>}
          </h1>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-sm sm:text-base text-ocean-foreground/80">
            {s?.hero_description || "Temukan data kependudukan, kesehatan, perikanan, hingga keuangan daerah — terverifikasi Wali Data dan siap diunduh."}
          </p>
           <div className="mt-8 grid w-full max-w-3xl grid-cols-2 overflow-hidden rounded-2xl border border-ocean-foreground/20 bg-ocean-foreground/10 p-1 shadow-floating backdrop-blur-md sm:grid-cols-4 sm:divide-x sm:divide-ocean-foreground/15">
            {stats.map((s) => (
               <div key={s.label} className="rounded-xl px-3 py-3 even:bg-ocean-foreground/5 sm:rounded-none sm:bg-transparent sm:py-4">
                <div className="text-2xl font-extrabold sm:text-3xl">{s.value}<span className="text-accent">+</span></div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ocean-foreground/70">{s.label}</div>
              </div>
            ))}
          </div>
          <form
            className="animate-rise mt-8 flex w-full max-w-2xl gap-2 rounded-full bg-card p-1.5 shadow-floating ring-4 ring-ocean-foreground/10 focus-within:ring-accent/40"
            onSubmit={(e) => { e.preventDefault(); navigate({ to: "/dataset", search: { q } }); }}
          >
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari dataset, mis. penduduk, ikan, puskesmas…" className="h-12 rounded-full border-0 bg-transparent pl-10 text-base text-foreground shadow-none focus-visible:ring-0" />
            </div>
            <Button type="submit" size="lg" className="h-12 shrink-0 rounded-full bg-gradient-accent px-4 sm:px-6 text-primary-foreground hover:opacity-90">Cari</Button>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            {topics.slice(0, 5).map((t) => (
              <Link key={t.id} to="/dataset" search={{ topik: t.slug }} className="rounded-full border border-ocean-foreground/15 bg-ocean-foreground/10 px-3 py-1 backdrop-blur transition hover:-translate-y-0.5 hover:bg-ocean-foreground/20">
                {t.name}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="font-semibold uppercase tracking-[0.15em] text-ocean-foreground/70">Tren:</span>
            {["penduduk", "perikanan", "puskesmas", "APBD", "sekolah"].map((t) => (
              <Link key={t} to="/dataset" search={{ q: t }} className="rounded-full px-2 py-0.5 text-accent underline-offset-4 hover:underline">#{t}</Link>
            ))}
          </div>
          </div>
        </div>
        <svg className="relative block h-12 w-full text-secondary/50 sm:h-20" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden>
          <path fill="var(--background)" d="M0,64 C240,120 480,0 720,48 C960,96 1200,16 1440,56 L1440,120 L0,120 Z" />
        </svg>
      </section>

      <section className="relative overflow-hidden bg-secondary/50 py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div className="relative">
             <div className="absolute -right-2 -top-2 h-20 w-20 rounded-xl bg-accent/25" aria-hidden />
             <div className="relative rounded-2xl border bg-card p-2 shadow-floating sm:p-3">
               <div className={`grid gap-2 rounded-xl bg-sea p-3 text-ocean-foreground sm:p-4 ${leadersList.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {leadersList.map((p) => (
                  <div key={p.key} className="flex min-w-0 flex-col items-center text-center">
                    {p.photo ? (
                       <img src={p.photo} alt={`Foto ${p.name}`} className="aspect-[4/5] w-full max-w-[132px] rounded-xl object-cover object-top" loading="lazy" />
                    ) : (
                       <div className="grid aspect-[4/5] w-full max-w-[132px] place-items-center rounded-xl bg-ocean-foreground/10 text-3xl font-extrabold">{initials(p.name)}</div>
                    )}
                     <div className="mt-2 break-words text-sm font-bold">{p.name}</div>
                    <div className="text-xs text-ocean-foreground/70">{p.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-3 inline-flex rounded-full border bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">Sambutan Pimpinan Daerah</p>
            <h2 className="break-words text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              {s?.welcome_title || <>Mewujudkan <span className="text-primary">Satu Data</span> untuk Buton Selatan yang Maju</>}
            </h2>
            {welcomeParas.map((para, i) => (
              <p key={i} className={`${i === 0 ? "mt-4" : "mt-3"} whitespace-pre-line text-muted-foreground`}>{para}</p>
            ))}
            <Link to="/dataset" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Jelajahi Dataset <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>


      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-16 lg:grid-cols-3">
        <div className="min-w-0 rounded-2xl border bg-card p-5 shadow-soft md:p-6 lg:col-span-2">
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
        <div className="min-w-0 rounded-2xl border bg-card p-5 shadow-soft md:p-6">
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
        <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold">Dataset pilihan</h2>
            <div className="mt-2 inline-flex rounded-full border bg-card p-1 text-sm">
              {(["baru", "populer"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 font-medium transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {t === "baru" ? "Terbaru" : "Terpopuler"}
                </button>
              ))}
            </div>
          </div>
          <Link to="/dataset" className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">Semua <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(tab === "baru" ? datasets : [...datasets].sort((a, b) => b.downloads + b.views - (a.downloads + a.views))).slice(0, 6).map((d) => <DatasetCard key={d.id} ds={d} />)}
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
               <Link key={o.id} to="/dataset" search={{ opd: o.slug }} className="group card-lift rounded-xl border border-border/80 bg-card p-4 hover:border-primary/35">
                 <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 font-display text-sm font-extrabold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">{(o.acronym || o.name).slice(0, 3).toUpperCase()}</div>
                 <div className="font-display text-base font-bold text-foreground transition-colors group-hover:text-primary">{o.acronym}</div>
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
