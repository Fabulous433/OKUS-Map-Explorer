import { AlertTriangle, Eye, Rocket, RotateCcw, Save } from "lucide-react";
import type { ChangeEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createBoundaryImpactPanelModel,
  createBoundaryResolutionBlocks,
  createBoundaryTopologyPanelModel,
  createTakeoverWarningModel,
  type DraftTopologySummary,
} from "@/lib/backoffice/boundary-editor-model";
import type { BoundaryEditorDesaOption } from "@/lib/backoffice/boundary-editor-query";
import type { RegionBoundaryImpactMovedItem } from "@shared/region-boundary-admin";

export type BoundaryEditorImpactPanelModel = ReturnType<typeof createBoundaryImpactPanelModel>;

function getBadgeVariant(label: BoundaryEditorImpactPanelModel["badgeLabel"]) {
  if (label === "READY") return "default";
  if (label === "DRAFT") return "outline";
  return "secondary";
}

function formatBoundarySegmentLabel(value: string) {
  return value
    .split("-")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function resolveBoundaryLabel(boundaryKey: string, boundaryLabelByKey: Map<string, string>) {
  const directLabel = boundaryLabelByKey.get(boundaryKey);
  if (directLabel) {
    return directLabel;
  }

  const [kecamatanSegment, desaSegment] = boundaryKey.split(":");
  if (!desaSegment) {
    return boundaryKey;
  }

  const desaLabel = formatBoundarySegmentLabel(desaSegment);
  const kecamatanLabel = kecamatanSegment ? formatBoundarySegmentLabel(kecamatanSegment) : "";
  return kecamatanLabel ? `${desaLabel} (${kecamatanLabel})` : desaLabel;
}

export function BoundaryEditorImpactPanel(props: {
  impactedCount: number;
  sampleMoves: RegionBoundaryImpactMovedItem[];
  hasPreview: boolean;
  hasDraftChanges: boolean;
  publishedRevisionCount: number;
  geometryStatusLabel: string;
  publishMode?: "publish-only" | "publish-and-reconcile";
  onPublishModeChange?: (value: "publish-only" | "publish-and-reconcile") => void;
  saveDisabled?: boolean;
  previewDisabled?: boolean;
  publishDisabled?: boolean;
  isSaving?: boolean;
  isPreviewing?: boolean;
  isPublishing?: boolean;
  topologyAnalysis?: DraftTopologySummary | null;
  topologyRevisionId?: number | null;
  takeoverConfirmed?: boolean;
  desaOptions?: BoundaryEditorDesaOption[];
  selectedBoundaryKey?: string;
  onAssignFragmentBlock?: (fragmentIds: string[], assignedBoundaryKey: string) => void;
  onFocusResolutionBlock?: (fragmentIds: string[]) => void;
  onConfirmTakeover?: () => void;
  onResetBoundaryDraft?: () => void;
  onSaveDraft?: () => void;
  onPreviewImpact?: () => void;
  onPublish?: () => void;
  isResetting?: boolean;
}) {
  const topologyModel = props.topologyAnalysis ? createBoundaryTopologyPanelModel(props.topologyAnalysis) : null;
  const takeoverWarning = props.topologyAnalysis ? createTakeoverWarningModel(props.topologyAnalysis) : null;
  const boundaryLabelByKey = new Map(
    (props.desaOptions ?? []).map((item) => [item.boundaryKey, item.label] as const),
  );
  const sourceDraftBoundaryKeys = Array.from(
    new Set((props.topologyAnalysis?.fragments ?? []).map((fragment) => fragment.sourceBoundaryKey)),
  );
  const sharedDraftLabels = sourceDraftBoundaryKeys.map((boundaryKey) =>
    resolveBoundaryLabel(boundaryKey, boundaryLabelByKey),
  );
  const resolutionBlocks = (props.topologyAnalysis ? createBoundaryResolutionBlocks(props.topologyAnalysis) : [])
    .slice()
    .sort((left, right) => {
      const leftPriority = left.sourceBoundaryKey === props.selectedBoundaryKey ? 0 : 1;
      const rightPriority = right.sourceBoundaryKey === props.selectedBoundaryKey ? 0 : 1;
      return leftPriority - rightPriority || left.blockId.localeCompare(right.blockId);
    });
  const autoAssignedFragments =
    props.topologyAnalysis?.fragments.filter(
      (fragment) => fragment.status === "resolved" && fragment.assignmentMode === "auto",
    ) ?? [];
  const takeoverFragments =
    props.topologyAnalysis?.fragments.filter((fragment) => fragment.type === "takeover-area") ?? [];

  const model = createBoundaryImpactPanelModel({
    impactedCount: props.impactedCount,
    sampleMoves: props.sampleMoves,
    hasPreview: props.hasPreview,
    hasDraftChanges: props.hasDraftChanges,
    publishedRevisionCount: props.publishedRevisionCount,
  });

  return (
    <>
      {props.topologyAnalysis ? (
        <Card className="border border-black/10">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-sans text-lg font-black uppercase">Selesaikan Perubahan Wilayah</CardTitle>
                <CardDescription className="font-mono text-[11px]">
                  Setelah simpan draf, sistem membagi area perubahan menjadi blok yang perlu diselesaikan.
                </CardDescription>
                <p className="mt-1 font-mono text-[11px] text-black/55">
                  Revision #{props.topologyRevisionId ?? "-"}
                </p>
              </div>
              <Badge variant={topologyModel?.badgeLabel === "SIAP DIPROSES" ? "default" : "outline"}>
                {topologyModel?.badgeLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-black/10 bg-white p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Blok area total</p>
                <p className="mt-2 font-mono text-sm font-bold text-black/85">{topologyModel?.summaryLabel}</p>
              </div>
              <div className="rounded-lg border border-black/10 bg-white p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Perlu dipilih</p>
                <p className="mt-2 font-mono text-sm font-bold text-black/85">{topologyModel?.unresolvedLabel}</p>
              </div>
              <div className="rounded-lg border border-black/10 bg-white p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Otomatis</p>
                <p className="mt-2 font-mono text-sm font-bold text-black/85">{topologyModel?.autoAssignedLabel}</p>
              </div>
              <div className="rounded-lg border border-black/10 bg-white p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Perlu dirapikan</p>
                <p className="mt-2 font-mono text-sm font-bold text-black/85">{topologyModel?.invalidLabel}</p>
              </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Cakupan revisi</p>
              <p className="mt-2 font-mono text-xs font-bold text-black/80">{topologyModel?.sharedDraftLabel}</p>
              <p className="mt-2 font-mono text-[11px] leading-6 text-black/65">
                {sharedDraftLabels.length > 0
                  ? `Revision draft ini mencakup: ${sharedDraftLabels.join(" · ")}.`
                  : "Belum ada desa draft lain pada revision aktif."}
              </p>
              {props.selectedBoundaryKey && sourceDraftBoundaryKeys.length > 1 ? (
                <p className="mt-2 font-mono text-[11px] leading-6 text-black/60">
                  Unresolved dari desa lain tetap memblok publish sampai diselesaikan atau draft desa tersebut direset.
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">
                Blok area yang perlu diputuskan
              </p>
              {resolutionBlocks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-black/15 p-3 font-mono text-xs text-black/60">
                  Tidak ada blok area yang perlu diputuskan untuk panel ini.
                </div>
              ) : (
                resolutionBlocks.map((block, index) => (
                  <article key={block.blockId} className="rounded-lg border border-black/10 bg-white p-3 shadow-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/50">
                          Blok area #{index + 1}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-black/60">
                          {block.fragmentIds.length} fragmen mesin digabung menjadi satu blok kerja.
                        </p>
                        <p className="mt-2 font-mono text-xs font-bold text-black/85">
                          Kandidat lintas-kecamatan:{" "}
                          {block.candidateBoundaryKeys.length > 0
                            ? block.candidateBoundaryKeys
                                .map((key) => resolveBoundaryLabel(key, boundaryLabelByKey))
                                .join(" · ")
                            : "belum ditemukan"}
                        </p>
                        <p className="mt-2 font-mono text-[11px] text-black/60">
                          Asal draft: {resolveBoundaryLabel(block.sourceBoundaryKey, boundaryLabelByKey)}
                        </p>
                      </div>
                      <Badge variant="outline">{block.status === "invalid" ? "INVALID" : "PERLU PILIH"}</Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">
                          {block.canAssign ? "Pilih desa tujuan" : "Tindakan diperlukan"}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
                          onClick={() => props.onFocusResolutionBlock?.(block.fragmentIds)}
                          disabled={!props.onFocusResolutionBlock}
                        >
                          Sorot di peta
                        </Button>
                      </div>
                      {block.canAssign ? (
                        <Select
                          value={undefined}
                          onValueChange={(value) => props.onAssignFragmentBlock?.(block.fragmentIds, value)}
                          disabled={!props.onAssignFragmentBlock}
                        >
                          <SelectTrigger className="h-10 w-full rounded-lg border border-black/10 bg-white px-3 font-mono text-xs font-bold">
                            <SelectValue placeholder="Pilih desa..." />
                          </SelectTrigger>
                          <SelectContent>
                            {block.candidateBoundaryKeys.map((key) => (
                              <SelectItem key={key} value={key}>
                                {resolveBoundaryLabel(key, boundaryLabelByKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="rounded-lg border border-dashed border-red-300 bg-red-50 p-3 font-mono text-xs leading-6 text-red-900">
                          {block.resolutionMessage}
                        </div>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="space-y-3">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">
                Blok area otomatis
              </p>
              {autoAssignedFragments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-black/15 p-3 font-mono text-xs text-black/60">
                  Tidak ada blok area otomatis untuk ditinjau.
                </div>
              ) : (
                <div className="space-y-2">
                  {autoAssignedFragments.map((fragment) => (
                    <div key={fragment.fragmentId} className="rounded-lg border border-black/10 bg-white p-3 font-mono text-xs text-black/75">
                      {fragment.fragmentId} · {resolveBoundaryLabel(fragment.assignedBoundaryKey ?? "", boundaryLabelByKey)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-black/50">
                Area desa lain yang diambil
              </p>
              {takeoverFragments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-black/15 p-3 font-mono text-xs text-black/60">
                  Tidak ada area desa lain yang diambil pada draf ini.
                </div>
              ) : (
                <div className="space-y-2">
                  {takeoverFragments.map((fragment) => (
                    <div key={fragment.fragmentId} className="rounded-lg border border-black/10 bg-white p-3 font-mono text-xs text-black/75">
                      {fragment.fragmentId} · {resolveBoundaryLabel(fragment.sourceBoundaryKey, boundaryLabelByKey)}
                      {" → "}
                      {resolveBoundaryLabel(fragment.assignedBoundaryKey ?? "", boundaryLabelByKey)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {takeoverWarning?.visible ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800">
                      {takeoverWarning.title}
                    </p>
                    <p className="mt-2 font-mono text-xs leading-6 text-amber-900">{takeoverWarning.message}</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 justify-start font-mono text-xs font-bold"
                      onClick={props.onConfirmTakeover}
                      disabled={!props.onConfirmTakeover || props.takeoverConfirmed}
                    >
                      Konfirmasi Pengambilan Wilayah
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {props.onResetBoundaryDraft && props.selectedBoundaryKey ? (
              <div className="rounded-lg border border-black/10 bg-white p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Isolasi draf</p>
                <p className="mt-2 font-mono text-xs leading-6 text-black/65">
                  Reset desa aktif untuk membuang draf dan blok area milik desa yang sedang dipilih,
                  tanpa menghapus draf desa lain pada revision yang sama.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 justify-start font-mono text-xs font-bold"
                  onClick={props.onResetBoundaryDraft}
                  disabled={props.isResetting}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {props.isResetting ? "Mereset Draf..." : "Reset Draft Desa Ini"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border border-black/10">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="font-sans text-lg font-black uppercase">Action Dock</CardTitle>
              <CardDescription className="font-mono text-[11px]">
                Simpan draf, preview dampak, publish, dan rollback revisi boundary.
              </CardDescription>
            </div>
            <Badge variant={getBadgeVariant(model.badgeLabel)}>{model.badgeLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="rounded-lg border border-black/10 bg-white p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Publish mode</p>
            <select
              className="mt-2 h-10 w-full rounded-lg border border-black/10 bg-white px-3 font-mono text-xs font-bold"
              value={props.publishMode ?? "publish-and-reconcile"}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                props.onPublishModeChange?.(event.target.value as "publish-only" | "publish-and-reconcile")
              }
              data-testid="boundary-editor-publish-mode"
            >
              <option value="publish-and-reconcile">publish-and-reconcile</option>
              <option value="publish-only">publish-only</option>
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            className="justify-start font-mono text-xs font-bold"
            disabled={props.previewDisabled ?? !model.canPreview}
            onClick={props.onPreviewImpact}
          >
            <Eye className="mr-2 h-4 w-4" />
            {props.isPreviewing ? "Memproses Preview..." : "Preview Impact"}
          </Button>
          <Button
            type="button"
            className="justify-start font-mono text-xs font-bold"
            onClick={props.onSaveDraft}
            disabled={props.saveDisabled ?? false}
          >
            <Save className="mr-2 h-4 w-4" />
            {props.isSaving ? "Menyimpan..." : "Simpan Draf"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="justify-start font-mono text-xs font-bold"
            disabled={props.publishDisabled ?? !model.canPublish}
            onClick={props.onPublish}
          >
            <Rocket className="mr-2 h-4 w-4" />
            {props.isPublishing ? "Publishing..." : "Publish"}
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
