import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, NoAccess } from "@/components/dash-bits";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, type DatasetStatus } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard/laporan")({
  head: () => ({ meta: [{ title: "Laporan Statistik — Satu Data Buton Selatan" }, { name: "description", content: "Rekapitulasi statistik dataset sektoral untuk pimpinan dan Bappeda." }, { property: "og:title", content: "Laporan Statistik — Satu Data Buton Selatan" }, { property: "og:description", content: "Rekapitulasi statistik dataset sektoral untuk pimpinan dan Bappeda." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Report,
});

type Row = { label: string; total: number; draft: number; pending: number; published: number; rejected: number; downloads: number; views: number };
const blank = (label: string): Row => ({ label, total: 0, draft: 0, pending: 0, published: 0, rejected: 0, downloads: 0, views: 0 });

function Report() {
  const { hasRole } = useAuth();
  const allowed = hasRole("wali_data") || hasRole("admin");
  const { data: ds = [] } = useQuery({
    queryKey: ["report-datasets"],
    enabled: allowed,
    queryFn: async () => {
      const { data, error } = await supabase.from("datasets").select("status, format, license, downloads, views, organizations(name, acronym), topics(name)");
      if (error) throw error;
      return data;
    },
  });
  if (!allowed) return <NoAccess />;

  const group = (fn: (d: (typeof ds)[number]) => string) => {
    const m = new Map<string, Row>();
    for (const d of ds) {
      const k = fn(d);
      const r = m.get(k) ?? blank(k);
      r.total++; r[d.status as DatasetStatus]++; r.downloads += d.downloads; r.views += d.views;
      m.set(k, r);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  };
  const byOrg = group((d) => d.organizations?.name ?? "Tanpa OPD");
  const byTopic = group((d) => d.topics?.name ?? "Tanpa topik");
  const byFormat = group((d) => d.format);
  const byLicense = group((d) => d.license);
  const total = group(() => "Total")[0] ?? blank("Total");
  const today = new Date().toLocaleDateString("id-ID", { dateStyle: "long" });

  const toSheet = (rows: Row[], name: string) =>
    XLSX.utils.json_to_sheet(rows.map((r) => ({ [name]: r.label, Total: r.total, Draft: r.draft, "Menunggu Verifikasi": r.pending, Diterbitkan: r.published, Ditolak: r.rejected, Unduhan: r.downloads, Kunjungan: r.views })));

  function exportXlsx() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Laporan Rekapitulasi Satu Data Kabupaten Buton Selatan"], ["Tanggal", today], [],
      ["Total dataset", total.total], ["Diterbitkan", total.published], ["Menunggu verifikasi", total.pending], ["Draft", total.draft], ["Ditolak", total.rejected], ["Total unduhan", total.downloads], ["Total kunjungan", total.views],
    ]), "Ringkasan");
    XLSX.utils.book_append_sheet(wb, toSheet(byOrg, "OPD"), "Per OPD");
    XLSX.utils.book_append_sheet(wb, toSheet(byTopic, "Topik"), "Per Topik");
    XLSX.utils.book_append_sheet(wb, toSheet(byFormat, "Format"), "Per Format");
    XLSX.utils.book_append_sheet(wb, toSheet(byLicense, "Lisensi"), "Per Lisensi");
    XLSX.writeFile(wb, `laporan-satu-data-busel-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const Tbl = ({ title, rows, col }: { title: string; rows: Row[]; col: string }) => (
    <section className="report-section mt-6 break-inside-avoid">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <div className="max-w-full overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs">
            <tr><th className="p-2">{col}</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">{STATUS_LABEL.published}</th><th className="p-2 text-right">Menunggu</th><th className="p-2 text-right">Draft</th><th className="p-2 text-right">Ditolak</th><th className="p-2 text-right">Unduhan</th><th className="p-2 text-right">Kunjungan</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Belum ada data.</td></tr>}
            {rows.map((r) => (
              <tr key={r.label}><td className="p-2">{r.label}</td><td className="p-2 text-right font-semibold">{r.total}</td><td className="p-2 text-right">{r.published}</td><td className="p-2 text-right">{r.pending}</td><td className="p-2 text-right">{r.draft}</td><td className="p-2 text-right">{r.rejected}</td><td className="p-2 text-right">{r.downloads.toLocaleString("id-ID")}</td><td className="p-2 text-right">{r.views.toLocaleString("id-ID")}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <div>
      <div className="print:hidden">
        <PageHeader title="Laporan Statistik" desc="Rekapitulasi data sektoral untuk Pimpinan Daerah dan Bappeda" />
        <div className="mb-4 flex flex-wrap gap-2">
          <Button onClick={exportXlsx}><FileSpreadsheet className="h-4 w-4" /> Ekspor Excel</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Cetak / Simpan PDF</Button>
        </div>
      </div>
      <div id="report" className="rounded-2xl border bg-card p-5 shadow-soft print:border-0 print:p-0 print:shadow-none">
        <div className="border-b-2 border-foreground pb-3 text-center">
          <div className="text-sm font-semibold uppercase tracking-wide">Pemerintah Kabupaten Buton Selatan</div>
          <div className="font-display text-lg font-bold">Laporan Rekapitulasi Satu Data</div>
          <div className="text-xs text-muted-foreground">Per tanggal {today}</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Total dataset", total.total], ["Diterbitkan", total.published], ["Total unduhan", total.downloads], ["Total kunjungan", total.views]].map(([k, v]) => (
            <div key={k} className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">{k}</div><div className="font-display text-2xl font-bold">{Number(v).toLocaleString("id-ID")}</div></div>
          ))}
        </div>
        <Tbl title="A. Rekap per OPD / Instansi" rows={byOrg} col="OPD" />
        <Tbl title="B. Rekap per Topik Sektoral" rows={byTopic} col="Topik" />
        <Tbl title="C. Rekap per Format Berkas" rows={byFormat} col="Format" />
        <Tbl title="D. Rekap per Lisensi" rows={byLicense} col="Lisensi" />
        <div className="mt-10 flex justify-end break-inside-avoid">
          <div className="w-60 text-center text-sm">
            <div>Buton Selatan, {today}</div>
            <div>Wali Data / Diskominfo</div>
            <div className="h-20" />
            <div className="border-t border-foreground pt-1">(............................................)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
