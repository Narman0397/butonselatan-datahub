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

export function formatDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
