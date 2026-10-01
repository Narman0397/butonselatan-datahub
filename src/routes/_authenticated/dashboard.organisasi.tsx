import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, NoAccess } from "@/components/dash-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orgsQuery, topicsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard/organisasi")({
  component: OrgAdmin,
});

type Row = { id?: string; name: string; acronym?: string | null; description?: string | null };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function OrgAdmin() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const { data: orgs = [] } = useQuery(orgsQuery);
  const { data: topics = [] } = useQuery(topicsQuery);
  const [edit, setEdit] = useState<{ kind: "organizations" | "topics"; row: Row } | null>(null);
  if (!hasRole("admin")) return <NoAccess />;

  async function save() {
    if (!edit || !edit.row.name) return;
    const { kind, row } = edit;
    const payload =
      kind === "organizations"
        ? { name: row.name, acronym: row.acronym ?? null, description: row.description ?? null, slug: slug(row.acronym || row.name) }
        : { name: row.name, description: row.description ?? null, slug: slug(row.name) };
    const { error } = row.id
      ? await supabase.from(kind as "organizations").update(payload as { name: string }).eq("id", row.id)
      : await supabase.from(kind as "organizations").insert(payload as { name: string; slug: string });
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan");
    setEdit(null);
    qc.invalidateQueries({ queryKey: [kind] });
  }
  async function remove(kind: "organizations" | "topics", id: string) {
    if (!confirm(kind === "organizations" ? "Menghapus OPD juga menghapus seluruh datasetnya. Lanjutkan?" : "Hapus topik ini?")) return;
    const { error } = await supabase.from(kind).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: [kind] });
  }

  const table = (kind: "organizations" | "topics", rows: Row[]) => (
    <div className="max-w-full overflow-x-auto rounded-2xl border bg-card shadow-soft">
      <div className="flex justify-end border-b p-3">
        <Button size="sm" onClick={() => setEdit({ kind, row: { name: "" } })}><Plus className="h-4 w-4" /> Tambah</Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          {kind === "organizations" && <TableHead>Singkatan</TableHead>}
          <TableHead>Nama</TableHead><TableHead className="hidden md:table-cell">Deskripsi</TableHead><TableHead className="text-right">Aksi</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              {kind === "organizations" && <TableCell className="font-semibold text-primary">{r.acronym}</TableCell>}
              <TableCell>{r.name}</TableCell>
              <TableCell className="hidden max-w-sm truncate text-sm text-muted-foreground md:table-cell">{r.description}</TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" onClick={() => setEdit({ kind, row: r })}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(kind, r.id!)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div>
      <PageHeader title="OPD & Topik" desc="Kelola organisasi perangkat daerah dan topik sektoral" />
      <Tabs defaultValue="opd">
        <TabsList><TabsTrigger value="opd">Organisasi / OPD</TabsTrigger><TabsTrigger value="topik">Topik</TabsTrigger></TabsList>
        <TabsContent value="opd" className="mt-4">{table("organizations", orgs)}</TabsContent>
        <TabsContent value="topik" className="mt-4">{table("topics", topics)}</TabsContent>
      </Tabs>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.row.id ? "Ubah" : "Tambah"} {edit?.kind === "organizations" ? "OPD" : "Topik"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Nama</Label><Input value={edit.row.name} onChange={(e) => setEdit({ ...edit, row: { ...edit.row, name: e.target.value } })} /></div>
              {edit.kind === "organizations" && (
                <div className="space-y-1.5"><Label>Singkatan</Label><Input value={edit.row.acronym ?? ""} onChange={(e) => setEdit({ ...edit, row: { ...edit.row, acronym: e.target.value } })} /></div>
              )}
              <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea value={edit.row.description ?? ""} onChange={(e) => setEdit({ ...edit, row: { ...edit.row, description: e.target.value } })} /></div>
              <div className="flex justify-end"><Button onClick={save}>Simpan</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
