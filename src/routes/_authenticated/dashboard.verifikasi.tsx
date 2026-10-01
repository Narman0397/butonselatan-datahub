import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, NoAccess } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormatBadge, SampleTable, StatusBadge } from "@/components/dataset-bits";
import { DATASET_FIELDS, formatDate, type DatasetStatus, type SampleData } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard/verifikasi")({
  component: Verify,
});

function Verify() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const allowed = hasRole("wali_data") || hasRole("admin");
  const [tab, setTab] = useState<DatasetStatus>("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const { data = [] } = useQuery({
    queryKey: ["verify", tab],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select(DATASET_FIELDS).eq("status", tab).order("updated_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (!allowed) return <NoAccess />;
  const current = data.find((d) => d.id === openId);

  async function decide(status: "published" | "rejected") {
    if (!current) return;
    if (status === "rejected" && !note.trim()) return toast.error("Catatan penolakan wajib diisi");
    const { error } = await supabase.from("datasets").update({ status, review_note: status === "rejected" ? note : null }).eq("id", current.id);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Dataset diterbitkan" : "Dataset ditolak dengan catatan");
    setOpenId(null);
    setNote("");
    qc.invalidateQueries();
  }

  const sample = current?.sample_data as SampleData | null;

  return (
    <div>
      <PageHeader title="Kurasi & Verifikasi" desc="Tinjau dataset yang diajukan OPD sebelum diterbitkan ke publik" />
      <Tabs value={tab} onValueChange={(v) => setTab(v as DatasetStatus)} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Menunggu</TabsTrigger>
          <TabsTrigger value="published">Diterbitkan</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dataset</TableHead>
              <TableHead className="hidden md:table-cell">OPD</TableHead>
              <TableHead className="hidden sm:table-cell">Format</TableHead>
              <TableHead className="hidden lg:table-cell">Diajukan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Tidak ada dataset pada status ini.</TableCell></TableRow>}
            {data.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="max-w-xs"><div className="truncate font-medium">{d.title}</div><div className="text-xs text-muted-foreground">{d.topics?.name}</div></TableCell>
                <TableCell className="hidden md:table-cell">{d.organizations?.acronym}</TableCell>
                <TableCell className="hidden sm:table-cell"><FormatBadge format={d.format} /></TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatDate(d.updated_at)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant={tab === "pending" ? "default" : "outline"} onClick={() => { setOpenId(d.id); setNote(d.review_note ?? ""); }}>
                    <Eye className="h-4 w-4" /> Tinjau
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!current} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {current && (
            <>
              <DialogHeader><DialogTitle>{current.title}</DialogTitle></DialogHeader>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <StatusBadge status={current.status} /><FormatBadge format={current.format} />
                <span className="text-muted-foreground">{current.organizations?.name}</span>
              </div>
              <p className="text-sm text-muted-foreground">{current.description}</p>
              <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-4 text-sm sm:grid-cols-4">
                <div><dt className="text-xs text-muted-foreground">Topik</dt><dd>{current.topics?.name ?? "-"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Lisensi</dt><dd>{current.license}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Frekuensi</dt><dd>{current.frequency}</dd></div>
                <div><dt className="text-xs text-muted-foreground">File</dt><dd className="truncate">{current.file_name ?? "-"}</dd></div>
              </dl>
              {sample ? <div className="max-h-64 overflow-auto"><SampleTable data={sample} max={20} /></div> : <p className="text-sm text-muted-foreground">Tidak ada pratinjau data.</p>}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Catatan reviu (wajib jika ditolak)</label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. Lengkapi satuan pada kolom produksi…" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="text-destructive" onClick={() => decide("rejected")}><XCircle className="h-4 w-4" /> Tolak</Button>
                {current.status !== "published" && (
                  <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={() => decide("published")}><CheckCircle2 className="h-4 w-4" /> Terbitkan</Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
