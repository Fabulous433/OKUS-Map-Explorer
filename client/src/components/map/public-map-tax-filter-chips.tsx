import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { createPublicMapTaxFilterLabelModel } from "@/lib/map/public-map-stage-model";

type PublicMapTaxFilterChipsProps = {
  options: string[];
  selectedTaxType: string;
  onSelect: (value: string) => void;
  reducedMotion: boolean;
};

export function PublicMapTaxFilterChips(props: PublicMapTaxFilterChipsProps) {
  if (props.options.length === 0) {
    return null;
  }

  const allLabel = createPublicMapTaxFilterLabelModel("all");

  return (
    <motion.div
      key="desa-tax-filter-chips"
      initial={props.reducedMotion ? false : { opacity: 0, y: -12 }}
      animate={props.reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={props.reducedMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
      className="pointer-events-auto max-w-[min(94vw,46rem)] overflow-x-auto rounded-[24px] border border-white/65 bg-white/88 px-3 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur-md"
    >
      <div className="flex min-w-max items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={props.selectedTaxType === "all" ? "default" : "outline"}
          className="rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.16em]"
          onClick={() => props.onSelect("all")}
        >
          <span className="sm:hidden">{allLabel.compact}</span>
          <span className="hidden sm:inline">{allLabel.full}</span>
        </Button>

        {props.options.map((option) => {
          const label = createPublicMapTaxFilterLabelModel(option);

          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={props.selectedTaxType === option ? "default" : "outline"}
              className="rounded-full px-3 text-[11px] sm:text-xs"
              onClick={() => props.onSelect(option)}
            >
              <span className="sm:hidden">{label.compact}</span>
              <span className="hidden sm:inline">{label.full}</span>
            </Button>
          );
        })}
      </div>
    </motion.div>
  );
}
