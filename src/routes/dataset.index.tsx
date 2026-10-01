import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { z } from "zod";
import { PublicLayout } from "@/components/site-chrome";
import { DatasetCard } from "@/components/dataset-bits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FORMATS, LICENSES, orgsQuery, publishedQuery, topicsQuery } from "@/lib/data";

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  opd: z.string().optional().catch(undefined),
  topik: z.string().optional().catch(undefined),
  format: z.string().optional().catch(undefined),
  lisensi: z.string().optional().catch(undefined),
  urut: z.enum(["terbaru", "populer", "judul"]).optional().catch(undefined),
});

export const Route = createFileRoute("/dataset/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Katalog Dataset — Satu Data Buton Selatan" },
      { name: "description", content: "Telusuri dataset terbuka Buton Selatan berdasarkan OPD, topik, format, dan lisensi." },
      { property: "og:title", content: "Katalog Dataset — Satu Data Buton Selatan" },
      { property: "og:description", content: "Telusuri dataset terbuka Buton Selatan berdasarkan OPD, topik, format, dan lisensi." },
    ],
  }),
  component: Catalog,
});

const ALL = "__all";

function FilterGroup({ title, options, value, onChange }: { title: string; options: { v: string; l: string; n?: number }[]; value?: string; onChange: (v?: string) => void }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      <div className="space-y-0.5">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(value === o.v ? undefined : o.v)}
            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition ${value === o.v ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
          >
            <span className="truncate">{o.l}</span>
            {o.n !== undefined && <span className="text-xs opacity-70">{o.n}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Catalog() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/dataset/" });
  const set = (patch: Partial<typeof s>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const { data: all = [], isLoading } = useQuery(publishedQuery);
  const { data: orgs = [] } = useQuery(orgsQuery);
  const { data: topics = [] } = useQuery(topicsQuery);

  const q = (s.q ?? "").toLowerCase();
  let list = all.filter(
    (d) =>
      (!q || d.title.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q) || d.tags.some((t) => t.includes(q))) &&
      (!s.opd || d.organizations?.slug === s.opd) &&
      (!s.topik || d.topics?.slug === s.topik) &&
      (!s.format || d.format === s.format) &&
      (!s.lisensi || d.license === s.lisensi),
  );
  if (s.urut === "populer") list = [...list].sort((a, b) => b.downloads - a.downloads);
  if (s.urut === "judul") list = [...list].sort((a, b) => a.title.localeCompare(b.title));

  const active = s.opd || s.topik || s.format || s.lisensi || s.q;

  return (
    <PublicLayout>
      <div className="border-b bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <h1 className="text-3xl font-bold">Katalog Dataset</h1>
          <p className="mt-1 text-muted-foreground">{all.length} dataset terbuka dari OPD Kabupaten Buton Selatan</p>
          <div className="relative mt-6 max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              defaultValue={s.q}
              onChange={(e) => set({ q: e.target.value || undefined })}
              placeholder="Cari judul, deskripsi, atau tag…"
              className="h-11 bg-card pl-9"
            />
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6">
          <FilterGroup title="Organisasi / OPD" value={s.opd} onChange={(v) => set({ opd: v })}
            options={orgs.map((o) => ({ v: o.slug, l: o.acronym ?? o.name, n: all.filter((d) => d.organization_id === o.id).length }))} />
          <FilterGroup title="Topik" value={s.topik} onChange={(v) => set({ topik: v })}
            options={topics.map((t) => ({ v: t.slug, l: t.name, n: all.filter((d) => d.topic_id === t.id).length }))} />
          <FilterGroup title="Format" value={s.format} onChange={(v) => set({ format: v })}
            options={FORMATS.map((f) => ({ v: f, l: f, n: all.filter((d) => d.format === f).length }))} />
          <FilterGroup title="Lisensi" value={s.lisensi} onChange={(v) => set({ lisensi: v })}
            options={LICENSES.map((f) => ({ v: f, l: f, n: all.filter((d) => d.license === f).length })).filter((o) => o.n > 0)} />
        </aside>
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span><b className="text-foreground">{list.length}</b> hasil</span>
              {active && (
                <Button size="sm" variant="ghost" onClick={() => navigate({ search: {} })}>
                  <X className="h-3.5 w-3.5" /> Reset filter
                </Button>
              )}
            </div>
            <Select value={s.urut ?? ALL} onValueChange={(v) => set({ urut: v === ALL ? undefined : (v as "populer") })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Terbaru</SelectItem>
                <SelectItem value="populer">Paling banyak diunduh</SelectItem>
                <SelectItem value="judul">Judul A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <p className="text-muted-foreground">Memuat…</p>
          ) : list.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">Tidak ada dataset yang cocok.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((d) => <DatasetCard key={d.id} ds={d} />)}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
