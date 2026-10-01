import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, HeartPulse, GraduationCap, Fish, Wheat, Palmtree, Landmark, HandHeart, Layers } from "lucide-react";
import { PublicLayout } from "@/components/site-chrome";
import { publishedQuery, topicsQuery } from "@/lib/data";

const ICONS: Record<string, typeof Users> = {
  kependudukan: Users, kesehatan: HeartPulse, pendidikan: GraduationCap, "kelautan-perikanan": Fish,
  pertanian: Wheat, pariwisata: Palmtree, "keuangan-daerah": Landmark, sosial: HandHeart,
};

export const Route = createFileRoute("/topik")({
  head: () => ({
    meta: [
      { title: "Topik Data — Satu Data Buton Selatan" },
      { name: "description", content: "Jelajahi dataset Buton Selatan berdasarkan topik sektoral." },
      { property: "og:title", content: "Topik Data — Satu Data Buton Selatan" },
      { property: "og:description", content: "Jelajahi dataset Buton Selatan berdasarkan topik sektoral." },
    ],
  }),
  component: Topics,
});

function Topics() {
  const { data: topics = [] } = useQuery(topicsQuery);
  const { data: ds = [] } = useQuery(publishedQuery);
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold sm:text-3xl">Topik Sektoral</h1>
        <p className="mt-1 text-muted-foreground">Kelompok data menurut urusan pemerintahan</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map((t) => {
            const Icon = ICONS[t.slug] ?? Layers;
            return (
              <Link key={t.id} to="/dataset" search={{ topik: t.slug }} className="rounded-2xl border bg-card shadow-soft p-6 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md">
                <Icon className="h-8 w-8 text-accent" />
                <h3 className="mt-4 font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                <p className="mt-4 text-xs font-medium text-primary">{ds.filter((d) => d.topic_id === t.id).length} dataset</p>
              </Link>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}
