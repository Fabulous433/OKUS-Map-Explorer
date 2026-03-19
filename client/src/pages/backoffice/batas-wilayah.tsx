import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import BackofficeLayout from "./layout";
import { BoundaryEditorShell } from "@/components/backoffice/boundary-editor-shell";
import { BoundaryEditorImpactPanel } from "@/components/backoffice/boundary-editor-impact-panel";
import {
  createBoundaryEditorDesaOptions,
  useBoundaryEditorDesaOptionsQuery,
  useBoundaryEditorDraftQuery,
  useBoundaryEditorKecamatanOptionsQuery,
  useBoundaryEditorRevisionListQuery,
} from "@/lib/backoffice/boundary-editor-query";
import {
  areBoundaryGeometriesEqual,
  buildDraftFeaturePayload,
  findBoundaryFeatureByKey,
} from "@/lib/backoffice/boundary-editor-model";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";
import { loadActiveRegionBoundary } from "@/lib/map/region-boundary-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RegionBoundaryGeometry } from "@shared/region-boundary-admin";

const BoundaryEditorMap = lazy(() => import("@/components/backoffice/boundary-editor-map"));

function formatBoundaryEditorSavedLabel(timestamp: string | null | undefined) {
  if (!timestamp) {
    return null;
  }

  const formatted = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(timestamp));

  return `Draft tersimpan ${formatted} WIB`;
}

export function BoundaryEditorAccessDeniedCard() {
  return (
    <div className="p-4 md:p-6">
      <div className="shadow-card bg-white p-4">
        <h1 className="font-sans text-xl font-black">AKSES DITOLAK</h1>
        <p className="mt-1 font-mono text-xs">
          Halaman Batas Wilayah hanya tersedia untuk role admin.
        </p>
      </div>
    </div>
  );
}

export function BoundaryEditorMobileNotice() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="shadow-card bg-white p-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black/55">
          Desktop Only
        </p>
        <h1 className="mt-2 font-sans text-xl font-black uppercase">Boundary Editor read-only di mobile</h1>
        <p className="mt-2 font-mono text-xs leading-6 text-black/70">
          Preview revisi dan ringkasan status tetap bisa dipantau, tetapi edit polygon, upload
          GeoJSON, dan publish hanya diaktifkan pada viewport desktop.
        </p>
      </div>
    </div>
  );
}

export default function BackofficeBatasWilayah() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const isMobile = useIsMobile();
  const isAdmin = hasRole(["admin"]);

  const kecamatanQuery = useBoundaryEditorKecamatanOptionsQuery();
  const [selectedKecamatanId, setSelectedKecamatanId] = useState("");
  const selectedKecamatan = kecamatanQuery.options.find((item) => item.id === selectedKecamatanId) ?? null;

  useEffect(() => {
    if (!selectedKecamatanId && kecamatanQuery.options.length > 0) {
      setSelectedKecamatanId(kecamatanQuery.options[0].id);
    }
  }, [kecamatanQuery.options, selectedKecamatanId]);

  const desaQuery = useBoundaryEditorDesaOptionsQuery(selectedKecamatanId);
  const draftQuery = useBoundaryEditorDraftQuery(selectedKecamatanId);
  const revisionQuery = useBoundaryEditorRevisionListQuery();
  const activeDesaBoundaryQuery = useQuery({
    queryKey: ["active-region-boundary", "boundary-editor", selectedKecamatanId || "none"],
    enabled: Boolean(selectedKecamatanId),
    queryFn: ({ signal }) =>
      loadActiveRegionBoundary({
        level: "desa",
        kecamatanId: selectedKecamatanId,
        signal,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const desaOptions = useMemo(() => {
    return createBoundaryEditorDesaOptions({
      draftFeatures: draftQuery.data?.features ?? [],
      kelurahanItems: desaQuery.items,
      selectedKecamatanName: selectedKecamatan?.label ?? "",
    });
  }, [desaQuery.items, draftQuery.data?.features, selectedKecamatan?.label]);

  const [selectedBoundaryKey, setSelectedBoundaryKey] = useState("");
  const selectedDraftFeature =
    draftQuery.data?.features.find((feature) => feature.boundaryKey === selectedBoundaryKey) ?? null;
  const selectedBaseFeature = useMemo(
    () => findBoundaryFeatureByKey(activeDesaBoundaryQuery.data?.boundary ?? null, selectedBoundaryKey),
    [activeDesaBoundaryQuery.data?.boundary, selectedBoundaryKey],
  );
  const selectedDesaOption =
    desaOptions.find((item) => item.boundaryKey === selectedBoundaryKey) ?? null;

  const selectedBaseGeometry = useMemo<RegionBoundaryGeometry | null>(() => {
    const geometry = selectedBaseFeature?.geometry;
    if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
      return null;
    }

    return {
      type: geometry.type,
      coordinates: geometry.coordinates,
    };
  }, [selectedBaseFeature]);

  const sourceGeometry = selectedDraftFeature?.geometry ?? selectedBaseGeometry;
  const [draftGeometry, setDraftGeometry] = useState<RegionBoundaryGeometry | null>(sourceGeometry);
  const sourceGeometryKey = JSON.stringify(sourceGeometry ?? null);

  useEffect(() => {
    setDraftGeometry(sourceGeometry);
  }, [selectedBoundaryKey, sourceGeometryKey]);

  useEffect(() => {
    if (desaOptions.length === 0) {
      if (selectedBoundaryKey) {
        setSelectedBoundaryKey("");
      }
      return;
    }

    if (!desaOptions.some((item) => item.boundaryKey === selectedBoundaryKey)) {
      setSelectedBoundaryKey(desaOptions[0].boundaryKey);
    }
  }, [desaOptions, selectedBoundaryKey]);

  const hasDraftChanges = !areBoundaryGeometriesEqual(draftGeometry, sourceGeometry);
  const selectedKelurahan =
    desaQuery.items.find((item) => item.cpmKelId === selectedDesaOption?.id) ?? null;
  const publishedRevisionCount = (revisionQuery.data ?? []).filter(
    (item) => item.status === "published",
  ).length;

  const geometryStatusLabel = !selectedBoundaryKey
    ? "Pilih desa/kelurahan untuk membuka boundary"
    : !draftGeometry
      ? "Geometry belum tersedia pada workspace ini"
      : hasDraftChanges
        ? "Draft berubah, simpan sebelum preview"
        : selectedDraftFeature
          ? "Draft sinkron dengan revisi aktif"
          : "Boundary runtime siap diedit";

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBoundaryKey || !selectedKelurahan || !draftGeometry) {
        throw new Error("Boundary aktif belum lengkap untuk disimpan");
      }

      const payload = buildDraftFeaturePayload({
        boundaryKey: selectedBoundaryKey,
        kecamatanId: selectedKecamatanId,
        kelurahanId: selectedKelurahan.cpmKelId,
        namaDesa: selectedKelurahan.cpmKelurahan,
        geometry: draftGeometry,
      });

      const response = await apiRequest(
        "PUT",
        `/api/backoffice/region-boundaries/desa/draft/features/${encodeURIComponent(selectedBoundaryKey)}`,
        payload,
      );

      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            `/api/backoffice/region-boundaries/desa/draft?kecamatanId=${encodeURIComponent(selectedKecamatanId)}`,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: ["/api/backoffice/region-boundaries/desa/revisions"],
        }),
      ]);

      toast({
        title: "Draft tersimpan",
        description: "Boundary desa/kelurahan disimpan sebagai draft dan belum dipublish.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal menyimpan draft",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!isAdmin) {
    return (
      <BackofficeLayout>
        <BoundaryEditorAccessDeniedCard />
      </BackofficeLayout>
    );
  }

  if (isMobile) {
    return (
      <BackofficeLayout>
        <BoundaryEditorMobileNotice />
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="space-y-4 p-4 md:p-6" data-testid="backoffice-boundary-editor-page">
        <div className="border-b border-border pb-4">
          <h1 className="font-sans text-xl font-black uppercase md:text-2xl">BATAS WILAYAH</h1>
          <p className="font-mono text-[10px] tracking-widest uppercase text-gray-500">
            Draft override desa OKU Selatan, preview dampak OP, dan publish trail.
          </p>
        </div>

        <BoundaryEditorShell
          selectedKecamatanId={selectedKecamatanId}
          selectedBoundaryKey={selectedBoundaryKey}
          kecamatanOptions={kecamatanQuery.options}
          desaOptions={desaOptions}
          revisions={revisionQuery.data ?? []}
          isLoading={
            kecamatanQuery.isLoading ||
            desaQuery.isLoading ||
            draftQuery.isLoading ||
            revisionQuery.isLoading ||
            activeDesaBoundaryQuery.isLoading
          }
          lastSavedLabel={formatBoundaryEditorSavedLabel(draftQuery.data?.revision.updatedAt)}
          mapCanvas={
            <Suspense
              fallback={
                <div className="flex min-h-[430px] items-center justify-center rounded-xl border border-dashed border-black/15 bg-[#f6f3ec] p-6 text-center font-mono text-xs text-black/60">
                  Memuat editor peta...
                </div>
              }
            >
              <BoundaryEditorMap
                boundary={activeDesaBoundaryQuery.data?.boundary ?? null}
                selectedBoundaryKey={selectedBoundaryKey}
                selectedDesaLabel={selectedDesaOption?.label ?? selectedDraftFeature?.namaDesa ?? ""}
                geometry={draftGeometry}
                onGeometryChange={setDraftGeometry}
              />
            </Suspense>
          }
          rightPanel={
            <BoundaryEditorImpactPanel
              impactedCount={selectedDraftFeature ? 0 : 0}
              sampleMoves={[]}
              hasPreview={false}
              hasDraftChanges={hasDraftChanges}
              publishedRevisionCount={publishedRevisionCount}
              geometryStatusLabel={geometryStatusLabel}
              saveDisabled={!selectedBoundaryKey || !draftGeometry || !hasDraftChanges || saveDraftMutation.isPending}
              isSaving={saveDraftMutation.isPending}
              onSaveDraft={() => saveDraftMutation.mutate()}
            />
          }
          onSelectKecamatan={setSelectedKecamatanId}
          onSelectBoundaryKey={setSelectedBoundaryKey}
        />
      </div>
    </BackofficeLayout>
  );
}
