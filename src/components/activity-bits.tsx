import { useFeature } from "@/lib/features";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function NotificationBell() {
  const on = useFeature("notifications");
  return on ? <NotificationBellInner /> : null;
}

function NotificationBellInner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["notifications", user?.id];
  const { data = [] } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const unread = data.filter((n) => !n.is_read).length;
  async function markAll() {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    qc.invalidateQueries({ queryKey: key });
  }
  async function markOne(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative" aria-label="Notifikasi">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread > 9 ? "9+" : unread}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold">Notifikasi</span>
          {unread > 0 && <button onClick={markAll} className="text-xs font-medium text-primary hover:underline">Tandai semua dibaca</button>}
        </div>
        <ul className="max-h-96 divide-y overflow-y-auto">
          {data.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</li>}
          {data.map((n) => (
            <li key={n.id} className={n.is_read ? "" : "bg-primary/5"}>
              <Link to={(n.link ?? "/dashboard") as "/dashboard"} onClick={() => markOne(n.id)} className="block px-4 py-3 hover:bg-muted">
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{n.title}</div>
                    {n.message && <div className="text-xs text-muted-foreground break-words">{n.message}</div>}
                    <div className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function DatasetHistory(props: { datasetId: string; title?: string }) {
  const on = useFeature("audit_history");
  return on ? <DatasetHistoryInner {...props} /> : null;
}

function DatasetHistoryInner({ datasetId, title = "Riwayat Pembaruan" }: { datasetId: string; title?: string }) {
  const { data = [] } = useQuery({
    queryKey: ["dataset-history", datasetId],
    queryFn: async () => {
      const { data, error } = await supabase.from("dataset_history").select("*").eq("dataset_id", datasetId).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 font-semibold"><History className="h-4 w-4 text-primary" /> {title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada riwayat tercatat.</p>
      ) : (
        <ol className="relative space-y-4 border-l pl-4">
          {data.map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
              <div className="text-sm font-medium">{h.action}</div>
              <div className="text-xs text-muted-foreground">
                {[h.org_name, h.actor_name].filter(Boolean).join(" · ")}{(h.org_name || h.actor_name) ? " · " : ""}
                {new Date(h.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
              </div>
              {h.note && <p className="mt-1 rounded-md bg-muted px-2 py-1 text-xs break-words">{h.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
