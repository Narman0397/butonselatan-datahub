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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { leaderPhotosQuery, settingsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard/pengaturan")({
  component: Settings,
});

type ImgKey = "bupati_photo_url" | "wabup_photo_url" | "logo_url";
const TEXT_KEYS = [
  "portal_name", "tagline", "contact_email", "contact_phone", "address", "region_label",
  "instagram_url", "facebook_url", "youtube_url",
  "bupati_name", "bupati_title", "wabup_name", "wabup_title", "welcome_title", "welcome_body",
  "hero_kicker", "hero_title", "hero_description",
] as const;
type TextKey = (typeof TEXT_KEYS)[number];
const emptyText = Object.fromEntries(TEXT_KEYS.map((k) => [k, ""])) as Record<TextKey, string>;
const IMG_FILE: Record<ImgKey, string> = { bupati_photo_url: "leaders/bupati", wabup_photo_url: "leaders/wabup", logo_url: "branding/logo" };
const IMG_SIGNED: Record<ImgKey, "bupati" | "wabup" | "logo"> = { bupati_photo_url: "bupati", wabup_photo_url: "wabup", logo_url: "logo" };

function Settings() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const { data: signed } = useQuery(leaderPhotosQuery);
  const [f, setF] = useState(emptyText);
  const [imgs, setImgs] = useState<Record<ImgKey, string | null>>({ bupati_photo_url: null, wabup_photo_url: null, logo_url: null });
  const [uploading, setUploading] = useState<ImgKey | null>(null);
  const [previews, setPreviews] = useState<Partial<Record<ImgKey, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const next = { ...emptyText };
    for (const k of TEXT_KEYS) next[k] = (data[k] as string | null) ?? "";
    setF(next);
    setImgs({ bupati_photo_url: data.bupati_photo_url, wabup_photo_url: data.wabup_photo_url, logo_url: data.logo_url });
  }, [data]);
  if (!hasRole("admin")) return <NoAccess />;

  async function upload(key: ImgKey, file: File) {
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran gambar maksimal 5 MB"); return; }
    setUploading(key);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${IMG_FILE[key]}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("portal-assets").upload(path, file, { upsert: true, contentType: file.type });
    setUploading(null);
    if (error) { toast.error(error.message); return; }
    setImgs((p) => ({ ...p, [key]: path }));
    setPreviews((p) => ({ ...p, [key]: URL.createObjectURL(file) }));
    toast.success("Gambar diunggah — jangan lupa Simpan");
  }

  async function save() {
    setSaving(true);
    const text = Object.fromEntries(TEXT_KEYS.map((k) => [k, k === "portal_name" ? f[k].trim() : f[k].trim() || null]));
    if (!text.portal_name) { toast.error("Nama portal wajib diisi"); setSaving(false); return; }
    const { error } = await supabase.from("portal_settings").update({ ...text, ...imgs, updated_at: new Date().toISOString() } as never).eq("id", 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pengaturan disimpan");
    qc.invalidateQueries({ queryKey: ["portal_settings"] });
    qc.invalidateQueries({ queryKey: ["leader_photos"] });
  }

  const field = (k: TextKey, label: string, opts: { area?: boolean; placeholder?: string } = {}) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {opts.area ? (
        <Textarea rows={k === "welcome_body" ? 6 : 3} maxLength={3000} placeholder={opts.placeholder} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      ) : (
        <Input maxLength={300} placeholder={opts.placeholder} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      )}
    </div>
  );

  const imgField = (key: ImgKey, label: string) => {
    const preview = previews[key] ?? (imgs[key] ? signed?.[IMG_SIGNED[key]] ?? null : null);
    return <ImageField label={label} preview={preview} busy={uploading === key} hasValue={!!imgs[key]} contain={key === "logo_url"}
      onPick={(file) => upload(key, file)} onClear={() => { setImgs((p) => ({ ...p, [key]: null })); setPreviews((p) => ({ ...p, [key]: undefined })); }} />;
  };

  return (
    <div>
      <PageHeader title="Pengaturan Portal" desc="Identitas, pimpinan daerah, dan tampilan beranda portal publik" />
      <div className="max-w-3xl rounded-2xl border bg-card p-4 shadow-soft sm:p-6">
        <Tabs defaultValue="identitas">
          <TabsList className="mb-6 h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="identitas">Identitas & Branding</TabsTrigger>
            <TabsTrigger value="pimpinan">Pimpinan Daerah</TabsTrigger>
            <TabsTrigger value="beranda">Tampilan Beranda</TabsTrigger>
          </TabsList>

          <TabsContent value="identitas" className="space-y-4">
            {imgField("logo_url", "Logo / Lambang Daerah (PNG transparan disarankan)")}
            <div className="grid gap-4 sm:grid-cols-2">{field("portal_name", "Nama portal")}{field("region_label", "Label di bawah nama", { placeholder: "Kabupaten Buton Selatan" })}</div>
            {field("tagline", "Tagline", { area: true })}
            <div className="grid gap-4 sm:grid-cols-2">{field("contact_email", "Email kontak")}{field("contact_phone", "Telepon")}</div>
            {field("address", "Alamat", { area: true })}
            <div className="grid gap-4 sm:grid-cols-3">
              {field("instagram_url", "Instagram", { placeholder: "https://instagram.com/…" })}
              {field("facebook_url", "Facebook", { placeholder: "https://facebook.com/…" })}
              {field("youtube_url", "YouTube", { placeholder: "https://youtube.com/…" })}
            </div>
          </TabsContent>

          <TabsContent value="pimpinan" className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                {imgField("bupati_photo_url", "Foto Bupati")}
                {field("bupati_name", "Nama & gelar", { placeholder: "Nama lengkap Bupati" })}
                {field("bupati_title", "Jabatan", { placeholder: "Bupati Buton Selatan" })}
              </div>
              <div className="space-y-3">
                {imgField("wabup_photo_url", "Foto Wakil Bupati")}
                {field("wabup_name", "Nama & gelar", { placeholder: "Kosongkan bila tidak ada" })}
                {field("wabup_title", "Jabatan", { placeholder: "Wakil Bupati Buton Selatan" })}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Jika nama dan foto Wakil Bupati dikosongkan, kartunya tidak ditampilkan.</p>
            {field("welcome_title", "Judul sambutan")}
            {field("welcome_body", "Isi sambutan (pisahkan paragraf dengan baris kosong)", { area: true })}
          </TabsContent>

          <TabsContent value="beranda" className="space-y-4">
            {field("hero_kicker", "Label lokasi di atas judul", { placeholder: "Kabupaten Buton Selatan · Sulawesi Tenggara" })}
            {field("hero_title", "Judul utama")}
            {field("hero_description", "Deskripsi", { area: true })}
          </TabsContent>
        </Tabs>
        <div className="mt-6 flex justify-end border-t pt-4"><Button onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button></div>
      </div>
    </div>
  );
}

function ImageField({ label, preview, busy, hasValue, contain, onPick, onClear }: {
  label: string; preview: string | null; busy: boolean; hasValue: boolean; contain?: boolean; onPick: (f: File) => void; onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {preview ? (
          <img src={preview} alt={label} className={`h-24 w-24 rounded-2xl border bg-muted ${contain ? "object-contain p-2" : "object-cover"}`} />
        ) : (
          <div className="grid h-24 w-24 place-items-center rounded-2xl border border-dashed bg-muted text-xs text-muted-foreground">Belum ada</div>
        )}
        <div className="flex flex-col gap-2">
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onPick(file); e.target.value = ""; }} />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
            <ImagePlus className="mr-2 h-4 w-4" /> {busy ? "Mengunggah…" : "Pilih gambar"}
          </Button>
          {hasValue && <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onClear}><Trash2 className="mr-2 h-4 w-4" /> Hapus</Button>}
        </div>
      </div>
    </div>
  );
}
