import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { featuresQuery } from "@/lib/features";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/sistem0852")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Halaman tidak ditemukan" },
      { name: "description", content: "Halaman tidak ditemukan." },
      { property: "og:title", content: "Halaman tidak ditemukan" },
      { property: "og:description", content: "Halaman tidak ditemukan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SystemPage,
});

function FakeNotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-5xl font-extrabold">404</h1>
        <p className="mt-2 text-muted-foreground">Halaman tidak ditemukan.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Kembali ke beranda</Link>
      </div>
    </div>
  );
}

function SystemPage() {
  const { loading, hasRole } = useAuth();
  if (loading) return <div className="min-h-[60vh]" />;
  if (!hasRole("admin")) return <FakeNotFound />;
  return <Switchboard />;
}

function Switchboard() {
  const qc = useQueryClient();
  const { data = [] } = useQuery(featuresQuery);
  const [pending, setPending] = useState<{ key: string; label: string; next: boolean } | null>(null);

  async function apply() {
    if (!pending) return;
    const { error } = await supabase.from("system_features").update({ enabled: pending.next, updated_at: new Date().toISOString() }).eq("key", pending.key);
    if (error) toast.error(error.message);
    else toast.success(`${pending.label} ${pending.next ? "diaktifkan" : "dinonaktifkan"}`);
    setPending(null);
    qc.invalidateQueries({ queryKey: featuresQuery.queryKey });
  }

  const active = data.filter((f) => f.enabled).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-start gap-3">
        <ShieldAlert className="mt-1 h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-extrabold">Kendali Sistem</h1>
          <p className="text-sm text-muted-foreground">Aktifkan atau nonaktifkan fitur. Fitur nonaktif disembunyikan dari tampilan dan ditolak oleh sistem. {active}/{data.length} fitur aktif.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((f) => (
          <div key={f.key} className={`rounded-2xl border bg-card p-4 shadow-soft transition ${f.enabled ? "" : "opacity-70"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold">
                  <Power className={`h-4 w-4 ${f.enabled ? "text-primary" : "text-muted-foreground"}`} /> {f.label}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${f.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{f.enabled ? "Aktif" : "Nonaktif"}</span>
              </div>
              <Switch checked={f.enabled} onCheckedChange={(v) => setPending({ key: f.key, label: f.label, next: v })} aria-label={f.label} />
            </div>
          </div>
        ))}
      </div>
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.next ? "Aktifkan" : "Nonaktifkan"} {pending?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.next ? "Fitur akan kembali tampil dan berfungsi untuk semua pengguna." : "Semua menu, tombol, dan proses yang berkaitan dengan fitur ini akan disembunyikan dan ditolak oleh sistem."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={apply}>Ya, lanjutkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
