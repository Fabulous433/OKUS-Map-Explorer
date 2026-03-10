import { useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { BarChart3, Users, Building2, Map, ChevronRight, Sparkles, Database, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { AppRole } from "@shared/schema";
import { MobileBottomNav } from "@/components/backoffice/mobile-bottom-nav";

const NAV_ITEMS = [
  { href: "/backoffice", label: "Dashboard", icon: BarChart3, match: "/backoffice" },
  { href: "/backoffice/wajib-pajak", label: "Wajib Pajak", icon: Users, match: "/backoffice/wajib-pajak" },
  { href: "/backoffice/objek-pajak", label: "Objek Pajak", icon: Building2, match: "/backoffice/objek-pajak" },
  { href: "/backoffice/master-data", label: "Master Data", icon: Database, match: "/backoffice/master-data", roles: ["admin"] as const },
  { href: "/backoffice/mockup-form", label: "Mockup Form", icon: Sparkles, match: "/backoffice/mockup-form" },
];

function NavItem({ href, label, icon: Icon, match }: (typeof NAV_ITEMS)[number]) {
  const [isActive] = useRoute(match);

  return (
    <Link href={href}>
      <div
        className={`flex items-center gap-3 px-4 py-3 border-b-[2px] border-black cursor-pointer transition-colors ${
          isActive
            ? "bg-[#FFFF00] text-black"
            : "bg-white text-black hover:bg-gray-100"
        }`}
        data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="font-mono text-sm font-bold flex-1">{label}</span>
        {isActive && <ChevronRight className="w-4 h-4" />}
      </div>
    </Link>
  );
}

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, hasRole, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const pageLabel =
    visibleLabelForLocation(location) ??
    (location.startsWith("/backoffice/master-data") ? "Master Data" : "Backoffice");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation(`/backoffice/login?next=${encodeURIComponent(location)}`);
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="border-[3px] border-black bg-white px-4 py-3 font-mono text-sm font-bold">
          Memuat sesi...
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
    <div className="min-h-screen bg-gray-50 lg:flex" data-testid="backoffice-layout">
      <aside className="hidden h-screen w-[260px] flex-shrink-0 flex-col border-r-[4px] border-black bg-white lg:sticky lg:top-0 lg:flex">
        <div className="bg-black p-4 border-b-[4px] border-[#FFFF00]">
          <h1 className="font-serif text-base font-black text-[#FFFF00] leading-tight" data-testid="text-backoffice-title">
            BACKOFFICE
          </h1>
          <p className="font-mono text-[9px] text-white/60 tracking-widest uppercase mt-0.5">
            Pajak Daerah OKU Selatan
          </p>
        </div>

        <div className="px-4 py-3 border-b-[2px] border-black bg-gray-50">
          <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">Login sebagai</p>
          <p className="font-mono text-xs font-bold">{user.username}</p>
          <p className="font-mono text-[10px] uppercase text-gray-500">{user.role}</p>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>

        <div className="border-t-[2px] border-black p-3">
          <Button
            variant="outline"
            className="w-full rounded-none border-[2px] border-black font-mono text-xs font-bold"
            onClick={async () => {
              await logout();
              setLocation("/backoffice/login");
            }}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Link href="/">
          <div
            className="flex items-center gap-3 px-4 py-3 border-t-[3px] border-black bg-[#FF6B00] text-white cursor-pointer hover:bg-[#e55f00] transition-colors"
            data-testid="nav-peta"
          >
            <Map className="w-5 h-5" />
            <span className="font-mono text-sm font-bold">Kembali ke Peta</span>
          </div>
        </Link>
      </aside>

      <main className="min-h-screen flex-1 overflow-auto pb-28 lg:pb-0">
        <header className="mobile-panel-shadow sticky top-0 z-40 border-b-[3px] border-black bg-[linear-gradient(135deg,#0b0b0b_0%,#222_100%)] px-4 py-3 text-white lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#FFFF00]/80">OKUS Backoffice</p>
              <h1 className="truncate font-serif text-lg font-black">{pageLabel}</h1>
            </div>
            <Button
              variant="outline"
              className="h-10 rounded-none border-[2px] border-[#FFFF00] bg-transparent px-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFFF00] hover:bg-[#FFFF00] hover:text-black"
              onClick={async () => {
                await logout();
                setLocation("/backoffice/login");
              }}
              data-testid="button-logout-mobile"
            >
              Keluar
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/15 pt-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-xs font-bold">{user.username}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/65">{user.role}</p>
            </div>
            <Link href="/">
              <div className="cursor-pointer border-[2px] border-white bg-[#FF6B00] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Peta
              </div>
            </Link>
          </div>
        </header>
        <div>{children}</div>
        <MobileBottomNav />
      </main>
    </div>
  );
}

function visibleLabelForLocation(location: string) {
  if (location === "/backoffice") return "Dashboard";
  if (location.startsWith("/backoffice/wajib-pajak")) return "Wajib Pajak";
  if (location.startsWith("/backoffice/objek-pajak")) return "Objek Pajak";
  if (location.startsWith("/backoffice/master-data")) return "Master Data";
  if (location.startsWith("/backoffice/mockup-form")) return "Mockup Form";
  return null;
}
