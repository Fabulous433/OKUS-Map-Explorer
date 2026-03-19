import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, GripHorizontal, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicMapMobileOpSheetModel } from "@/lib/map/public-map-mobile-op-sheet-model";

type PublicMapOpBottomSheetProps = {
  model: PublicMapMobileOpSheetModel;
  reducedMotion: boolean;
  filterContent?: ReactNode;
  onBack: () => void;
  onSelectMarker: (markerId: string | number) => void;
};

export function PublicMapOpBottomSheet(props: PublicMapOpBottomSheetProps) {
  if (!props.model.visible) {
    return null;
  }

  return (
    <motion.section
      key="public-map-mobile-op-sheet"
      initial={props.reducedMotion ? false : { opacity: 0, y: 18 }}
      animate={props.reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={props.reducedMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
      className="pointer-events-auto sm:hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.97)_0%,rgba(239,244,248,0.95)_100%)] px-4 pb-4 pt-3 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-md"
      data-testid="public-map-mobile-op-sheet"
    >
      <div className="flex justify-center">
        <span className="rounded-full bg-slate-300/80 px-5 py-1 text-slate-500">
          <GripHorizontal className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Explorer OP Mobile</p>
          <h2 className="mt-1 truncate text-lg font-black text-slate-950">{props.model.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-white/80 px-2.5 py-1 font-mono">{props.model.countLabel}</span>
            <span className="rounded-full bg-white/80 px-2.5 py-1 font-mono">{props.model.filterSummary}</span>
          </div>
        </div>

        {props.model.mode === "detail" ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-2xl border-white/80 bg-white/90"
            onClick={props.onBack}
            aria-label="Kembali ke daftar OP"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {props.filterContent ? <div className="mt-3">{props.filterContent}</div> : null}

      <AnimatePresence mode="wait" initial={false}>
        {props.model.mode === "detail" && props.model.detail ? (
          <motion.div
            key="mobile-op-sheet-detail"
            initial={props.reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={props.reducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={props.reducedMotion ? undefined : { opacity: 0, y: 8 }}
            transition={props.reducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            className="mt-4 space-y-3 rounded-[24px] bg-white/78 px-4 py-4"
          >
            <div className="rounded-2xl bg-slate-100 px-3 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">Detail OP</p>
              <h3 className="mt-1 text-base font-black text-slate-950">{props.model.detail.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{props.model.detail.subtitle}</p>
            </div>
            <div className="rounded-2xl bg-slate-900 px-4 py-4 text-white">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/70">Nilai Pajak</p>
              <p className="mt-2 text-base font-bold">{props.model.detail.amountLabel}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="mobile-op-sheet-list"
            initial={props.reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={props.reducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={props.reducedMotion ? undefined : { opacity: 0, y: 8 }}
            transition={props.reducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            className="mt-4"
          >
            {props.model.rows.length === 0 ? (
              <div className="rounded-[24px] bg-white/78 px-4 py-4 text-sm leading-6 text-slate-600">
                Tidak ada objek pajak yang cocok dengan filter aktif.
              </div>
            ) : (
              <div className="max-h-[32vh] space-y-2 overflow-y-auto pr-1">
                {props.model.rows.map((row) => (
                  <Button
                    key={row.id}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start rounded-[24px] bg-white/78 px-3 py-3 text-left text-slate-900 hover:bg-white"
                    data-testid={`public-map-mobile-op-sheet-item-${row.id}`}
                    onClick={() => props.onSelectMarker(row.id)}
                  >
                    <span className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-700">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{row.title}</span>
                      <span className="block truncate text-xs text-slate-500">{row.subtitle}</span>
                      <span className="mt-1 block truncate font-mono text-[11px] text-slate-600">{row.meta}</span>
                      <span className="mt-1 block truncate text-xs font-semibold text-slate-700">{row.amountLabel}</span>
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
