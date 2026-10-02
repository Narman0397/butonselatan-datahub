import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Send, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, NoAccess } from "@/components/dash-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormatBadge, StatusBadge } from "@/components/dataset-bits";
import { DatasetForm, type EditableDataset } from "@/components/dataset-form";
import { formatDate, type DatasetStatus } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard/dataset")({
  component: MyDatasets,
});

function MyDatasets() {
  const { hasRole, profile } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EditableDataset | "new" | null>(null);
  const [tab, setTab] = useState<DatasetStatus | "all">("all");
  const [q, setQ] = useState("");
  const allowed = hasRole("produsen") || hasRole("admin");

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-datasets", profile?.organization_id],
    enabled: allowed,
    queryFn: async () => {
      let query = supabase.from("datasets").select("*, organizations(acronym)").order("updated_at", { ascending: false });
      if (!hasRole("admin") && profile?.organization_id) query = query.eq("organization_id", profile.organization_id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (!allowed) return <NoAccess />;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["my-datasets"] });
    qc.invalidateQueries({ queryKey: ["datasets"] });
  };

  async function submit(id: string) {
    const { error } = await supabase.from("datasets").update({ status: "pending" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Diajukan ke Wali Data"); refresh(); }
  }
  async function remove(id: string) {
    if (!confirm("Hapus dataset ini?")) return;
    const { error } = await supabase.from("datasets").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Dataset dihapus"); refresh(); }
  }

  const list = data.filter((d) => (tab === "all" || d.status === tab) && d.title.toLowerCase().includes(q.toLowerCase()));
  const noOrg = hasRole("produsen") && !hasRole("admin") && !profile?.organization_id;

  return (
    <div>
      <PageHeader
        title="Dataset Saya"
        desc="Kelola draft, perbarui resource, dan ajukan dataset untuk diverifikasi"
        action={<Button onClick={() => setEditing("new")} disabled={noOrg}><Plus className="h-4 w-4" /> Dataset baru</Button>}
      />
      {noOrg && <div className="mb-4 rounded-lg border border-warning bg-warning/15 p-3 text-sm">Akun Anda belum terhubung ke OPD. Minta Super Admin menetapkan OPD Anda.</div>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="pending">Menunggu</TabsTrigger>
            <TabsTrigger value="published">Terbit</TabsTrigger>
            <TabsTrigger value="rejected">Ditolak</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
      </div>
      <div className="max-w-full overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead className="hidden md:table-cell">OPD</TableHead>
              <TableHead className="hidden sm:table-cell">Format</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Diperbarui</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Memuat…</TableCell></TableRow>}
            {!isLoading && list.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada dataset.</TableCell></TableRow>}
            {list.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="max-w-xs">
                  <div className="truncate font-medium">{d.title}</div>
                  {d.status === "rejected" && d.review_note && <div className="truncate text-xs text-destructive">Catatan: {d.review_note}</div>}
                </TableCell>
                <TableCell className="hidden md:table-cell">{d.organizations?.acronym}</TableCell>
                <TableCell className="hidden sm:table-cell"><FormatBadge format={d.format} /></TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatDate(d.updated_at)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {d.file_url && (
                      <Button size="icon" variant="ghost" title="Unduh berkas" onClick={() => openDatasetFile(d.file_url!, d.file_name, "download").catch((e) => toast.error(e.message))}><Download className="h-4 w-4" /></Button>
                    )}
                    {d.status === "published" && (
                      <Button size="icon" variant="ghost" asChild title="Lihat"><Link to="/dataset/$slug" params={{ slug: d.slug }}><ExternalLink className="h-4 w-4" /></Link></Button>
                    )}
                    {(d.status === "draft" || d.status === "rejected") && (
                      <Button size="icon" variant="ghost" title="Ajukan" onClick={() => submit(d.id)}><Send className="h-4 w-4" /></Button>
                    )}
                    {d.status !== "pending" && (
                      <Button size="icon" variant="ghost" title="Edit" onClick={() => setEditing(d)}><Pencil className="h-4 w-4" /></Button>
                    )}
                    {(d.status === "draft" || d.status === "rejected" || hasRole("admin")) && (
                      <Button size="icon" variant="ghost" title="Hapus" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing === "new" ? "Dataset baru" : "Perbarui dataset"}</DialogTitle></DialogHeader>
          {editing && (
            <DatasetForm
              initial={editing === "new" ? undefined : editing}
              onDone={() => { setEditing(null); refresh(); }}
            />
          )}
          {editing && editing !== "new" && editing.status === "published" && (
            <p className="text-xs text-muted-foreground">Perubahan pada dataset terbit akan dikirim ulang ke Wali Data untuk verifikasi.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
