import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, NoAccess } from "@/components/dash-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { leaderPhotosQuery, settingsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard/pengaturan")({
  component: Settings,
});

type LeaderKey = "bupati_photo_url" | "wabup_photo_url";

function Settings() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const { data: leaders } = useQuery(leaderPhotosQuery);
  const [f, setF] = useState({ portal_name: "", tagline: "", contact_email: "", contact_phone: "", address: "" });
  const [photos, setPhotos] = useState<Record<LeaderKey, string | null>>({ bupati_photo_url: null, wabup_photo_url: null });
  const [uploading, setUploading] = useState<LeaderKey | null>(null);
  useEffect(() => {
    if (data) {
      const row = data as typeof data & { bupati_photo_url?: string | null; wabup_photo_url?: string | null };
      setF({ portal_name: data.portal_name, tagline: data.tagline ?? "", contact_email: data.contact_email ?? "", contact_phone: data.contact_phone ?? "", address: data.address ?? "" });
      setPhotos({ bupati_photo_url: row.bupati_photo_url ?? null, wabup_photo_url: row.wabup_photo_url ?? null });
    }
  }, [data]);
  if (!hasRole("admin")) return <NoAccess />;

  async function uploadPhoto(key: LeaderKey, file: File) {
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran foto maksimal 5 MB"); return; }
    setUploading(key);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `leaders/${key === "bupati_photo_url" ? "bupati" : "wabup"}.${ext}`;
    const { error } = await supabase.storage.from("portal-assets").upload(path, file, { upsert: true, contentType: file.type });
    setUploading(null);
    if (error) { toast.error(error.message); return; }
    setPhotos((p) => ({ ...p, [key]: path }));
    toast.success("Foto diunggah — jangan lupa Simpan");
  }

  async function save() {
    const payload = { ...f, ...photos, updated_at: new Date().toISOString() } as never;
    const { error } = await supabase.from("portal_settings").update(payload).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Pengaturan disimpan");
    qc.invalidateQueries({ queryKey: ["portal_settings"] });
    qc.invalidateQueries({ queryKey: ["leader_photos"] });
  }

  const field = (k: keyof typeof f, label: string, area = false) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {area ? <Textarea value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /> : <Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
    </div>
  );

  const photoField = (key: LeaderKey, label: string, preview: string | null) => {
    const inputRef = { current: null as HTMLInputElement | null };
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-4">
          {preview ? (
            <img src={preview} alt={label} className="h-24 w-24 rounded-2xl border object-cover" />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-2xl border border-dashed bg-muted text-xs text-muted-foreground">Belum ada</div>
          )}
          <div className="flex flex-col gap-2">
            <input
              ref={(el) => { inputRef.current = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadPhoto(key, file); e.target.value = ""; }}
            />
            <Button type="button" variant="outline" size="sm" disabled={uploading === key} onClick={() => inputRef.current?.click()}>
              <ImagePlus className="mr-2 h-4 w-4" /> {uploading === key ? "Mengunggah…" : "Pilih foto"}
            </Button>
            {photos[key] && (
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setPhotos((p) => ({ ...p, [key]: null }))}>
                <Trash2 className="mr-2 h-4 w-4" /> Hapus
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Pengaturan Portal" desc="Identitas dan kontak yang tampil di portal publik" />
      <div className="max-w-2xl space-y-4 rounded-2xl border bg-card shadow-soft p-6">
        {field("portal_name", "Nama portal")}
        {field("tagline", "Tagline", true)}
        <div className="grid gap-4 sm:grid-cols-2">{field("contact_email", "Email kontak")}{field("contact_phone", "Telepon")}</div>
        {field("address", "Alamat", true)}
        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-semibold">Foto Pimpinan Daerah</p>
          <p className="mb-4 text-xs text-muted-foreground">Foto ini tampil di seksi Sambutan Pimpinan Daerah pada beranda. Format gambar (JPG/PNG), maksimal 5 MB.</p>
          <div className="grid gap-6 sm:grid-cols-2">
            {photoField("bupati_photo_url", "Foto Bupati", leaders?.bupati ?? null)}
            {photoField("wabup_photo_url", "Foto Wakil Bupati", leaders?.wabup ?? null)}
          </div>
        </div>
        <div className="flex justify-end"><Button onClick={save}>Simpan</Button></div>
      </div>
    </div>
  );
}
