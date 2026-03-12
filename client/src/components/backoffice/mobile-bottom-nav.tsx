import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { BarChart3, Building2, Map, Plus, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const MOBILE_NAV_ITEMS = [
  { href: "/backoffice", label: "Dashboard", icon: BarChart3, match: "/backoffice" },
  { href: "/backoffice/wajib-pajak", label: "WP", icon: Users, match: "/backoffice/wajib-pajak" },
  { href: "/backoffice/objek-pajak", label: "OP", icon: Building2, match: "/backoffice/objek-pajak" },
  { href: "/", label: "Peta", icon: Map, match: "/" },
] as const;

const LEFT_NAV_ITEMS = MOBILE_NAV_ITEMS.slice(0, 2);
const RIGHT_NAV_ITEMS = MOBILE_NAV_ITEMS.slice(2);

function MobileNavItem({ href, label, icon: Icon, match }: (typeof MOBILE_NAV_ITEMS)[number]) {
  const [isActive] = useRoute(match);

  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1.5 py-1.5
        transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
        ${isActive
          ? "bg-primary text-primary-foreground shadow-pressed"
          : "text-foreground active:translate-y-[1px] active:shadow-pressed"
        }`}
      style={{ touchAction: "manipulation" }}
      data-testid={`mobile-nav-${label.toLowerCase()}`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="truncate font-mono text-[9px] font-bold uppercase tracking-[0.08em]">{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const openCreateFlow = (target: "wp" | "op") => {
    setIsCreateDialogOpen(false);
    setLocation(target === "wp" ? "/backoffice/wajib-pajak?create=1" : "/backoffice/objek-pajak?create=1");
  };

  return (
    <>
      <nav
        className="mobile-nav-shell fixed inset-x-0 bottom-0 z-[80] bg-transparent px-3
          pb-[calc(env(safe-area-inset-bottom,0px)+0.4rem)] pt-2 backdrop-blur-md lg:hidden"
        data-testid="mobile-bottom-nav"
      >
        <div className="mx-auto max-w-3xl">
          <div className="relative rounded-[26px] border border-black/10 bg-background/95 px-2 py-2 shadow-[0_-10px_26px_rgba(15,23,42,0.08)]">
            <div
              className="pointer-events-none absolute left-1/2 top-0 h-9 w-[6.75rem] -translate-x-1/2 -translate-y-[30%]
                rounded-b-[26px] border-x border-b border-black/8
                bg-[linear-gradient(180deg,rgba(226,232,240,0.92)_0%,rgba(248,250,252,0.28)_100%)]
                shadow-[inset_0_-10px_18px_rgba(255,255,255,0.72)]"
              aria-hidden="true"
            />
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4.75rem_minmax(0,1fr)_minmax(0,1fr)] items-end gap-1.5">
              {LEFT_NAV_ITEMS.map((item) => (
                <MobileNavItem key={item.href} {...item} />
              ))}
              <div className="h-12" aria-hidden="true" />
              {RIGHT_NAV_ITEMS.map((item) => (
                <MobileNavItem key={item.href} {...item} />
              ))}
            </div>

            <button
              type="button"
              className="absolute -top-[1.35rem] left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full
                border-[4px] border-background bg-primary text-black shadow-[0_12px_22px_rgba(255,71,87,0.22),0_3px_0_rgba(255,255,255,0.5)_inset] transition-all duration-200
                hover:-translate-y-0.5 active:translate-y-[1px] active:shadow-pressed
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setIsCreateDialogOpen(true)}
              aria-label="Tambah data baru"
              data-testid="mobile-nav-create-trigger"
            >
              <Plus className="h-[1.375rem] w-[1.375rem]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </nav>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent
          hideClose
          className="w-[calc(100vw-24px)] max-w-sm rounded-[28px] border-black/10 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f5_100%)] p-0 shadow-floating"
        >
          <DialogTitle className="sr-only">Tambah Data Baru</DialogTitle>
          <DialogDescription className="sr-only">
            Pilih jenis data yang ingin Anda buat dari launcher mobile.
          </DialogDescription>

          <div className="grid grid-cols-2 gap-3 p-4 pt-6">
            <button
              type="button"
              className="flex min-h-[132px] w-full flex-col items-center justify-center gap-3 rounded-[24px] border border-black/10 bg-white px-4 py-5 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-floating focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => openCreateFlow("wp")}
              data-testid="mobile-nav-create-wp"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-primary text-white shadow-[0_10px_22px_rgba(255,71,87,0.24)]">
                <Users className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="min-w-0 font-sans text-base font-black text-black">Tambah WP</span>
            </button>

            <button
              type="button"
              className="flex min-h-[132px] w-full flex-col items-center justify-center gap-3 rounded-[24px] border border-black/10 bg-white px-4 py-5 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-floating focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => openCreateFlow("op")}
              data-testid="mobile-nav-create-op"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[#2d3436] text-white">
                <Building2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <span className="min-w-0 font-sans text-base font-black text-black">Tambah OP</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
