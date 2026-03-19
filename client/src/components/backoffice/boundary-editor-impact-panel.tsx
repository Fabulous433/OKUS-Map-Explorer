import { Eye, Rocket, RotateCcw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createBoundaryImpactPanelModel } from "@/lib/backoffice/boundary-editor-model";
import type { RegionBoundaryImpactMovedItem } from "@shared/region-boundary-admin";

export type BoundaryEditorImpactPanelModel = ReturnType<typeof createBoundaryImpactPanelModel>;

function getBadgeVariant(label: BoundaryEditorImpactPanelModel["badgeLabel"]) {
  if (label === "READY") return "default";
  if (label === "DRAFT") return "outline";
  return "secondary";
}

export function BoundaryEditorImpactPanel(props: {
  impactedCount: number;
  sampleMoves: RegionBoundaryImpactMovedItem[];
  hasPreview: boolean;
  hasDraftChanges: boolean;
  publishedRevisionCount: number;
  geometryStatusLabel: string;
  saveDisabled?: boolean;
  isSaving?: boolean;
  onSaveDraft?: () => void;
}) {
  const model = createBoundaryImpactPanelModel({
    impactedCount: props.impactedCount,
    sampleMoves: props.sampleMoves,
    hasPreview: props.hasPreview,
    hasDraftChanges: props.hasDraftChanges,
    publishedRevisionCount: props.publishedRevisionCount,
  });

  return (
    <>
      <Card className="border border-black/10">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="font-sans text-lg font-black uppercase">Action Dock</CardTitle>
              <CardDescription className="font-mono text-[11px]">
                Save draft aktif, preview/publish/rollback dilengkapi pada task berikutnya.
              </CardDescription>
            </div>
            <Badge variant={getBadgeVariant(model.badgeLabel)}>{model.badgeLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button type="button" variant="outline" className="justify-start font-mono text-xs font-bold" disabled={!model.canPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview Impact
          </Button>
          <Button
            type="button"
            className="justify-start font-mono text-xs font-bold"
            onClick={props.onSaveDraft}
            disabled={props.saveDisabled ?? false}
          >
            <Save className="mr-2 h-4 w-4" />
            {props.isSaving ? "Menyimpan..." : "Save Draft"}
          </Button>
          <Button type="button" variant="outline" className="justify-start font-mono text-xs font-bold" disabled={!model.canPublish}>
            <Rocket className="mr-2 h-4 w-4" />
            Publish
          </Button>
          <Button type="button" variant="outline" className="justify-start font-mono text-xs font-bold" disabled>
            <RotateCcw className="mr-2 h-4 w-4" />
            Rollback
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-black/10">
        <CardHeader className="pb-4">
          <CardTitle className="font-sans text-lg font-black uppercase">Impact Summary</CardTitle>
          <CardDescription className="font-mono text-[11px]">
            Geometry status, moved OP count, dan sample rows draft aktif.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-black/10 bg-white p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Geometry status</p>
            <p className="mt-2 font-mono text-sm font-bold text-black/85">{props.geometryStatusLabel}</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Impact headline</p>
            <p className="mt-2 font-mono text-sm font-bold text-black/85">{model.headline}</p>
            <p className="mt-2 font-mono text-[11px] text-black/60">{model.historyLabel}</p>
          </div>
          <div className="rounded-lg border border-dashed border-black/15 p-3 font-mono text-xs leading-6 text-black/60">
            {model.sampleRows.length > 0 ? (
              <ul className="space-y-2">
                {model.sampleRows.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            ) : (
              "Belum ada sample perpindahan OP untuk draft ini."
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
