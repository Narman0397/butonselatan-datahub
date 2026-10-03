import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — Satu Data Buton Selatan" },
      { name: "description", content: "Masuk ke dashboard pengelolaan data Satu Data Buton Selatan." },
      { property: "og:title", content: "Masuk — Satu Data Buton Selatan" },
      { property: "og:description", content: "Masuk ke dashboard pengelolaan data Satu Data Buton Selatan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("Gagal masuk: email atau kata sandi salah");
  }
  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Pendaftaran berhasil. Periksa email Anda untuk konfirmasi.");
  }
  async function forgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) { toast.error("Gagal mengirim tautan pemulihan"); return; }
    toast.success("Jika email terdaftar, tautan pemulihan telah dikirim.");
    setResetOpen(false);
  }
  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Gagal masuk dengan Google");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-sea relative hidden flex-col justify-between p-10 text-ocean-foreground lg:flex">
        <div className="contour absolute inset-0" />
        <div className="relative"><Logo light /></div>
        <div className="relative">
          <h2 className="text-3xl font-bold">Ruang kerja pengelola data.</h2>
          <p className="mt-3 max-w-md text-ocean-foreground/75">Produsen Data OPD mengunggah dataset, Wali Data Diskominfo memverifikasi, dan publik memperoleh data yang tepercaya.</p>
        </div>
        <p className="relative text-xs text-ocean-foreground/60">Akun baru tidak memiliki peran sampai ditetapkan oleh Super Admin.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <Tabs defaultValue="masuk">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="masuk">Masuk</TabsTrigger>
              <TabsTrigger value="daftar">Daftar</TabsTrigger>
            </TabsList>
            <TabsContent value="masuk">
              <form onSubmit={signIn} className="mt-4 space-y-4">
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Kata sandi</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button className="w-full" disabled={busy}>Masuk</Button>
                <button type="button" onClick={() => { setResetEmail(email); setResetOpen(true); }} className="block w-full text-center text-sm text-primary hover:underline">Lupa kata sandi?</button>
              </form>
            </TabsContent>
            <TabsContent value="daftar">
              <form onSubmit={signUp} className="mt-4 space-y-4">
                <div className="space-y-1.5"><Label>Nama lengkap</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Kata sandi</Label><Input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button className="w-full" disabled={busy}>Buat akun</Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />atau<span className="h-px flex-1 bg-border" /></div>
          <Button variant="outline" className="w-full" onClick={google}>Lanjutkan dengan Google</Button>
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lupa kata sandi</DialogTitle>
                <DialogDescription>Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.</DialogDescription>
              </DialogHeader>
              <form onSubmit={forgot} className="space-y-4">
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} /></div>
                <Button className="w-full" disabled={busy}>Kirim tautan pemulihan</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
