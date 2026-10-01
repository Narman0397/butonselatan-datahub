import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/site-chrome";
import { orgsQuery, publishedQuery } from "@/lib/data";

export const Route = createFileRoute("/organisasi")({
  head: () => ({
    meta: [
      { title: "Direktori OPD — Satu Data Buton Selatan" },
      { name: "description", content: "Daftar organisasi perangkat daerah produsen data Kabupaten Buton Selatan." },
      { property: "og:title", content: "Direktori OPD — Satu Data Buton Selatan" },
      { property: "og:description", content: "Daftar organisasi perangkat daerah produsen data Kabupaten Buton Selatan." },
    ],
  }),
  component: Orgs,
});

function Orgs() {
  const { data: orgs = [] } = useQuery(orgsQuery);
  const { data: ds = [] } = useQuery(publishedQuery);
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold sm:text-3xl">Direktori Organisasi</h1>
        <p className="mt-1 text-muted-foreground">{orgs.length} OPD produsen data di Kabupaten Buton Selatan</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => {
            const n = ds.filter((d) => d.organization_id === o.id).length;
            return (
              <Link key={o.id} to="/dataset" search={{ opd: o.slug }} className="group flex gap-4 rounded-2xl border bg-card shadow-soft p-5 transition hover:border-primary/40 hover:shadow-md">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Building2 className="h-6 w-6" /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold text-primary">{o.acronym}</div>
                  <div className="text-sm font-medium">{o.name}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{o.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium">{n} dataset <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" /></div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}
