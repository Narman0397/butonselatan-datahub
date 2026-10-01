import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, NoAccess } from "@/components/dash-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { settingsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard/pengaturan")({
  component: Settings,
});

function Settings() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const [f, setF] = useState({ portal_name: "", tagline: "", contact_email: "", contact_phone: "", address: "" });
  useEffect(() => {
    if (data) setF({ portal_name: data.portal_name, tagline: data.tagline ?? "", contact_email: data.contact_email ?? "", contact_phone: data.contact_phone ?? "", address: data.address ?? "" });
  }, [data]);
  if (!hasRole("admin")) return <NoAccess />;

  async function save() {
    const { error } = await supabase.from("portal_settings").update({ ...f, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("Pengaturan disimpan");
    qc.invalidateQueries({ queryKey: ["portal_settings"] });
  }

  const field = (k: keyof typeof f, label: string, area = false) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {area ? <Textarea value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /> : <Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
    </div>
  );

  return (
    <div>
      <PageHeader title="Pengaturan Portal" desc="Identitas dan kontak yang tampil di portal publik" />
      <div className="max-w-2xl space-y-4 rounded-xl border bg-card p-6">
        {field("portal_name", "Nama portal")}
        {field("tagline", "Tagline", true)}
        <div className="grid gap-4 sm:grid-cols-2">{field("contact_email", "Email kontak")}{field("contact_phone", "Telepon")}</div>
        {field("address", "Alamat", true)}
        <div className="flex justify-end"><Button onClick={save}>Simpan</Button></div>
      </div>
    </div>
  );
}
