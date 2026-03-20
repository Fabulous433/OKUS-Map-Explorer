import type { ReactNode } from "react";
import { Map, Upload, Save, Eye, Rocket, RotateCcw, PenTool } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  BoundaryEditorDesaOption,
  BoundaryEditorKecamatanOption,
} from "@/lib/backoffice/boundary-editor-query";
import { createBoundaryTopologyPanelModel, type DraftTopologySummary } from "@/lib/backoffice/boundary-editor-model";
import type { RegionBoundaryRevision } from "@shared/region-boundary-admin";

function getRevisionBadgeVariant(status: RegionBoundaryRevision["status"]) {
  if (status === "published") return "default";
  if (status === "superseded") return "secondary";
  return "outline";
}

function getRevisionLabel(status: RegionBoundaryRevision["status"]) {
  if (status === "published") return "Published";
  if (status === "superseded") return "Superseded";
  return "Draft";
}

export function BoundaryEditorShell(props: {
  selectedKecamatanId: string;
  selectedBoundaryKey: string;
  kecamatanOptions: BoundaryEditorKecamatanOption[];
  desaOptions: BoundaryEditorDesaOption[];
  revisions: RegionBoundaryRevision[];
  topologyAnalysis?: DraftTopologySummary | null;
  isLoading?: boolean;
  lastSavedLabel?: string | null;
  mapCanvas?: ReactNode;
  rightPanel?: ReactNode;
  rollbackRevisionId?: number | null;
  onSelectKecamatan?: (value: string) => void;
  onSelectBoundaryKey?: (value: string) => void;
  onRollbackRevision?: (revisionId: number) => void;
}) {
  const {
    selectedKecamatanId,
    selectedBoundaryKey,
    kecamatanOptions,
    desaOptions,
    revisions,
    topologyAnalysis = null,
    isLoading = false,
    lastSavedLabel = null,
    mapCanvas,
    rightPanel,
    rollbackRevisionId = null,
    onSelectKecamatan,
    onSelectBoundaryKey,
    onRollbackRevision,
  } = props;
  const topologyModel = topologyAnalysis ? createBoundaryTopologyPanelModel(topologyAnalysis) : null;

  return (
    <section
      className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]"
      data-testid="boundary-editor-shell"
    >
      <aside className="space-y-4">
        <Card className="border border-black/10">
          <CardHeader className="pb-4">
            <CardTitle className="font-sans text-xl font-black uppercase tracking-[0.08em]">
              Boundary Console
            </CardTitle>
            <CardDescription className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">
              OKU Selatan · Desa Override Only
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
                Pilih Kecamatan
              </span>
              <select
                value={selectedKecamatanId}
                onChange={(event) => onSelectKecamatan?.(event.target.value)}
                className="h-11 w-full rounded-lg border border-black/10 bg-white px-3 font-mono text-sm shadow-recessed"
                data-testid="boundary-editor-kecamatan-select"
              >
                <option value="">Pilih kecamatan...</option>
                {kecamatanOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
                Pilih Desa
              </span>
              <select
                value={selectedBoundaryKey}
                onChange={(event) => onSelectBoundaryKey?.(event.target.value)}
                className="h-11 w-full rounded-lg border border-black/10 bg-white px-3 font-mono text-sm shadow-recessed"
                data-testid="boundary-editor-desa-select"
              >
                <option value="">Pilih desa/kelurahan...</option>
                {desaOptions.map((item) => (
                  <option key={item.boundaryKey} value={item.boundaryKey}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-lg border border-dashed border-black/15 bg-[#f6f3ec] p-3">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]">Status Draft</p>
              <p className="mt-2 font-mono text-xs text-black/70">
                {isLoading ? "Memuat draft editor..." : lastSavedLabel ?? "Belum ada perubahan lokal untuk wilayah ini."}
              </p>
              {topologyAnalysis ? (
                <div className="mt-3 rounded-md border border-black/10 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/50">
                      Topology Status
                    </p>
                    <Badge variant={topologyModel?.badgeLabel === "TOPOLOGY CLEAN" ? "default" : "outline"}>
                      {topologyModel?.badgeLabel}
                    </Badge>
                  </div>
                  <p className="mt-2 font-mono text-xs font-bold text-black/80">{topologyModel?.headline}</p>
                  <p className="mt-1 font-mono text-[11px] text-black/60">
                    {topologyAnalysis.summary.unresolvedFragmentCount} unresolved ·{" "}
                    {topologyAnalysis.summary.autoAssignedFragmentCount} auto-assigned ·{" "}
                    {topologyAnalysis.summary.manualAssignmentRequiredCount} manual
                  </p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-black/10">
          <CardHeader className="pb-4">
            <CardTitle className="font-sans text-lg font-black uppercase">Riwayat Revisi</CardTitle>
            <CardDescription className="font-mono text-[11px]">
              Published, superseded, dan draft untuk override desa OKU Selatan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {revisions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-black/15 p-3 font-mono text-xs text-black/60">
                Belum ada revision boundary untuk ditampilkan.
              </div>
            ) : (
              revisions.map((revision) => (
                <article
                  key={revision.id}
                  className="rounded-lg border border-black/10 bg-white p-3 shadow-card"
                  data-testid={`boundary-editor-revision-${revision.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/50">
                        Revision #{revision.id}
                      </p>
                      <p className="mt-1 font-mono text-xs font-bold text-black/85">
                        {revision.notes ?? "Boundary editor revision"}
                      </p>
                    </div>
                    <Badge variant={getRevisionBadgeVariant(revision.status)}>
                      {getRevisionLabel(revision.status)}
                    </Badge>
                  </div>
                  <p className="mt-3 font-mono text-[11px] text-black/65">
                    {revision.impactSummary
                      ? `${revision.impactSummary.impactedCount} OP terdampak`
                      : "Belum ada impact summary"}
                  </p>
                  {revision.status === "published" && onRollbackRevision ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 w-full justify-start font-mono text-[11px] font-bold"
                      onClick={() => onRollbackRevision(revision.id)}
                      disabled={rollbackRevisionId === revision.id}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {rollbackRevisionId === revision.id ? "Memproses Rollback..." : "Rollback Revision"}
                    </Button>
                  ) : null}
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </aside>

      <main>
        <Card className="min-h-[540px] border border-black/10 bg-[linear-gradient(180deg,#f7f1e3_0%,#ffffff_100%)]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="font-sans text-xl font-black uppercase">Map Editor Canvas</CardTitle>
                <CardDescription className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">
                  Active desa outline, tetangga dimmed, dan staging polygon edit.
                </CardDescription>
              </div>
              <Badge variant="outline" className="gap-2 border-black/15 bg-white/70 text-black/70">
                <Map className="h-3.5 w-3.5" />
                Task 6
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {mapCanvas ?? (
              <div
                className="flex min-h-[430px] items-center justify-center rounded-xl border border-dashed border-black/15 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f4eee4_60%,#ebe1cf_100%)] p-6 text-center"
                data-testid="boundary-editor-map-shell"
              >
                <div className="max-w-md space-y-3">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-black/45">
                    Spatial Console
                  </p>
                  <h2 className="font-sans text-2xl font-black uppercase text-black/85">
                    Editor polygon masuk di task berikutnya
                  </h2>
                  <p className="font-mono text-xs leading-6 text-black/65">
                    Shell ini sengaja sudah memisahkan workspace revisi, canvas peta, dan panel dampak
                    tanpa memuat dependency editor GIS lebih awal.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <aside className="space-y-4">
        {rightPanel ?? (
          <>
            <Card className="border border-black/10">
              <CardHeader className="pb-4">
                <CardTitle className="font-sans text-lg font-black uppercase">Action Dock</CardTitle>
                <CardDescription className="font-mono text-[11px]">
                  Workflow edit disiapkan dulu, aksi aktif menyusul saat map editor tersedia.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button type="button" className="justify-start font-mono text-xs font-bold" disabled>
                  <PenTool className="mr-2 h-4 w-4" />
                  Edit Polygon
                </Button>
                <Button type="button" variant="outline" className="justify-start font-mono text-xs font-bold" disabled>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload GeoJSON
                </Button>
                <Button type="button" variant="outline" className="justify-start font-mono text-xs font-bold" disabled>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Impact
                </Button>
                <Button type="button" variant="outline" className="justify-start font-mono text-xs font-bold" disabled>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
                <Button type="button" variant="outline" className="justify-start font-mono text-xs font-bold" disabled>
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
                  Preview dampak OP akan muncul di sini sebelum publish.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-black/10 bg-white p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Preview revisi</p>
                  <p className="mt-2 font-mono text-sm font-bold text-black/85">
                    {revisions[0]?.impactSummary
                      ? `${revisions[0].impactSummary.impactedCount} OP potensial pindah desa`
                      : "Belum ada preview impact"}
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-black/15 p-3 font-mono text-xs leading-6 text-black/60">
                  Publish final tetap dibatasi untuk admin dan hanya berlaku pada boundary desa OKU Selatan.
                  Asset GeoJSON dasar runtime tidak disentuh langsung dari browser.
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </aside>
    </section>
  );
}
