import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL, type AppRole } from "@/lib/auth";
import { PageHeader, NoAccess } from "@/components/dash-bits";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orgsQuery } from "@/lib/data";
import { useServerFn } from "@tanstack/react-start";
import { createPortalUser } from "@/lib/users.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/pengguna")({
  head: () => ({ meta: [{ title: "Pengguna dan Peran — Satu Data Buton Selatan" }, { name: "description", content: "Kelola pengguna dan hak akses portal Satu Data Buton Selatan." }, { property: "og:title", content: "Pengguna dan Peran — Satu Data Buton Selatan" }, { property: "og:description", content: "Kelola pengguna dan hak akses portal Satu Data Buton Selatan." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Users,
});

const ROLES: AppRole[] = ["produsen", "wali_data", "admin"];
const NONE = "__none";

function Users() {
  const { hasRole, user, refresh } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", org: NONE, roles: ["produsen"] as AppRole[] });
  const createFn = useServerFn(createPortalUser);
  const { data: orgs = [] } = useQuery(orgsQuery);
  const { data } = useQuery({
    queryKey: ["admin-users"],
    enabled: hasRole("admin"),
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      return (profiles ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole) }));
    },
  });

  if (!hasRole("admin")) return <NoAccess />;

  async function toggleRole(uid: string, role: AppRole, on: boolean) {
    if (uid === user?.id && role === "admin" && !on) { toast.error("Anda tidak dapat mencabut peran admin sendiri"); return; }
    const { error } = on
      ? await supabase.from("user_roles").insert({ user_id: uid, role })
      : await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    if (error) { toast.error(error.message); return; }
    toast.success("Peran diperbarui");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    if (uid === user?.id) refresh();
  }
  async function setOrg(uid: string, org: string) {
    const { error } = await supabase.from("profiles").update({ organization_id: org === NONE ? null : org }).eq("id", uid);
    if (error) { toast.error(error.message); return; }
    toast.success("OPD diperbarui");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    if (uid === user?.id) refresh();
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createFn({ data: { full_name: form.full_name, email: form.email, password: form.password, organization_id: form.org === NONE ? null : form.org, roles: form.roles } });
      toast.success("Pengguna berhasil ditambahkan");
      setAddOpen(false);
      setForm({ full_name: "", email: "", password: "", org: NONE, roles: ["produsen"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah pengguna");
    } finally { setBusy(false); }
  }

  const list = (data ?? []).filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Pengguna & Peran" desc="Tetapkan peran dan OPD untuk setiap akun. Pengguna mendaftar sendiri melalui halaman Masuk." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama atau email…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setAddOpen(true)}><UserPlus className="mr-2 h-4 w-4" />Tambah Pengguna</Button>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Pengguna</DialogTitle>
            <DialogDescription>Akun langsung aktif. Sampaikan email dan kata sandi awal kepada pengguna, lalu minta mereka menggantinya di menu Profil Saya.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addUser} className="space-y-4">
            <div className="space-y-1.5"><Label>Nama lengkap</Label><Input required maxLength={120} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Kata sandi awal</Label><Input type="text" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><p className="text-xs text-muted-foreground">Minimal 8 karakter.</p></div>
            <div className="space-y-1.5"><Label>OPD / Instansi</Label>
              <Select value={form.org} onValueChange={(v) => setForm({ ...form, org: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Tidak ada —</SelectItem>
                  {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.acronym} — {o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Peran</Label>
              <div className="flex flex-wrap gap-4">
                {ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.roles.includes(r)} onCheckedChange={(c) => setForm({ ...form, roles: c ? [...form.roles, r] : form.roles.filter((x) => x !== r) })} />
                    {ROLE_LABEL[r]}
                  </label>
                ))}
              </div>
            </div>
            <Button className="w-full" disabled={busy}>{busy ? "Menyimpan…" : "Buat akun"}</Button>
          </form>
        </DialogContent>
      </Dialog>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead>OPD</TableHead>
              {ROLES.map((r) => <TableHead key={r} className="text-center">{ROLE_LABEL[r]}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((u) => (
              <TableRow key={u.id}>
                <TableCell><div className="font-medium">{u.full_name}</div><div className="text-xs text-muted-foreground">{u.email}</div></TableCell>
                <TableCell className="min-w-48">
                  <Select value={u.organization_id ?? NONE} onValueChange={(v) => setOrg(u.id, v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Tidak ada —</SelectItem>
                      {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.acronym}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                {ROLES.map((r) => (
                  <TableCell key={r} className="text-center">
                    <Checkbox checked={u.roles.includes(r)} onCheckedChange={(c) => toggleRole(u.id, r, !!c)} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
