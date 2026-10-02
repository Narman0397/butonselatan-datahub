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
    split(l).map((v) => (v !== "" && !isNaN(Number(v)) ? Number(v) : v)),
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
  const [head = [], ...body] = all;
  return { columns: head.map((h) => String(h ?? "")), rows: body.slice(0, maxRows) };
}

export function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
