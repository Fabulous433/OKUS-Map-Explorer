import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublicMapOpRailModel } from "@/lib/map/public-map-op-list-model";

type PublicMapOpRailProps = {
  model: PublicMapOpRailModel;
  reducedMotion: boolean;
  selectedMarkerId: string | number | null;
  onSelect: (markerId: string | number) => void;
};

export function PublicMapOpRail(props: PublicMapOpRailProps) {
  if (!props.model.visible) {
    return null;
  }

  return (
    <motion.aside
      key="public-map-op-rail"
      initial={props.reducedMotion ? false : { opacity: 0, x: 16 }}
      animate={props.reducedMotion ? undefined : { opacity: 1, x: 0 }}
      transition={props.reducedMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
      className="pointer-events-auto hidden w-[20rem] rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(239,244,248,0.92)_100%)] p-4 shadow-[0_22px_52px_rgba(15,23,42,0.18)] backdrop-blur-md lg:block"
      data-testid="public-map-op-rail"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Explorer OP</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">{props.model.title}</h2>
        </div>
        <Badge className="bg-slate-900 text-white">{props.model.countLabel}</Badge>
      </div>

      {props.model.emptyMessage ? (
        <div className="mt-4 rounded-[22px] bg-white/75 px-4 py-4 text-sm leading-6 text-slate-600">
          {props.model.emptyMessage}
        </div>
      ) : (
        <div className="mt-4 max-h-[24rem] space-y-2 overflow-y-auto pr-1">
          {props.model.rows.map((row) => {
            const isActive = String(props.selectedMarkerId) === String(row.id);

            return (
              <Button
                key={row.id}
                type="button"
                variant="ghost"
                className={`h-auto w-full justify-start rounded-[22px] px-3 py-3 text-left ${
                  isActive ? "bg-slate-900 text-white hover:bg-slate-900/95" : "bg-white/70 text-slate-900 hover:bg-white"
                }`}
                data-testid={`public-map-op-rail-item-${row.id}`}
                onClick={() => props.onSelect(row.id)}
              >
                <span className={`mt-0.5 rounded-xl p-2 ${isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700"}`}>
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{row.title}</span>
                  <span className={`block truncate text-xs ${isActive ? "text-white/80" : "text-slate-500"}`}>{row.subtitle}</span>
                  <span className={`mt-1 block truncate font-mono text-[11px] ${isActive ? "text-white/85" : "text-slate-600"}`}>{row.meta}</span>
                </span>
              </Button>
            );
          })}
        </div>
      )}
    </motion.aside>
  );
}
