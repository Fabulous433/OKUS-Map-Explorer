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
    <Link
      href={href}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2.5
        transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${isActive
          ? "bg-primary text-primary-foreground shadow-pressed"
          : "shadow-card text-foreground active:translate-y-[2px] active:shadow-pressed"
        }`}
      style={{ touchAction: "manipulation" }}
      data-testid={`mobile-nav-${label.toLowerCase()}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  return (
    <nav
      className="mobile-nav-shell fixed inset-x-0 bottom-0 z-50 bg-background/95 px-3
        pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-md lg:hidden"
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
