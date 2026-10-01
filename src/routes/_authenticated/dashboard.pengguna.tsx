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

export const Route = createFileRoute("/_authenticated/dashboard/pengguna")({
  component: Users,
});

const ROLES: AppRole[] = ["produsen", "wali_data", "admin"];
const NONE = "__none";

function Users() {
  const { hasRole, user, refresh } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
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
    if (uid === user?.id && role === "admin" && !on) return toast.error("Anda tidak dapat mencabut peran admin sendiri");
    const { error } = on
      ? await supabase.from("user_roles").insert({ user_id: uid, role })
      : await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success("Peran diperbarui");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    if (uid === user?.id) refresh();
  }
  async function setOrg(uid: string, org: string) {
    const { error } = await supabase.from("profiles").update({ organization_id: org === NONE ? null : org }).eq("id", uid);
    if (error) return toast.error(error.message);
    toast.success("OPD diperbarui");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    if (uid === user?.id) refresh();
  }

  const list = (data ?? []).filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader title="Pengguna & Peran" desc="Tetapkan peran dan OPD untuk setiap akun. Pengguna mendaftar sendiri melalui halaman Masuk." />
      <div className="relative mb-4 w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari nama atau email…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
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
