import { Link, useRoute } from "wouter";
import { BarChart3, Users, Building2, Map, ChevronRight, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  { href: "/backoffice", label: "Dashboard", icon: BarChart3, match: "/backoffice" },
  { href: "/backoffice/wajib-pajak", label: "Wajib Pajak", icon: Users, match: "/backoffice/wajib-pajak" },
  { href: "/backoffice/objek-pajak", label: "Objek Pajak", icon: Building2, match: "/backoffice/objek-pajak" },
  { href: "/backoffice/mockup-form", label: "Mockup Form", icon: Sparkles, match: "/backoffice/mockup-form" },
];

function NavItem({ href, label, icon: Icon, match }: typeof NAV_ITEMS[0]) {
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
  return (
    <div className="min-h-screen bg-gray-50 flex" data-testid="backoffice-layout">
      <aside className="w-[260px] bg-white border-r-[4px] border-black flex flex-col flex-shrink-0 h-screen sticky top-0">
        <div className="bg-black p-4 border-b-[4px] border-[#FFFF00]">
          <h1 className="font-serif text-base font-black text-[#FFFF00] leading-tight" data-testid="text-backoffice-title">
            BACKOFFICE
          </h1>
          <p className="font-mono text-[9px] text-white/60 tracking-widest uppercase mt-0.5">
            Pajak Daerah OKU Selatan
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>

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

      <main className="flex-1 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}
