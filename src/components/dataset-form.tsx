import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { FORMATS, FREQUENCIES, LICENSES, openDatasetFile, orgsQuery, parseCsv, parseXlsx, slugify, topicsQuery, type SampleData } from "@/lib/data";
import { SampleTable } from "@/components/dataset-bits";

export type EditableDataset = {
  id: string;
  title: string;
  description: string | null;
  organization_id: string;
  topic_id: string | null;
  format: string;
  license: string;
  frequency: string | null;
  tags: string[];
  sample_data: unknown;
  file_url: string | null;
  file_name: string | null;
  status: string;
  review_note: string | null;
};

export function DatasetForm({ initial, onDone }: { initial?: EditableDataset | undefined; onDone: () => void }) {
  const { profile, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const { data: orgs = [] } = useQuery(orgsQuery);
  const { data: topics = [] } = useQuery(topicsQuery);
  const [f, setF] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    organization_id: initial?.organization_id ?? profile?.organization_id ?? "",
    topic_id: initial?.topic_id ?? "",
    format: initial?.format ?? "CSV",
    license: initial?.license ?? "CC-BY 4.0",
    frequency: initial?.frequency ?? "Tahunan",
    tags: (initial?.tags ?? []).join(", "),
  });
  const [file, setFile] = useState<File | null>(null);
  const [sample, setSample] = useState<SampleData | null>((initial?.sample_data as SampleData) ?? null);
  const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function onFile(fl: File | null) {
    setFile(fl);
    if (!fl) return;
    const ext = fl.name.split(".").pop()?.toUpperCase();
    if (ext && (FORMATS as readonly string[]).includes(ext)) up("format", ext);
    try {
      if (ext === "CSV") setSample(parseCsv(await fl.text()));
      else if (ext === "XLSX" || ext === "XLS") setSample(await parseXlsx(await fl.arrayBuffer()));
    } catch { toast.error("Gagal membaca pratinjau file"); }
  }

  async function save(submit: boolean) {
    if (!f.title || !f.organization_id) { toast.error("Judul dan OPD wajib diisi"); return; }
    setBusy(true);
    try {
      let file_url = initial?.file_url ?? null;
      let file_name = initial?.file_name ?? null;
      if (file) {
        const path = `${f.organization_id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("dataset-files").upload(path, file);
        if (error) throw error;
        file_url = path;
        file_name = file.name;
      }
      const payload = {
        title: f.title,
        description: f.description,
        organization_id: f.organization_id,
        topic_id: f.topic_id || null,
        format: f.format,
        license: f.license,
        frequency: f.frequency,
        tags: f.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
        sample_data: sample,
        file_url,
        file_name,
        status: (submit ? "pending" : "draft") as "pending" | "draft",
      };
      const { error } = initial
        ? await supabase.from("datasets").update(payload).eq("id", initial.id)
        : await supabase.from("datasets").insert({ ...payload, slug: slugify(f.title) });
      if (error) throw error;
      toast.success(submit ? "Dataset diajukan untuk verifikasi" : "Draft disimpan");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {initial?.status === "rejected" && initial.review_note && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <b className="text-destructive">Catatan Wali Data:</b> {initial.review_note}
        </div>
      )}
      <div className="space-y-1.5"><Label>Judul dataset *</Label><Input value={f.title} onChange={(e) => up("title", e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea rows={3} value={f.description} onChange={(e) => up("description", e.target.value)} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>OPD *</Label>
          <Select value={f.organization_id} onValueChange={(v) => up("organization_id", v)} disabled={!isAdmin}>
            <SelectTrigger><SelectValue placeholder="Pilih OPD" /></SelectTrigger>
            <SelectContent>{orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.acronym} — {o.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Topik</Label>
          <Select value={f.topic_id} onValueChange={(v) => up("topic_id", v)}>
            <SelectTrigger><SelectValue placeholder="Pilih topik" /></SelectTrigger>
            <SelectContent>{topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Format</Label>
          <Select value={f.format} onValueChange={(v) => up("format", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FORMATS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Lisensi</Label>
          <Select value={f.license} onValueChange={(v) => up("license", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LICENSES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Frekuensi pembaruan</Label>
          <Select value={f.frequency} onValueChange={(v) => up("frequency", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FREQUENCIES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Tag (pisahkan koma)</Label><Input value={f.tags} onChange={(e) => up("tags", e.target.value)} /></div>
      </div>
      <div className="space-y-1.5">
        <Label>File resource (CSV, XLSX, PDF)</Label>
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 text-sm hover:bg-secondary/50">
          <Upload className="h-5 w-5 text-primary" />
          <span className="flex-1 truncate">{file?.name ?? initial?.file_name ?? "Pilih file untuk diunggah…"}</span>
          <input type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
        {initial?.file_url && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted p-2 text-xs">
            <span className="min-w-0 flex-1 truncate">Berkas tersimpan: <b>{initial.file_name}</b>{file ? " — akan diganti berkas baru" : " — tetap dipakai bila tidak diganti"}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => openDatasetFile(initial.file_url!, initial.file_name, "open").catch((e) => toast.error(e.message))}><ExternalLink className="h-3.5 w-3.5" /> Buka</Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">File CSV dan XLSX otomatis menghasilkan pratinjau tabel untuk publik.</p>
      </div>
      {sample && sample.columns.length > 0 && (
        <div className="space-y-1.5">
          <Label>Pratinjau ({sample.rows.length} baris)</Label>
          <div className="max-h-48 overflow-auto"><SampleTable data={sample} max={10} /></div>
        </div>
      )}
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" disabled={busy} onClick={() => save(false)}>Simpan Draft</Button>
        <Button disabled={busy} onClick={() => save(true)}>Ajukan Verifikasi</Button>
      </div>
    </div>
  );
}
