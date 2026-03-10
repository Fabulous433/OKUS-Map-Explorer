import { Link, useRoute } from "wouter";
import { BarChart3, Building2, Map, Users } from "lucide-react";

const MOBILE_NAV_ITEMS = [
  { href: "/backoffice", label: "Dashboard", icon: BarChart3, match: "/backoffice" },
  { href: "/backoffice/wajib-pajak", label: "WP", icon: Users, match: "/backoffice/wajib-pajak" },
  { href: "/backoffice/objek-pajak", label: "OP", icon: Building2, match: "/backoffice/objek-pajak" },
  { href: "/", label: "Peta", icon: Map, match: "/" },
] as const;

function MobileNavItem({ href, label, icon: Icon, match }: (typeof MOBILE_NAV_ITEMS)[number]) {
  const [isActive] = useRoute(match);

  return (
    <Link href={href}>
      <div
        className={`mobile-nav-item group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-none border-[2px] border-black px-2 py-2 ${
          isActive
            ? "bg-[#FFFF00] text-black shadow-[3px_3px_0_0_#000]"
            : "bg-white text-black"
        }`}
        data-testid={`mobile-nav-${label.toLowerCase()}`}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
      </div>
    </Link>
  );
}

export function MobileBottomNav() {
  return (
    <nav
      className="mobile-nav-shell fixed inset-x-0 bottom-0 z-50 border-t-[3px] border-black bg-[rgba(255,255,255,0.94)] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-sm lg:hidden"
      data-testid="mobile-bottom-nav"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        {MOBILE_NAV_ITEMS.map((item) => (
          <MobileNavItem key={item.href} {...item} />
        ))}
      </div>
    </nav>
  );
}
