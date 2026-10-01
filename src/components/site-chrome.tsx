import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Database, LogOut, LayoutDashboard, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/data";

const NAV = [
  { to: "/", label: "Beranda" },
  { to: "/dataset", label: "Dataset" },
  { to: "/organisasi", label: "Organisasi" },
  { to: "/topik", label: "Topik" },
] as const;

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-accent text-accent-foreground shadow-soft">
        <Database className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className={`block font-display text-sm font-bold ${light ? "text-ocean-foreground" : "text-foreground"}`}>
          Satu Data
        </span>
        <span className={`block text-xs ${light ? "text-ocean-foreground/70" : "text-muted-foreground"}`}>
          Kabupaten Buton Selatan
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
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
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
    <footer className="bg-ocean text-ocean-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3">
        <div className="space-y-3">
          <Logo light />
          <p className="text-sm text-ocean-foreground/70">{s?.tagline}</p>
        </div>
        <div className="text-sm">
          <h4 className="mb-3 font-semibold">Jelajahi</h4>
          <ul className="space-y-2 text-ocean-foreground/80">
            {NAV.map((n) => (
              <li key={n.to}><Link to={n.to} className="hover:text-accent">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-2 text-sm text-ocean-foreground/80">
          <h4 className="mb-3 font-semibold text-ocean-foreground">Kontak</h4>
          <p>{s?.address}</p>
          <p>{s?.contact_email}</p>
          <p>{s?.contact_phone}</p>
        </div>
      </div>
      <div className="border-t border-ocean-foreground/10 py-4 text-center text-xs text-ocean-foreground/60">
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
