import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Atur Ulang Kata Sandi — Satu Data Buton Selatan" },
      { name: "description", content: "Buat kata sandi baru untuk akun Satu Data Buton Selatan Anda." },
      { property: "og:title", content: "Atur Ulang Kata Sandi — Satu Data Buton Selatan" },
      { property: "og:description", content: "Buat kata sandi baru untuk akun Satu Data Buton Selatan Anda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") setReady(true); });
    supabase.auth.getSession().then(({ data: s }) => { if (s.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error("Kata sandi minimal 8 karakter"); return; }
    if (pw !== pw2) { toast.error("Konfirmasi kata sandi tidak cocok"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error("Gagal menyimpan kata sandi. Tautan mungkin sudah kedaluwarsa."); return; }
    toast.success("Kata sandi berhasil diperbarui");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-soft">
        <div className="mb-6"><Logo /></div>
        <h1 className="text-xl font-bold">Atur ulang kata sandi</h1>
        {ready ? (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div className="space-y-1.5"><Label>Kata sandi baru</Label><Input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Ulangi kata sandi baru</Label><Input type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
            <Button className="w-full" disabled={busy}>Simpan kata sandi</Button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Buka halaman ini melalui tautan pemulihan yang dikirim ke email Anda. Jika tautan sudah kedaluwarsa, minta tautan baru dari halaman Masuk.</p>
        )}
      </div>
    </div>
  );
}
