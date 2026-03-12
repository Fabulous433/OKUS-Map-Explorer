import { useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { BarChart3, Users, Building2, Map, ChevronRight, Sparkles, Database, LogOut, User, Settings, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { AppRole } from "@shared/schema";
import { MobileBottomNav } from "@/components/backoffice/mobile-bottom-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_ITEMS = [
  { href: "/backoffice", label: "Dashboard", icon: BarChart3, match: "/backoffice" },
  { href: "/backoffice/wajib-pajak", label: "Wajib Pajak", icon: Users, match: "/backoffice/wajib-pajak" },
  { href: "/backoffice/objek-pajak", label: "Objek Pajak", icon: Building2, match: "/backoffice/objek-pajak" },
  { href: "/backoffice/master-data", label: "Master Data", icon: Database, match: "/backoffice/master-data", roles: ["admin"] as const },
  { href: "/backoffice/data-tools", label: "Data Tools", icon: FileSpreadsheet, match: "/backoffice/data-tools" },
  { href: "/backoffice/mockup-form", label: "Mockup Form", icon: Sparkles, match: "/backoffice/mockup-form" },
];

function NavItem({ href, label, icon: Icon, match }: (typeof NAV_ITEMS)[number]) {
  const [isActive] = useRoute(match);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 rounded-lg mx-2 my-1
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${isActive
          ? "bg-primary text-primary-foreground shadow-pressed font-bold"
          : "text-foreground shadow-card hover:shadow-floating hover:-translate-y-0.5"
        }`}
      data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span className="font-mono text-sm font-bold flex-1">{label}</span>
      {isActive && <ChevronRight className="w-4 h-4" aria-hidden="true" />}
    </Link>
  );
}

export default function BackofficeLayout({
  children,
  hideMobileChrome = false,
}: {
  children: React.ReactNode;
  hideMobileChrome?: boolean;
}) {
  const { user, isLoading, isAuthenticated, hasRole, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation(`/backoffice/login?next=${encodeURIComponent(location)}`);
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="rounded-lg bg-background px-6 py-4 shadow-card font-mono text-sm font-bold">
          Memuat sesi…
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return hasRole(item.roles as readonly AppRole[]);
  });

  return (
    <div className="min-h-screen bg-background lg:flex" data-testid="backoffice-layout">
      <aside className="hidden h-screen w-[260px] flex-shrink-0 flex-col bg-background shadow-[4px_0_16px_#babecc] lg:sticky lg:top-0 lg:flex">
        <div className="bg-[#2d3436] p-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff4757] animate-pulse shadow-[var(--shadow-glow-accent)]" aria-hidden="true" />
            <h1 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-white" data-testid="text-backoffice-title">
              BACKOFFICE
            </h1>
          </div>
          <p className="font-mono text-[9px] text-white/50 tracking-widest uppercase mt-1">
            Pajak Daerah OKU Selatan
          </p>
        </div>

        <div className="px-4 py-3 mx-2 mt-3 rounded-lg shadow-recessed">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Login sebagai</p>
          <p className="font-mono text-xs font-bold">{user.username}</p>
          <p className="font-mono text-[10px] uppercase text-muted-foreground">{user.role}</p>
        </div>

        <nav className="flex-1 overflow-y-auto mt-2">
          {visibleNavItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>

        <div className="p-3">
          <Button
            variant="outline"
            className="w-full font-mono text-xs font-bold"
            onClick={async () => {
              await logout();
              setLocation("/backoffice/login");
            }}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
            Logout
          </Button>
        </div>

        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg mx-2 mb-2 shadow-card
            hover:shadow-floating hover:-translate-y-0.5 active:translate-y-[2px] active:shadow-pressed
            transition-all duration-150 cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid="nav-peta"
        >
          <Map className="w-5 h-5" aria-hidden="true" />
          <span className="font-mono text-sm font-bold uppercase tracking-wide">Kembali ke Peta</span>
        </Link>
      </aside>

      <main className={`min-h-screen flex-1 overflow-auto ${hideMobileChrome ? "pb-0" : "pb-16"} lg:pb-0`}>
        {!hideMobileChrome ? (
        <header className="mobile-panel-shadow sticky top-0 z-40 bg-[#2d3436] px-4 py-2.5 text-white lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-2 w-2 rounded-full bg-[#ff4757] animate-pulse shadow-[var(--shadow-glow-accent)]" aria-hidden="true" />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/90">OKUS Backoffice</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Menu pengguna"
                  data-testid="button-avatar-menu"
                >
                  <User className="h-4.5 w-4.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 shadow-floating">
                <DropdownMenuLabel className="font-mono text-xs">
                  <p className="font-bold">{user.username}</p>
                  <p className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground">{user.role}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="font-mono text-xs" disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="font-mono text-xs text-red-600 focus:text-red-600"
                  onClick={async () => {
                    await logout();
                    setLocation("/backoffice/login");
                  }}
                  data-testid="button-logout-mobile"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        ) : null}
        <div>{children}</div>
        {!hideMobileChrome ? <MobileBottomNav /> : null}
      </main>
    </div>
  );
}
