import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, FileStack, ShieldCheck, Users, Building2, Settings, LogOut, Globe, Menu } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { useAuth, ROLE_LABEL, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Satu Data Buton Selatan" }, { name: "robots", content: "noindex" }] }),
  component: DashboardLayout,
});

const ITEMS: { to: string; label: string; icon: typeof Users; roles: AppRole[] | null }[] = [
  { to: "/dashboard", label: "Ringkasan", icon: LayoutDashboard, roles: null },
  { to: "/dashboard/dataset", label: "Dataset Saya", icon: FileStack, roles: ["produsen", "admin"] },
  { to: "/dashboard/verifikasi", label: "Verifikasi", icon: ShieldCheck, roles: ["wali_data", "admin"] },
  { to: "/dashboard/pengguna", label: "Pengguna & Peran", icon: Users, roles: ["admin"] },
  { to: "/dashboard/organisasi", label: "OPD & Topik", icon: Building2, roles: ["admin"] },
  { to: "/dashboard/pengaturan", label: "Pengaturan Portal", icon: Settings, roles: ["admin"] },
];

function DashboardLayout() {
  const { profile, roles, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const items = ITEMS.filter((i) => !i.roles || i.roles.some((r) => roles.includes(r)));

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <nav className="flex-1 space-y-1 px-3">
      {items.map((i) => (
        <Link
          key={i.to}
          to={i.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: i.to === "/dashboard" }}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground font-semibold" }}
        >
          <i.icon className="h-4 w-4" /> {i.label}
        </Link>
      ))}
      <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
        <Globe className="h-4 w-4" /> Portal Publik
      </Link>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar py-5 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-6 px-5"><Logo light /></div>
        {nav}
        <div className="mx-3 mt-4 rounded-lg bg-sidebar-accent p-3 text-sidebar-accent-foreground">
          <div className="truncate text-sm font-semibold">{profile?.full_name ?? user?.email}</div>
          <div className="truncate text-xs opacity-70">{roles.length ? roles.map((r) => ROLE_LABEL[r]).join(", ") : "Belum ada peran"}</div>
          <button onClick={signOut} className="mt-2 flex items-center gap-1.5 text-xs text-sidebar-primary hover:underline">
            <LogOut className="h-3.5 w-3.5" /> Keluar
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 lg:pl-64">
        <div className="sticky top-0 z-30 flex h-14 items-center border-b bg-background px-4 lg:hidden">
          <Button size="icon" variant="ghost" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></Button>
          <span className="ml-2 font-display font-semibold">Dashboard</span>
        </div>
        <main className="mx-auto max-w-6xl p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  );
}

export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function NoAccess() {
  return <div className="rounded-xl border border-dashed bg-card p-12 text-center text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</div>;
}
