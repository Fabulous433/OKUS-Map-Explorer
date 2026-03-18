import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicMapStageHeaderModel } from "@/lib/map/public-map-stage-model";

type PublicMapStageHeaderProps = {
  model: PublicMapStageHeaderModel;
  onBack: () => void;
  reducedMotion: boolean;
};

export function PublicMapStageHeader(props: PublicMapStageHeaderProps) {
  const transition = props.reducedMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" as const };

  return (
    <motion.div
      key={`${props.model.subtitle}:${props.model.title}`}
      initial={props.reducedMotion ? false : { opacity: 0, y: -10 }}
      animate={props.reducedMotion ? undefined : { opacity: 1, y: 0 }}
      className="pointer-events-auto w-full max-w-[min(92vw,28rem)] rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(239,244,248,0.92)_100%)] p-3 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur-md"
      transition={transition}
    >
      <div className="flex items-start gap-3">
        <AnimatePresence initial={false}>
          {props.model.backVisible ? (
            <motion.div
              key="stage-back-button"
              initial={props.reducedMotion ? false : { opacity: 0, scale: 0.92 }}
              animate={props.reducedMotion ? undefined : { opacity: 1, scale: 1 }}
              exit={props.reducedMotion ? undefined : { opacity: 0, scale: 0.92 }}
              transition={transition}
            >
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-11 w-11 rounded-2xl border-white/80 bg-white/90 shadow-card"
                onClick={props.onBack}
                aria-label="Kembali"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">{props.model.subtitle}</p>
          <h1 className="mt-1 truncate font-sans text-xl font-black text-slate-950 sm:text-2xl">{props.model.title}</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">{props.model.helperText}</p>
        </div>
      </div>
    </motion.div>
  );
}
