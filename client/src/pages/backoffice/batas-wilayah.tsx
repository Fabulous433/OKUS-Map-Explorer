import { useEffect, useMemo, useState } from "react";
import BackofficeLayout from "./layout";
import { BoundaryEditorShell } from "@/components/backoffice/boundary-editor-shell";
import {
  createBoundaryEditorDesaOptions,
  useBoundaryEditorDesaOptionsQuery,
  useBoundaryEditorDraftQuery,
  useBoundaryEditorKecamatanOptionsQuery,
  useBoundaryEditorRevisionListQuery,
} from "@/lib/backoffice/boundary-editor-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth";

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

  const desaOptions = useMemo(() => {
    return createBoundaryEditorDesaOptions({
      draftFeatures: draftQuery.data?.features ?? [],
      kelurahanItems: desaQuery.items,
      selectedKecamatanName: selectedKecamatan?.label ?? "",
    });
  }, [desaQuery.items, draftQuery.data?.features, selectedKecamatan?.label]);

  const [selectedBoundaryKey, setSelectedBoundaryKey] = useState("");

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
            revisionQuery.isLoading
          }
          lastSavedLabel={formatBoundaryEditorSavedLabel(draftQuery.data?.revision.updatedAt)}
          onSelectKecamatan={setSelectedKecamatanId}
          onSelectBoundaryKey={setSelectedBoundaryKey}
        />
      </div>
    </BackofficeLayout>
  );
}
