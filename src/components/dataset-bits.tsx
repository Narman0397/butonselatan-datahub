import { Link } from "@tanstack/react-router";
import { Download, Eye, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type DatasetStatus, type SampleData } from "@/lib/data";

const FORMAT_CLASS: Record<string, string> = {
  CSV: "bg-success/15 text-success border-success/30",
  XLSX: "bg-primary/10 text-primary border-primary/30",
  PDF: "bg-destructive/10 text-destructive border-destructive/30",
};

export function FormatBadge({ format }: { format: string }) {
  return (
    <span className={cn("inline-flex rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold", FORMAT_CLASS[format] ?? "bg-muted")}>
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
      className="group flex flex-col rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="mb-3 flex items-center gap-2">
        <FormatBadge format={ds.format} />
        {ds.topics && <span className="text-xs text-muted-foreground">{ds.topics.name}</span>}
      </div>
      <h3 className="font-display text-base font-semibold leading-snug group-hover:text-primary">{ds.title}</h3>
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
    <div className="overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
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
