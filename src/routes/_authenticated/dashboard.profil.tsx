import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL } from "@/lib/auth";
import { orgsQuery } from "@/lib/data";
import { PageHeader } from "@/components/dash-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/dashboard/profil")({
  head: () => ({ meta: [{ title: "Profil Saya — Satu Data Buton Selatan" }, { name: "description", content: "Kelola nama dan kata sandi akun Anda." }, { property: "og:title", content: "Profil Saya — Satu Data Buton Selatan" }, { property: "og:description", content: "Kelola nama dan kata sandi akun Anda." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Profil,
});

function Profil() {
  const { profile, user, roles, refresh } = useAuth();
  const { data: orgs = [] } = useQuery(orgsQuery);
  const [name, setName] = useState("");
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setName(profile?.full_name ?? ""); }, [profile?.full_name]);
  const org = orgs.find((o) => o.id === profile?.organization_id);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", user.id);
    setBusy(false);
    if (error) return toast.error("Gagal menyimpan profil");
    toast.success("Profil diperbarui");
    refresh();
  }
  async function savePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Kata sandi baru minimal 8 karakter");
    if (pw !== pw2) return toast.error("Konfirmasi kata sandi tidak cocok");
    setBusy(true);
    const { error: e1 } = await supabase.auth.signInWithPassword({ email: user?.email ?? "", password: cur });
    if (e1) { setBusy(false); return toast.error("Kata sandi saat ini salah"); }
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as never);
    setBusy(false);
    if (error) return toast.error("Gagal mengganti kata sandi");
    setCur(""); setPw(""); setPw2("");
    toast.success("Kata sandi berhasil diganti");
  }

  return (
    <div className="max-w-2xl">
      <PageHeader title="Profil Saya" desc="Perbarui nama tampilan dan kata sandi akun Anda." />
      <div className="space-y-6">
        <form onSubmit={saveName} className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="font-semibold">Data akun</h2>
          <div className="space-y-1.5"><Label>Nama lengkap</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
            <div className="space-y-1.5"><Label>OPD / Instansi</Label><Input value={org ? `${org.acronym} — ${org.name}` : "Belum ditetapkan"} disabled /></div>
          </div>
          <div className="text-sm text-muted-foreground">Peran: {roles.length ? roles.map((r) => ROLE_LABEL[r]).join(", ") : "Belum ada — hubungi Super Admin"}</div>
          <Button disabled={busy}>Simpan profil</Button>
        </form>
        <form onSubmit={savePw} className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="font-semibold">Ganti kata sandi</h2>
          <div className="space-y-1.5"><Label>Kata sandi saat ini</Label><Input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Kata sandi baru</Label><Input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Ulangi kata sandi baru</Label><Input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
          </div>
          <Button disabled={busy}>Ganti kata sandi</Button>
        </form>
      </div>
    </div>
  );
}
