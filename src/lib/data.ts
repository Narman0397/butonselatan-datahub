import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SampleData = { columns: string[]; rows: (string | number | null)[][] };
export type DatasetStatus = "draft" | "pending" | "published" | "rejected";

export const FORMATS = ["CSV", "XLSX", "PDF"] as const;
export const LICENSES = ["CC-BY 4.0", "CC-BY-SA 4.0", "CC0 1.0", "Open Government License", "Terbatas"] as const;
export const FREQUENCIES = ["Bulanan", "Triwulanan", "Semesteran", "Tahunan", "Sekali"] as const;

export const STATUS_LABEL: Record<DatasetStatus, string> = {
  draft: "Draft",
  pending: "Menunggu Verifikasi",
  published: "Diterbitkan",
  rejected: "Ditolak",
};

export const DATASET_FIELDS =
  "id, title, slug, description, format, license, frequency, tags, status, review_note, sample_data, file_url, file_name, downloads, views, created_at, updated_at, published_at, organization_id, topic_id, organizations(id, name, acronym, slug), topics(id, name, slug)";

export const orgsQuery = queryOptions({
  queryKey: ["organizations"],
  queryFn: async () => {
    const { data, error } = await supabase.from("organizations").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const topicsQuery = queryOptions({
  queryKey: ["topics"],
  queryFn: async () => {
    const { data, error } = await supabase.from("topics").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const publishedQuery = queryOptions({
  queryKey: ["datasets", "published"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("datasets")
      .select(DATASET_FIELDS)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["portal_settings"],
  queryFn: async () => {
    const { data } = await supabase.from("portal_settings").select("*").eq("id", 1).maybeSingle();
    return data;
  },
});

export type LeaderPhotos = { bupati: string | null; wabup: string | null; logo: string | null };

export const leaderPhotosQuery = queryOptions({
  queryKey: ["leader_photos"],
  staleTime: 1000 * 60 * 60,
  queryFn: async (): Promise<LeaderPhotos> => {
    const { data: row } = await supabase.from("portal_settings").select("*").eq("id", 1).maybeSingle();
    const sign = async (path?: string | null) => {
      if (!path) return null;
      const { data: signed } = await supabase.storage.from("portal-assets").createSignedUrl(path, 60 * 60 * 24 * 7);
      return signed?.signedUrl ?? null;
    };
    const [bupati, wabup, logo] = await Promise.all([sign(row?.bupati_photo_url), sign(row?.wabup_photo_url), sign(row?.logo_url)]);
    return { bupati, wabup, logo };
  },
});

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) +
    "-" +
    Math.random().toString(36).slice(2, 6)
  );
}

export function parseCsv(text: string, maxRows = 50): SampleData {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
      } else if ((c === "," || c === ";") && !q) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };
  const [head, ...body] = lines;
  const columns = head ? split(head) : [];
  const rows = body.slice(0, maxRows).map((l) =>
    split(l).map(normalizeCell),
  );
  return { columns, rows };
}

export function toCsv(s: SampleData) {
  const esc = (v: unknown) => {
    const t = v == null ? "" : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [s.columns.map(esc).join(","), ...s.rows.map((r) => r.map(esc).join(","))].join("\n");
}

export async function downloadDataset(ds: {
  id: string;
  slug: string;
  file_url: string | null;
  file_name: string | null;
  sample_data: unknown;
}) {
  await supabase.rpc("increment_dataset_stat", { _id: ds.id, _kind: "download" });
  if (ds.file_url) {
    const { data } = await supabase.storage.from("dataset-files").createSignedUrl(ds.file_url, 120, {
      download: ds.file_name ?? true,
    });
    if (data?.signedUrl) {
      window.location.href = data.signedUrl;
      return;
    }
  }
  const sample = ds.sample_data as SampleData | null;
  if (!sample) return;
  const blob = new Blob([toCsv(sample)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${ds.slug}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Open (inline, new tab) or download a private dataset file via short-lived signed URL. */
export async function openDatasetFile(path: string, fileName: string | null, mode: "open" | "download") {
  const win = mode === "open" ? window.open("", "_blank") : null;
  const { data, error } = await supabase.storage
    .from("dataset-files")
    .createSignedUrl(path, 300, mode === "download" ? { download: fileName ?? true } : undefined);
  if (error || !data?.signedUrl) {
    win?.close();
    throw error ?? new Error("Berkas tidak ditemukan");
  }
  if (win) win.location.href = data.signedUrl;
  else window.location.href = data.signedUrl;
}

export async function parseXlsx(buf: ArrayBuffer, maxRows = 50): Promise<SampleData> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]!];
  if (!ws) return { columns: [], rows: [] };
  const all = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: null, blankrows: false });
  // Header = baris dengan sel terisi terbanyak di 10 baris pertama (melewati judul tabel Excel)
  let hi = 0, best = -1;
  all.slice(0, 10).forEach((r, i) => { const n = r.filter((v) => v != null && String(v).trim() !== "").length; if (n > best) { best = n; hi = i; } });
  const head = all[hi] ?? [];
  const body = all.slice(hi + 1).filter((r) => r.some((v) => v != null && String(v).trim() !== ""));
  return { columns: head.map((h, i) => String(h ?? `Kolom ${i + 1}`).trim()), rows: body.slice(0, maxRows).map((r) => head.map((_, j) => normalizeCell(r[j]))) };
}

export function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const EMPTY = new Set(["", "-", "–", "n/a", "na", "null", "nan", "#n/a", "tidak ada"]);

/** Parser angka cerdas: format Indonesia (1.234,56), internasional (1,234.56), persen, Rp; nilai kosong -> null. */
export function parseNum(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (raw == null) return null;
  let t = String(raw).trim().replace(/^rp\.?\s*/i, "").replace(/%$/, "").replace(/\s/g, "");
  if (EMPTY.has(t.toLowerCase())) return null;
  if (!/^[-+]?[\d.,]+$/.test(t)) return NaN;
  const lastDot = t.lastIndexOf("."), lastComma = t.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    t = lastComma > lastDot ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (lastComma >= 0) {
    t = /^[-+]?\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, "") : t.replace(",", ".");
  } else if ((t.match(/\./g) ?? []).length > 1 || /^[-+]?\d{1,3}\.\d{3}$/.test(t)) {
    t = t.replace(/\./g, ""); // 1.234 atau 1.234.567 = ribuan (format Indonesia)
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export function normalizeCell(v: unknown): string | number | null {
  const n = parseNum(v);
  if (n === null) return null;
  if (Number.isNaN(n)) return String(v).trim();
  return n;
}

/** Kolom numerik: semua nilai non-kosong angka, minimal satu angka. */
export function numericColumns(s: SampleData) {
  return s.columns.filter((_, i) => {
    const vals = s.rows.map((r) => r[i]).filter((v) => v != null && v !== "");
    return vals.length > 0 && vals.every((v) => typeof v === "number");
  });
}

export type LicenseInfo = { summary: string; can: string[]; must: string[]; open: boolean };
export const LICENSE_INFO: Record<string, LicenseInfo> = {
  "CC-BY 4.0": { open: true, summary: "Bebas digunakan, dibagikan, dan diolah, termasuk untuk tujuan komersial.", can: ["Menyalin & menyebarluaskan", "Mengolah & menggabungkan", "Penggunaan komersial"], must: ["Mencantumkan sumber (atribusi) ke produsen data"] },
  "CC-BY-SA 4.0": { open: true, summary: "Bebas digunakan dan diolah, tetapi hasil turunan wajib dibagikan dengan lisensi yang sama.", can: ["Menyalin & menyebarluaskan", "Mengolah & menggabungkan", "Penggunaan komersial"], must: ["Mencantumkan sumber", "Karya turunan berlisensi CC-BY-SA yang sama"] },
  "CC0 1.0": { open: true, summary: "Domain publik: dapat digunakan untuk apa pun tanpa syarat.", can: ["Semua bentuk penggunaan tanpa izin"], must: ["Tidak ada kewajiban (atribusi tetap dianjurkan)"] },
  "Open Government License": { open: true, summary: "Data resmi pemerintah yang terbuka untuk dimanfaatkan publik.", can: ["Menyalin, mengolah, dan menerbitkan ulang", "Penggunaan komersial"], must: ["Mencantumkan sumber", "Tidak menyiratkan dukungan resmi pemerintah"] },
  Terbatas: { open: false, summary: "Akses berkas terbatas. Unduhan memerlukan permohonan yang disetujui Wali Data.", can: ["Melihat metadata & pratinjau ringkas"], must: ["Mengajukan permohonan data", "Menggunakan sesuai tujuan yang disetujui"] },
};

export function buildCitation(ds: { title: string; license: string; slug: string; published_at: string | null; organizations: { name: string } | null }, origin: string) {
  const year = ds.published_at ? new Date(ds.published_at).getFullYear() : new Date().getFullYear();
  return `${ds.organizations?.name ?? "Pemerintah Kabupaten Buton Selatan"} (${year}). ${ds.title}. Portal Satu Data Kabupaten Buton Selatan. Lisensi ${ds.license}. ${origin}/dataset/${ds.slug}`;
}
