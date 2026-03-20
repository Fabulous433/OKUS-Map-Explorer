import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import BackofficeLayout from "./layout";
import { BoundaryEditorShell } from "@/components/backoffice/boundary-editor-shell";
import { BoundaryEditorImpactPanel } from "@/components/backoffice/boundary-editor-impact-panel";
import {
  createBoundaryEditorDesaOptions,
  createBoundaryEditorDraftQueryKey,
  createBoundaryEditorTopologyQueryKey,
  useBoundaryEditorDesaOptionsQuery,
  useBoundaryEditorDraftQuery,
  useBoundaryEditorKecamatanOptionsQuery,
  useBoundaryEditorRevisionListQuery,
  useBoundaryEditorTopologyQuery,
} from "@/lib/backoffice/boundary-editor-query";
import {
  areBoundaryGeometriesEqual,
  canPublishBoundaryRevision,
  canPreviewBoundaryRevision,
  buildDraftFeaturePayload,
  createBoundaryPublishSuccessDescription,
  findBoundaryFeatureByKey,
} from "@/lib/backoffice/boundary-editor-model";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";
import { loadActiveRegionBoundary } from "@/lib/map/region-boundary-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type {
  RegionBoundaryGeometry,
  RegionBoundaryImpactPreview,
  RegionBoundaryReconciliationMode,
  RegionBoundaryTopologyAnalysis,
} from "@shared/region-boundary-admin";

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
  const { user, hasRole } = useAuth();
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
  const topologyQuery = useBoundaryEditorTopologyQuery(selectedKecamatanId);
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
  const topologyAnalysis = topologyQuery.data?.analysis ?? null;
  const topologyRevision = topologyQuery.data?.revision ?? draftQuery.data?.revision ?? null;

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
  const currentDraftPayload =
    selectedBoundaryKey && selectedKelurahan && draftGeometry
      ? buildDraftFeaturePayload({
          boundaryKey: selectedBoundaryKey,
          kecamatanId: selectedKecamatanId,
          kelurahanId: selectedKelurahan.cpmKelId,
          namaDesa: selectedKelurahan.cpmKelurahan,
          geometry: draftGeometry,
        })
      : null;
  const geometryFingerprint = JSON.stringify(draftGeometry ?? null);
  const [previewResult, setPreviewResult] = useState<RegionBoundaryImpactPreview | null>(null);
  const [previewGeometryFingerprint, setPreviewGeometryFingerprint] = useState<string | null>(null);
  const [publishMode, setPublishMode] = useState<RegionBoundaryReconciliationMode>(
    "publish-and-reconcile",
  );

  const geometryStatusLabel = !selectedBoundaryKey
    ? "Pilih desa/kelurahan untuk membuka boundary"
    : !draftGeometry
      ? "Geometry belum tersedia pada workspace ini"
      : hasDraftChanges
        ? "Draft berubah, simpan sebelum preview"
        : selectedDraftFeature
          ? "Draft sinkron dengan revisi aktif"
          : "Boundary runtime siap diedit";
  const hasPreviewableDraft = hasDraftChanges || Boolean(selectedDraftFeature);
  const previewReady = Boolean(previewResult) && previewGeometryFingerprint === geometryFingerprint;
  const canPreviewTopology = topologyAnalysis ? canPreviewBoundaryRevision(topologyAnalysis) : false;
  const canPublishTopology = topologyAnalysis ? canPublishBoundaryRevision(topologyAnalysis, previewReady) : false;

  useEffect(() => {
    if (previewGeometryFingerprint && previewGeometryFingerprint !== geometryFingerprint) {
      setPreviewResult(null);
    }
  }, [geometryFingerprint, previewGeometryFingerprint]);

  useEffect(() => {
    setPreviewResult(null);
    setPreviewGeometryFingerprint(null);
  }, [selectedBoundaryKey, selectedKecamatanId]);

  async function invalidateBoundaryEditorQueries() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: createBoundaryEditorDraftQueryKey(selectedKecamatanId),
      }),
      queryClient.invalidateQueries({
        queryKey: createBoundaryEditorTopologyQueryKey(selectedKecamatanId),
      }),
      queryClient.invalidateQueries({
        queryKey: ["/api/backoffice/region-boundaries/desa/revisions"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["active-region-boundary", "boundary-editor", selectedKecamatanId || "none"],
      }),
    ]);
  }

  async function persistCurrentDraft() {
    if (!currentDraftPayload) {
      throw new Error("Boundary aktif belum lengkap untuk disimpan");
    }

    const response = await apiRequest(
      "PUT",
      `/api/backoffice/region-boundaries/desa/draft/features/${encodeURIComponent(currentDraftPayload.boundaryKey)}`,
      currentDraftPayload,
    );

    return response.json();
  }

  function resetPreviewState() {
    setPreviewResult(null);
    setPreviewGeometryFingerprint(null);
  }

  const saveDraftMutation = useMutation({
    mutationFn: persistCurrentDraft,
    onSuccess: async () => {
      await invalidateBoundaryEditorQueries();
      resetPreviewState();

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

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!currentDraftPayload) {
        throw new Error("Boundary draft belum siap dipreview");
      }

      let topologyForPreview = topologyAnalysis;
      let persistedDraft = false;
      if (hasDraftChanges) {
        const savedDraft = (await persistCurrentDraft()) as { analysis?: RegionBoundaryTopologyAnalysis };
        persistedDraft = true;
        if (savedDraft.analysis) {
          topologyForPreview = savedDraft.analysis;
        }
      }

      if (!topologyForPreview || !canPreviewBoundaryRevision(topologyForPreview)) {
        if (persistedDraft) {
          await invalidateBoundaryEditorQueries();
          resetPreviewState();
        }
        throw new Error("Topology draft belum clean. Selesaikan fragment unresolved dan takeover terlebih dulu.");
      }

      const response = await apiRequest(
        "POST",
        "/api/backoffice/region-boundaries/desa/preview-impact",
        currentDraftPayload,
      );

      return response.json() as Promise<RegionBoundaryImpactPreview>;
    },
    onSuccess: async (result) => {
      if (hasDraftChanges) {
        await invalidateBoundaryEditorQueries();
      }

      setPreviewResult(result);
      setPreviewGeometryFingerprint(geometryFingerprint);
      toast({
        title: "Preview impact siap",
        description: `${result.impactedCount} OP terdeteksi pada simulasi boundary aktif.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Preview impact gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const revisionId = topologyRevision?.id;
      if (!revisionId) {
        throw new Error("Revision draft boundary belum tersedia untuk dipublish");
      }

      if (!topologyAnalysis || !canPublishTopology) {
        throw new Error("Topology draft belum siap untuk publish");
      }

      const response = await apiRequest("POST", "/api/backoffice/region-boundaries/desa/publish", {
        revisionId,
        mode: publishMode,
        topologyStatus: topologyAnalysis.topologyStatus,
      });

      return response.json() as Promise<{
        impactSummary: RegionBoundaryImpactPreview;
        reconciledCount: number;
      }>;
    },
    onSuccess: async (result) => {
      await invalidateBoundaryEditorQueries();
      setPreviewResult(result.impactSummary);
      setPreviewGeometryFingerprint(geometryFingerprint);

      toast({
        title: "Boundary dipublish",
        description: createBoundaryPublishSuccessDescription({
          movedCount:
            publishMode === "publish-and-reconcile"
              ? result.reconciledCount
              : result.impactSummary.impactedCount,
          mode: publishMode,
        }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Publish boundary gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignFragmentMutation = useMutation({
    mutationFn: async (params: { fragmentId: string; assignedBoundaryKey: string }) => {
      if (!topologyRevision?.id) {
        throw new Error("Revision draft topology belum tersedia untuk assignment");
      }

      if (!topologyAnalysis) {
        throw new Error("Topology draft belum tersedia untuk assignment fragment");
      }

      const response = await apiRequest(
        "POST",
        `/api/backoffice/region-boundaries/desa/draft/fragments/${encodeURIComponent(params.fragmentId)}/assign`,
        {
          revisionId: topologyRevision.id,
          assignedBoundaryKey: params.assignedBoundaryKey,
          assignmentMode: "manual",
        },
      );

      return response.json();
    },
    onSuccess: async () => {
      await invalidateBoundaryEditorQueries();
      resetPreviewState();
      toast({
        title: "Fragment diperbarui",
        description: "Assignment manual fragment topology berhasil disimpan.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal menetapkan fragment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmTakeoverMutation = useMutation({
    mutationFn: async () => {
      if (!topologyRevision?.id) {
        throw new Error("Revision draft topology belum tersedia untuk konfirmasi takeover");
      }

      if (!topologyAnalysis) {
        throw new Error("Topology draft belum tersedia untuk konfirmasi takeover");
      }

      const response = await apiRequest("POST", "/api/backoffice/region-boundaries/desa/draft/takeover/confirm", {
        revisionId: topologyRevision.id,
        takeoverConfirmedBy: user?.username ?? "admin",
      });

      return response.json();
    },
    onSuccess: async () => {
      await invalidateBoundaryEditorQueries();
      resetPreviewState();
      toast({
        title: "Takeover dikonfirmasi",
        description: "Pengambilan wilayah untuk draft boundary sudah dikonfirmasi.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal mengonfirmasi takeover",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (revisionId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/backoffice/region-boundaries/desa/revisions/${revisionId}/rollback`,
      );
      return response.json();
    },
    onSuccess: async () => {
      await invalidateBoundaryEditorQueries();
      resetPreviewState();
      toast({
        title: "Rollback selesai",
        description: "Revision published sebelumnya kembali diaktifkan.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Rollback boundary gagal",
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
          topologyAnalysis={topologyAnalysis}
          isLoading={
            kecamatanQuery.isLoading ||
            desaQuery.isLoading ||
            draftQuery.isLoading ||
            topologyQuery.isLoading ||
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
                topologyAnalysis={topologyAnalysis}
              />
            </Suspense>
          }
          rightPanel={
            <BoundaryEditorImpactPanel
              impactedCount={previewResult?.impactedCount ?? 0}
              sampleMoves={previewResult?.movedItems ?? []}
              hasPreview={previewReady}
              hasDraftChanges={hasPreviewableDraft}
              publishedRevisionCount={publishedRevisionCount}
              geometryStatusLabel={geometryStatusLabel}
              publishMode={publishMode}
              onPublishModeChange={setPublishMode}
              saveDisabled={!selectedBoundaryKey || !draftGeometry || !hasDraftChanges || saveDraftMutation.isPending}
              previewDisabled={!hasPreviewableDraft || previewMutation.isPending || !canPreviewTopology}
              publishDisabled={!canPublishTopology || publishMutation.isPending}
              isSaving={saveDraftMutation.isPending}
              isPreviewing={previewMutation.isPending}
              isPublishing={publishMutation.isPending}
              topologyAnalysis={topologyAnalysis}
              topologyRevisionId={topologyRevision?.id ?? null}
              takeoverConfirmed={Boolean(topologyRevision?.takeoverConfirmedAt)}
              desaOptions={desaOptions}
              onAssignFragment={(fragmentId, assignedBoundaryKey) =>
                assignFragmentMutation.mutate({ fragmentId, assignedBoundaryKey })
              }
              onConfirmTakeover={() => confirmTakeoverMutation.mutate()}
              onSaveDraft={() => saveDraftMutation.mutate()}
              onPreviewImpact={() => previewMutation.mutate()}
              onPublish={() => publishMutation.mutate()}
            />
          }
          rollbackRevisionId={rollbackMutation.variables ?? null}
          onSelectKecamatan={setSelectedKecamatanId}
          onSelectBoundaryKey={setSelectedBoundaryKey}
          onRollbackRevision={(revisionId) => rollbackMutation.mutate(revisionId)}
        />
      </div>
    </BackofficeLayout>
  );
}
