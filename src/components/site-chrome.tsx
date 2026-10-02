import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Database, LogOut, LayoutDashboard, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { leaderPhotosQuery, settingsQuery } from "@/lib/data";

const NAV = [
  { to: "/", label: "Beranda" },
  { to: "/dataset", label: "Dataset" },
  { to: "/organisasi", label: "Organisasi" },
  { to: "/topik", label: "Topik" },
] as const;

export function Logo({ light = false }: { light?: boolean }) {
  const { data: s } = useQuery(settingsQuery);
  const { data: assets } = useQuery(leaderPhotosQuery);
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5">
      {assets?.logo ? (
        <img src={assets.logo} alt="Logo" className="h-10 w-10 shrink-0 object-contain" />
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-accent text-accent-foreground shadow-soft">
          <Database className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0 leading-tight">
        <span className={`block truncate font-display text-sm font-bold ${light ? "text-ocean-foreground" : "text-foreground"}`}>
          {s?.portal_name || "Satu Data"}
        </span>
        <span className={`block truncate text-xs ${light ? "text-ocean-foreground/70" : "text-muted-foreground"}`}>
          {s?.region_label || "Kabupaten Buton Selatan"}
        </span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-background/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-primary bg-secondary" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button asChild size="sm" className="rounded-full bg-gradient-primary shadow-soft">
                <Link to="/dashboard"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={signOut} aria-label="Keluar">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to="/auth">Masuk</Link>
            </Button>
          )}
        </div>
        <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      {open && (
        <div className="animate-rise border-t bg-background px-4 py-3 md:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-medium hover:bg-secondary" activeOptions={{ exact: n.to === "/" }} activeProps={{ className: "bg-secondary text-primary" }}>
              {n.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/dashboard" className="block py-2 text-sm font-medium text-primary">Dashboard</Link>
              <button onClick={signOut} className="block py-2 text-sm text-muted-foreground">Keluar</button>
            </>
          ) : (
            <Link to="/auth" className="block py-2 text-sm font-medium text-primary">Masuk</Link>
          )}
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { data: s } = useQuery(settingsQuery);
  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <Logo light />
          <p className="text-sm text-sidebar-foreground/70">{s?.tagline}</p>
        </div>
        <div className="text-sm">
          <h4 className="mb-3 font-semibold">Jelajahi</h4>
          <ul className="space-y-2 text-sidebar-foreground/75">
            {NAV.map((n) => (
              <li key={n.to}><Link to={n.to} className="hover:text-accent">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 text-sm text-sidebar-foreground/75">
          <h4 className="mb-3 font-semibold text-sidebar-foreground">Kontak</h4>
          <p>{s?.address}</p>
          <p className="break-all">{s?.contact_email}</p>
          <p>{s?.contact_phone}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            {([["Instagram", s?.instagram_url], ["Facebook", s?.facebook_url], ["YouTube", s?.youtube_url]] as const)
              .filter(([, u]) => u && /^https?:\/\//i.test(u))
              .map(([label, u]) => (
                <a key={label} href={u ?? undefined} target="_blank" rel="noopener noreferrer" className="rounded-full border border-sidebar-foreground/20 px-3 py-1 text-xs transition-colors hover:border-accent/60 hover:text-accent">{label}</a>
              ))}
          </div>
        </div>
      </div>
      <div className="border-t border-sidebar-foreground/10 py-4 text-center text-xs text-sidebar-foreground/55">
        © {new Date().getFullYear()} Pemerintah Kabupaten Buton Selatan · Dikelola oleh Diskominfo
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
