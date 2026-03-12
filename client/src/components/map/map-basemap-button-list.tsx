import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PUBLIC_BASE_MAPS, type BaseMapKey } from "@/lib/map/map-basemap-config";

type MapBasemapButtonListProps = {
  value: BaseMapKey;
  onValueChange: (value: BaseMapKey) => void;
  className?: string;
};

export function MapBasemapButtonList(props: MapBasemapButtonListProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", props.className)}>
      {(Object.keys(PUBLIC_BASE_MAPS) as BaseMapKey[]).map((key) => {
        const item = PUBLIC_BASE_MAPS[key];
        const isActive = props.value === key;

        return (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={isActive ? "default" : "outline"}
            aria-pressed={isActive}
            className={cn("min-h-10 px-3 text-[11px]", !isActive && "font-mono")}
            onClick={() => props.onValueChange(key)}
          >
            {item.buttonLabel}
          </Button>
        );
      })}
    </div>
  );
}
