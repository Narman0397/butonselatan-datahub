import { Link } from "@tanstack/react-router";
import { Download, Eye, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { CheckCircle2, Info, Lock } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LICENSE_INFO, STATUS_LABEL, numericColumns, type DatasetStatus, type SampleData } from "@/lib/data";

const FORMAT_CLASS: Record<string, string> = {
  CSV: "bg-success/15 text-success border-success/30",
  XLSX: "bg-primary/10 text-primary border-primary/30",
  PDF: "bg-destructive/10 text-destructive border-destructive/30",
};

export function FormatBadge({ format }: { format: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold", FORMAT_CLASS[format] ?? "bg-muted")}>
      {format}
    </span>
  );
}

const STATUS_CLASS: Record<DatasetStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/25 text-warning-foreground",
  published: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export function StatusBadge({ status }: { status: DatasetStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent font-medium", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

type CardDs = {
  slug: string;
  title: string;
  description: string | null;
  format: string;
  license: string;
  downloads: number;
  views: number;
  organizations: { name: string; acronym: string | null } | null;
  topics: { name: string } | null;
};

export function DatasetCard({ ds }: { ds: CardDs }) {
  return (
    <Link
      to="/dataset/$slug"
      params={{ slug: ds.slug }}
      className="group card-lift flex min-h-52 flex-col rounded-xl border border-border/80 bg-card p-5 hover:border-primary/35"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FormatBadge format={ds.format} />
        {ds.topics && <span className="truncate rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{ds.topics.name}</span>}
        <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium", LICENSE_INFO[ds.license]?.open === false ? "border-warning/40 bg-warning/15 text-warning-foreground" : "border-success/30 bg-success/10 text-success")}>
          {LICENSE_INFO[ds.license]?.open === false ? "Perlu Izin" : "Bebas Unduh"}
        </span>
      </div>
      <h3 className="break-words font-display text-base font-semibold leading-snug transition-colors group-hover:text-primary">{ds.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{ds.description}</p>
      <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 truncate">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          {ds.organizations?.acronym ?? ds.organizations?.name}
        </span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{ds.views}</span>
          <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" />{ds.downloads}</span>
        </span>
      </div>
    </Link>
  );
}

export function SampleTable({ data, max = 100 }: { data: SampleData; max?: number }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-2xl border bg-card shadow-soft">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-secondary">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
            {data.columns.map((c, j) => (
              <th key={c} className={cn("whitespace-nowrap px-3 py-2 text-left text-xs font-semibold", data.rows.every((r) => typeof r[j] === "number") && "text-right")}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.slice(0, max).map((r, i) => (
            <tr key={i} className="border-t hover:bg-secondary/50">
              <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
              {r.map((v, j) => (
                <td key={j} className={cn("whitespace-nowrap px-3 py-2", typeof v === "number" && "text-right font-mono tabular-nums")}>
                  {typeof v === "number" && !(Number.isInteger(v) && v >= 1900 && v <= 2100) ? v.toLocaleString("id-ID") : v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function chartSpec(data: SampleData) {
  const nums = numericColumns(data);
  const category = data.columns.find((c) => !nums.includes(c)) ?? data.columns[0] ?? "";
  const series = nums.filter((c) => c !== category).slice(0, 3);
  const rows = data.rows.map((r) => Object.fromEntries(data.columns.map((c, i) => [c, r[i]])));
  return { category, series, rows };
}

export function DatasetChart({ data, height = "h-80" }: { data: SampleData; height?: string }) {
  const { category, series, rows } = chartSpec(data);
  const [kind, setKind] = useState<"bar" | "line">("bar");
  if (!series.length)
    return <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Grafik belum dapat dibuat: tidak ada kolom berisi angka yang konsisten. Pastikan baris pertama adalah judul kolom dan nilai berupa angka.</p>;
  const config = Object.fromEntries(series.map((c, i) => [c, { label: c, color: `var(--chart-${i + 1})` }]));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Sumbu X: <b>{category}</b> · Nilai: {series.join(", ")}</span>
        <div className="flex gap-1">
          {(["bar", "line"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={cn("rounded-full border px-2.5 py-0.5", kind === k && "border-primary bg-primary/10 text-primary")}>{k === "bar" ? "Batang" : "Garis"}</button>
          ))}
        </div>
      </div>
      <ChartContainer config={config} className={cn(height, "w-full")}>
        {kind === "bar" ? (
          <BarChart data={rows}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={category} tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} width={60} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {series.map((c, i) => <Bar key={c} dataKey={c} fill={`var(--chart-${i + 1})`} radius={[4, 4, 0, 0]} />)}
          </BarChart>
        ) : (
          <LineChart data={rows}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey={category} tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} width={60} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {series.map((c, i) => <Line key={c} dataKey={c} stroke={`var(--chart-${i + 1})`} strokeWidth={2} dot={false} connectNulls />)}
          </LineChart>
        )}
      </ChartContainer>
    </div>
  );
}

export function LicenseInfoBox({ license, compact }: { license: string; compact?: boolean }) {
  const info = LICENSE_INFO[license];
  if (!info) return null;
  return (
    <div className={cn("rounded-xl border p-3 text-sm", info.open ? "border-primary/25 bg-primary/5" : "border-warning bg-warning/15")}>
      <p className="flex items-start gap-2 font-medium">{info.open ? <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <Lock className="mt-0.5 h-4 w-4 shrink-0" />}{info.summary}</p>
      {!compact && (
        <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
          <div><b>Boleh:</b><ul className="mt-1 space-y-0.5">{info.can.map((c) => <li key={c} className="flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />{c}</li>)}</ul></div>
          <div><b>Wajib:</b><ul className="mt-1 space-y-0.5">{info.must.map((c) => <li key={c} className="flex gap-1.5"><Info className="h-3.5 w-3.5 shrink-0 text-primary" />{c}</li>)}</ul></div>
        </div>
      )}
    </div>
  );
}
