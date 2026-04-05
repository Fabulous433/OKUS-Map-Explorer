import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Database,
  Download,
  FileSpreadsheet,
  Pin,
  PinOff,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { JENIS_PAJAK_OPTIONS } from "@shared/schema";
import BackofficeLayout from "./layout";
import {
  DATA_TOOLS_ENTITY_CONFIG,
  type DataToolsActionConfig,
  type DataToolsEntity,
  type DataToolsEntityConfig,
  type DataToolsGroupConfig,
} from "./data-tools-config";
import {
  buildImportAuditCsv,
  buildImportAuditFileName,
  buildCorrectionTemplateCsv,
  buildCorrectionTemplateFileName,
  buildImportErrorCsv,
  buildImportErrorFileName,
  type ImportRunMode,
} from "./data-tools-error-export";
import {
  filterPreviewRows,
  getPreviewFilterOptions,
  type PreviewFilterKey,
} from "./data-tools-preview-filter";
import { buildPreviewRowBadges } from "./data-tools-preview-badges";
import {
  clearDataToolsImportHistory,
  loadDataToolsImportHistory,
  removeDataToolsImportHistoryEntry,
  saveDataToolsImportHistoryEntry,
  togglePinnedDataToolsImportHistoryEntry,
  type DataToolsImportHistoryEntry,
} from "./data-tools-history";
import {
  filterImportHistoryEntries,
  getHistorySearchSummary,
  getHistoryEntityFilterOptions,
  getHistoryModeFilterOptions,
  hasHistorySearchTerm,
  type HistoryEntityFilterKey,
  type HistoryModeFilterKey,
} from "./data-tools-history-filter";
import { buildLocalCsvPreview, type LocalCsvPreviewState } from "./data-tools-local-preview";

const GROUP_STYLES = {
  internal: {
    badge: "border-black/15 bg-black text-white",
    panel: "border-black/10 bg-white",
  },
  sample: {
    badge: "border-amber-300 bg-amber-100 text-amber-900",
    panel: "border-amber-200 bg-amber-50/80",
  },
} as const;

const ENTITY_LABELS: Record<DataToolsEntity, string> = {
  "wajib-pajak": "Wajib Pajak",
  "objek-pajak": "Objek Pajak",
};
const RESET_CONFIRMATION_TEXT: Record<DataToolsEntity, string> = {
  "wajib-pajak": "RESET IMPORT WP",
  "objek-pajak": "RESET IMPORT OP",
};

type ImportExecutionMode = ImportRunMode;
type PendingImportConfirmation = {
  entity: DataToolsEntity;
};
type PendingResetConfirmation = {
  entity: DataToolsEntity;
};
type TutorialStep = 1 | 2 | 3 | 4 | 5;
type DataToolsPrimaryTab = "import" | "export";
type ImportWorkspaceView = "file" | "result" | "history";

type ImportResultState = {
  source: "live" | "history";
  mode: ImportRunMode;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  success: number;
  failed: number;
  errors: string[];
  warnings: string[];
  previewSummary: Record<string, number>;
  previewRows: Array<{
    rowNumber: number;
    action: "created" | "updated" | "skipped" | "failed";
    status: "valid" | "invalid";
    entityLabel: string;
    messages: string[];
    warnings: string[];
    resolutionSteps: string[];
    sourceRow: Record<string, string>;
    resolutionStatus: {
      wpResolved: boolean | null;
      rekeningResolved: boolean | null;
    } | null;
  }>;
};

export default function BackofficeDataTools() {
  const { hasRole } = useAuth();
  const canMutate = hasRole(["admin", "editor"]);
  const canResetImportedData = hasRole(["admin"]);
  const { toast } = useToast();
  const [previewFilter, setPreviewFilter] = useState<Record<DataToolsEntity, PreviewFilterKey>>({
    "wajib-pajak": "all",
    "objek-pajak": "all",
  });
  const [historyEntityFilter, setHistoryEntityFilter] = useState<HistoryEntityFilterKey>("all");
  const [historyModeFilter, setHistoryModeFilter] = useState<HistoryModeFilterKey>("all");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [importHistory, setImportHistory] = useState<DataToolsImportHistoryEntry[]>([]);
  const [importResultState, setImportResultState] = useState<Partial<Record<DataToolsEntity, ImportResultState>>>({});
  const [localPreviewState, setLocalPreviewState] = useState<Partial<Record<DataToolsEntity, LocalCsvPreviewState>>>({});
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>(1);
  const [activeTutorialEntity, setActiveTutorialEntity] = useState<DataToolsEntity | null>(null);
  const [activePrimaryTab, setActivePrimaryTab] = useState<DataToolsPrimaryTab>("import");
  const [activeImportWorkspaceView, setActiveImportWorkspaceView] = useState<ImportWorkspaceView>("file");
  const [pendingImportConfirmation, setPendingImportConfirmation] = useState<PendingImportConfirmation | null>(null);
  const [pendingResetConfirmation, setPendingResetConfirmation] = useState<PendingResetConfirmation | null>(null);
  const wpFileRef = useRef<HTMLInputElement>(null);
  const opFileRef = useRef<HTMLInputElement>(null);
  const importWorkbenchRef = useRef<HTMLDivElement>(null);
  const entityCardRefs = useRef<Partial<Record<DataToolsEntity, HTMLDivElement | null>>>({});
  const fileRefs: Record<DataToolsEntity, React.RefObject<HTMLInputElement>> = {
    "wajib-pajak": wpFileRef,
    "objek-pajak": opFileRef,
  };
  const opOperationalExports = JENIS_PAJAK_OPTIONS.map((jenisPajak) => ({
    label: jenisPajak,
    href: `/api/objek-pajak/export?mode=operational&jenisPajak=${encodeURIComponent(jenisPajak)}`,
  }));

  useEffect(() => {
    setImportHistory(loadDataToolsImportHistory());
  }, []);

  function formatHistoryTimestamp(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function persistImportHistory(entity: DataToolsEntity, result: ImportResultState) {
    const historyEntries = saveDataToolsImportHistoryEntry({
      id:
        typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID
          ? globalThis.crypto.randomUUID()
          : `${entity}-${result.mode}-${Date.now()}`,
      entity,
      mode: result.mode,
      pinned: false,
      total: result.total,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      success: result.success,
      failed: result.failed,
      warnings: result.warnings.slice(0, 5),
      createdAt: new Date().toISOString(),
      errors: result.errors.slice(0, 3),
      previewSummary: result.previewSummary,
      previewRows: result.previewRows.slice(0, 5).map((row) => ({
        rowNumber: row.rowNumber,
        action: row.action,
        status: row.status,
        entityLabel: row.entityLabel,
        messages: row.messages.slice(0, 5),
        warnings: row.warnings.slice(0, 5),
        resolutionSteps: row.resolutionSteps.slice(0, 5),
        resolutionStatus: row.resolutionStatus,
      })),
    });
    setImportHistory(historyEntries);
    setActiveHistoryId(historyEntries[0]?.id ?? null);
  }

  function handleTogglePinnedHistory(entryId: string) {
    const next = togglePinnedDataToolsImportHistoryEntry(entryId);
    setImportHistory(next);
    if (next.some((entry) => entry.id === activeHistoryId)) {
      return;
    }
    setActiveHistoryId(next[0]?.id ?? null);
  }

  function handleClearHistory() {
    clearDataToolsImportHistory();
    setImportHistory([]);
    setActiveHistoryId(null);
    toast({
      title: "Histori Dibersihkan",
      description: "Semua ringkasan preview/import lokal pada browser ini sudah dihapus.",
    });
  }

  function handleRemoveHistory(entryId: string) {
    const next = removeDataToolsImportHistoryEntry(entryId);
    setImportHistory(next);
    setActiveHistoryId((current) => {
      if (current !== entryId) {
        return current;
      }

      return next[0]?.id ?? null;
    });
    toast({
      title: "Run Dihapus",
      description: "Satu ringkasan histori lokal sudah dihapus dari browser ini.",
    });
  }

  function restoreImportHistory(entry: DataToolsImportHistoryEntry) {
    setActiveTutorialEntity(entry.entity);
    setActiveImportWorkspaceView("result");
    setImportResultState((current) => ({
      ...current,
      [entry.entity]: {
        source: "history",
        mode: entry.mode,
        total: entry.total,
        created: entry.created,
        updated: entry.updated,
        skipped: entry.skipped,
        success: entry.success,
        failed: entry.failed,
        errors: entry.errors,
        warnings: entry.warnings,
        previewSummary: entry.previewSummary,
        previewRows: entry.previewRows.map((row) => ({
          rowNumber: row.rowNumber,
          action: row.action,
          status: row.status,
          entityLabel: row.entityLabel,
          messages: row.messages,
          warnings: row.warnings,
          resolutionSteps: row.resolutionSteps,
          sourceRow: {},
          resolutionStatus: row.resolutionStatus,
        })),
      },
    }));
    setTutorialStep(5);
    setActiveHistoryId(entry.id);
    scrollToImportWorkspace();
  }

  async function handleImport(entity: DataToolsEntity, file: File, mode: ImportExecutionMode) {
    const formData = new FormData();
    formData.append("file", file);
    if (mode === "preview") {
      formData.append("dryRun", "true");
    }
    try {
      const res = await fetch(`/api/${entity}/import`, { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal", description: result.message, variant: "destructive" });
      } else {
        setActiveTutorialEntity(entity);
        setActiveImportWorkspaceView("result");
        const nextResult: ImportResultState = {
          source: "live",
          mode: result.dryRun ? "preview" : "import",
          total: Number(result.total ?? 0),
          created: Number(result.created ?? 0),
          updated: Number(result.updated ?? 0),
          skipped: Number(result.skipped ?? 0),
          success: Number(result.success ?? 0),
          failed: Number(result.failed ?? 0),
          errors: Array.isArray(result.errors) ? result.errors.map(String) : [],
          warnings: Array.isArray(result.warnings) ? result.warnings.map(String) : [],
          previewRows: Array.isArray(result.previewRows)
            ? result.previewRows.map((row: any) => ({
                rowNumber: Number(row?.rowNumber ?? 0),
                action:
                  row?.action === "created" || row?.action === "updated" || row?.action === "skipped"
                    ? row.action
                    : "failed",
                status: row?.status === "invalid" ? "invalid" : "valid",
                entityLabel: String(row?.entityLabel ?? ""),
                messages: Array.isArray(row?.messages) ? row.messages.map(String) : [],
                warnings: Array.isArray(row?.warnings) ? row.warnings.map(String) : [],
                resolutionSteps: Array.isArray(row?.resolutionSteps) ? row.resolutionSteps.map(String) : [],
                sourceRow:
                  row?.sourceRow && typeof row.sourceRow === "object"
                    ? Object.fromEntries(Object.entries(row.sourceRow).map(([key, value]) => [key, String(value ?? "")]))
                    : {},
                resolutionStatus:
                  row?.resolutionStatus && typeof row.resolutionStatus === "object"
                    ? {
                        wpResolved:
                          row.resolutionStatus.wpResolved === null || row.resolutionStatus.wpResolved === undefined
                            ? null
                            : Boolean(row.resolutionStatus.wpResolved),
                        rekeningResolved:
                          row.resolutionStatus.rekeningResolved === null ||
                          row.resolutionStatus.rekeningResolved === undefined
                            ? null
                            : Boolean(row.resolutionStatus.rekeningResolved),
                      }
                    : null,
              }))
            : [],
          previewSummary:
            result.previewSummary && typeof result.previewSummary === "object"
              ? Object.fromEntries(Object.entries(result.previewSummary).map(([key, value]) => [key, Number(value ?? 0)]))
              : {},
        };
        setImportResultState((current) => ({
          ...current,
          [entity]: nextResult,
        }));
        setTutorialStep(5);
        persistImportHistory(entity, nextResult);
        toast({
          title: result.dryRun ? "Preview Selesai" : "Import Selesai",
          description: `${nextResult.created} created, ${nextResult.updated} updated, ${nextResult.skipped} skipped, ${nextResult.failed} failed`,
        });
        if (!result.dryRun) {
          queryClient.invalidateQueries({ queryKey: [`/api/${entity}`] });
        }
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  }

  function openCsvExport(href: string) {
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function getEntityConfig(entity: DataToolsEntity) {
    return DATA_TOOLS_ENTITY_CONFIG.find((item) => item.entity === entity) ?? null;
  }

  function scrollToEntityCard(entity: DataToolsEntity) {
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        entityCardRefs.current[entity]?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function scrollToImportWorkspace() {
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        importWorkbenchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function handleTutorialDownloadSample(entity: DataToolsEntity) {
    const entityConfig = getEntityConfig(entity);
    if (!entityConfig?.sampleHref) {
      return;
    }

    setActiveTutorialEntity(entity);
    setActiveImportWorkspaceView("file");
    openCsvExport(entityConfig.sampleHref);
    setTutorialStep(3);
    toast({
      title: "Sample Dibuka",
      description: `Sample ${ENTITY_LABELS[entity]} sedang diunduh. Lanjutkan ke pilih file kalau format sudah siap.`,
    });
  }

  function beginFileAction(entity: DataToolsEntity) {
    setActiveTutorialEntity(entity);
    setActiveImportWorkspaceView("file");
    setTutorialStep(3);
    fileRefs[entity].current?.click();
  }

  function requestImportConfirmation(entity: DataToolsEntity) {
    setActiveTutorialEntity(entity);
    setActiveImportWorkspaceView("result");
    setTutorialStep(5);
    setPendingImportConfirmation({ entity });
  }

  async function confirmPendingImport() {
    if (!pendingImportConfirmation) return;
    const current = pendingImportConfirmation;
    setPendingImportConfirmation(null);
    const preview = localPreviewState[current.entity];
    if (!preview) {
      toast({
        title: "File Belum Dipilih",
        description: "Pilih file CSV dulu sebelum menjalankan import final.",
        variant: "destructive",
      });
      return;
    }
    await handleImport(current.entity, preview.file, "import");
  }

  async function handleLocalFileSelection(entity: DataToolsEntity, file: File) {
    try {
      const content = await file.text();
      const preview = buildLocalCsvPreview(entity, file, content);
      setActiveTutorialEntity(entity);
      setActiveImportWorkspaceView("file");
      setLocalPreviewState((current) => ({
        ...current,
        [entity]: preview,
      }));
      setActiveHistoryId(null);
      setTutorialStep(4);
      toast({
        title: "File Siap Ditinjau",
        description: `${preview.totalRows} baris terdeteksi. Periksa preview kolom lokal sebelum lanjut.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Preview File Gagal",
        description: err instanceof Error ? err.message : "Gagal membaca file CSV lokal",
        variant: "destructive",
      });
    }
  }

  async function handleResetImportedData(entity: DataToolsEntity) {
    try {
      const res = await fetch(`/api/${entity}/reset-imported`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationText: RESET_CONFIRMATION_TEXT[entity],
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Reset Gagal", description: result.message, variant: "destructive" });
        return;
      }

      setImportResultState((current) => {
        const next = { ...current };
        delete next[entity];
        if (entity === "wajib-pajak") {
          delete next["objek-pajak"];
        }
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wajib-pajak"] });
      queryClient.invalidateQueries({ queryKey: ["/api/objek-pajak"] });

      toast({
        title: "Reset Import Selesai",
        description:
          entity === "wajib-pajak"
            ? `${result.deletedCount ?? 0} WP import dan ${result.deletedRelatedOpCount ?? 0} OP terkait dihapus.`
            : `${result.deletedCount ?? 0} OP import dihapus.`,
      });
    } catch (err: unknown) {
      toast({
        title: "Reset Gagal",
        description: err instanceof Error ? err.message : "Terjadi kesalahan saat reset data import",
        variant: "destructive",
      });
    } finally {
      setPendingResetConfirmation(null);
    }
  }

  function downloadImportErrors(entity: DataToolsEntity, result: ImportResultState) {
    if (result.errors.length === 0) return;

    const csv = buildImportErrorCsv(result.errors);
    const fileName = buildImportErrorFileName(entity, result.mode);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  function downloadCorrectionTemplate(entity: DataToolsEntity, result: ImportResultState) {
    const failedRows = result.previewRows.filter((row) => row.action === "failed");
    if (failedRows.length === 0) return;

    const csv = buildCorrectionTemplateCsv(
      failedRows.map((row) => ({
        rowNumber: row.rowNumber,
        messages: row.messages,
        sourceRow: row.sourceRow,
      })),
    );
    const fileName = buildCorrectionTemplateFileName(entity, result.mode);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  function downloadImportAuditReport(entity: DataToolsEntity, result: ImportResultState) {
    if (result.previewRows.length === 0) return;

    const csv = buildImportAuditCsv(
      result.previewRows.map((row) => ({
        rowNumber: row.rowNumber,
        action: row.action,
        status: row.status,
        entityLabel: row.entityLabel,
        warnings: row.warnings,
        messages: row.messages,
        resolutionSteps: row.resolutionSteps,
        sourceRow: row.sourceRow,
      })),
    );
    const fileName = buildImportAuditFileName(entity, result.mode);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  }

  function getVisibleGroupActions(group: DataToolsGroupConfig, primaryTab: DataToolsPrimaryTab) {
    return group.actions.filter((action) => {
      if (primaryTab === "import") {
        return action.kind === "import" || action.kind === "sample" || action.kind === "preview";
      }

      return action.kind === "export";
    });
  }

  function renderAction(entityConfig: DataToolsEntityConfig, action: DataToolsActionConfig, index: number) {
    const Icon = action.icon as LucideIcon;

    if (action.kind === "import" || action.kind === "preview") {
      if (!canMutate) return null;

      return (
        <Button
          key={`${entityConfig.entity}-${action.label}-${index}`}
          variant="outline"
          className="w-full justify-start font-mono text-xs font-bold"
          onClick={() => beginFileAction(entityConfig.entity)}
        >
          <Icon className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      );
    }

    if (entityConfig.entity === "objek-pajak" && action.label === "Export Operasional Per Jenis") {
      return (
        <DropdownMenu key={`${entityConfig.entity}-${action.label}-${index}`}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between font-mono text-xs font-bold"
              data-testid="button-export-op-operational"
            >
              <span className="flex items-center">
                <Icon className="mr-2 h-4 w-4" />
                {action.label}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[320px] border border-black">
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">
              Pilih jenis pajak
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {opOperationalExports.map((item) => (
              <DropdownMenuItem
                key={item.label}
                className="font-mono text-xs"
                onSelect={() => openCsvExport(item.href)}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Button
        key={`${entityConfig.entity}-${action.label}-${index}`}
        variant="outline"
        className="w-full justify-start font-mono text-xs font-bold"
        onClick={() => action.href && openCsvExport(action.href)}
      >
        <Icon className="mr-2 h-4 w-4" />
        {action.label}
      </Button>
    );
  }

  function renderMaintenanceActions(entity: DataToolsEntity) {
    if (!canResetImportedData) return null;

    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-sans text-sm font-black uppercase tracking-[0.12em] text-red-900">Reset Data Import</p>
            <p className="mt-1 text-sm text-red-900/75">
              Menghapus data {ENTITY_LABELS[entity]} yang dibuat lewat import CSV. Aman untuk cleanup duplikat hasil trial import.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-red-300 bg-white font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-red-900 hover:bg-red-100"
            onClick={() => setPendingResetConfirmation({ entity })}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {entity === "wajib-pajak" ? "Reset Import WP" : "Reset Import OP"}
          </Button>
        </div>
      </div>
    );
  }

  function renderTutorialCardLegacy() {
    const steps: Array<{
      step: TutorialStep;
      title: string;
      body: string;
      icon: LucideIcon;
    }> = [
      {
        step: 1,
        title: "LANGKAH 1: Pilih Entitas",
        body: "Tentukan dulu apakah kamu sedang import Wajib Pajak atau Objek Pajak.",
        icon: FileSpreadsheet,
      },
      {
        step: 2,
        title: "LANGKAH 2: Download Sample",
        body: "Unduh sample dulu kalau belum tahu format file yang benar.",
        icon: Download,
      },
      {
        step: 3,
        title: "LANGKAH 3: Pilih File",
        body: "Pilih file CSV dari komputer untuk memunculkan preview lokal dan siap divalidasi.",
        icon: Upload,
      },
      {
        step: 4,
        title: "LANGKAH 4: Preview & Validasi",
        body: "Tampilkan preview file lokal dan jalankan dry-run backend tanpa menyimpan data.",
        icon: ShieldCheck,
      },
      {
        step: 5,
        title: "LANGKAH 5: Tambah/Perbaiki",
        body: "Kalau hasil preview sudah sesuai, klik Tambah/Perbaiki Data untuk menulis ke sistem.",
        icon: Database,
      },
    ];
    const activeStep = steps.find((step) => step.step === tutorialStep) ?? steps[0];
    const ActiveStepIcon = activeStep.icon;
    const illustrationTitleMap: Record<TutorialStep, string> = {
      1: "Pilih lane import terlebih dahulu",
      2: "Sample format siap diunduh",
      3: "File lokal sedang dipilih",
      4: "Preview dan validasi digabung",
      5: "Data siap ditulis ke sistem",
    };
    const illustrationCaptionMap: Record<TutorialStep, string> = {
      1: "Pilih konteks kerja dulu supaya sample, file, dan hasil validasi tidak tertukar antara WP dan OP.",
      2: "Unduh sample sesuai entitas yang dipilih kalau operator belum punya format file yang benar.",
      3: "Pilih satu file CSV dari komputer untuk memunculkan preview lokal dan menyiapkan dry-run.",
      4: "Pada langkah ini operator melihat preview file dan simulasi hasil import dalam satu alur kerja.",
      5: "Kalau hasil preview sudah bersih, lanjutkan ke import final agar data ditambah atau diperbarui di sistem.",
    };
    const progressLabelMap: Record<TutorialStep, string> = {
      1: "Choosing entity...",
      2: "Preparing sample...",
      3: "Selecting local file...",
      4: "Previewing and validating...",
      5: "Ready to import...",
    };
    const illustrationChipMap: Record<TutorialStep, string[]> = {
      1: ["pilih lane", "wp", "op"],
      2: ["sample csv", "header siap", "format aman"],
      3: ["file lokal", "csv upload", "preview awal"],
      4: ["preview lokal", "dry-run", "audit hasil"],
      5: ["created", "updated", "skipped", "failed"],
    };
    const activeEntityLabel = activeTutorialEntity ? ENTITY_LABELS[activeTutorialEntity] : "WP / OP";
    const activeEntityTone =
      activeTutorialEntity === "wajib-pajak"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : activeTutorialEntity === "objek-pajak"
          ? "border-blue-200 bg-blue-50 text-blue-800"
          : "border-slate-200 bg-slate-50 text-slate-700";
    const hasLiveImport = Object.values(importResultState).some(
      (result) => result?.source === "live" && result.mode === "import",
    );
    const hasLivePreview = Object.values(importResultState).some(
      (result) => result?.source === "live" && result.mode === "preview",
    );
    const statusMessage =
      hasLiveImport && tutorialStep === 5
        ? "Import final selesai. Audit hasil per entitas tersedia di bawah."
        : tutorialStep === 5
          ? "Konfirmasi import final terbuka atau siap dijalankan."
          : hasLivePreview && tutorialStep === 4
            ? "Preview dan validasi sudah tersedia. Lanjutkan kalau hasilnya bersih."
          : tutorialStep === 4
              ? "Jalankan preview dan validasi untuk melihat simulasi hasil import."
              : tutorialStep === 3
                ? "Pilih file CSV dari komputer untuk melanjutkan."
                : tutorialStep === 2
                  ? "Download sample sesuai entitas aktif atau skip kalau file sudah siap."
                  : "Mulai dengan memilih entitas WP atau OP.";
    const progressWidth = `${Math.max((tutorialStep / steps.length) * 100, 20)}%`;
    const tutorialEntities: DataToolsEntity[] = activeTutorialEntity
      ? [activeTutorialEntity]
      : ["wajib-pajak", "objek-pajak"];
    const selectedPreviewEntity =
      tutorialEntities.find((entity) => localPreviewState[entity]) ??
      activeTutorialEntity ??
      (localPreviewState["wajib-pajak"] ? "wajib-pajak" : null) ??
      (localPreviewState["objek-pajak"] ? "objek-pajak" : null);
    const selectedPreviewState = selectedPreviewEntity ? localPreviewState[selectedPreviewEntity] : null;
    const selectedResultState = selectedPreviewEntity ? importResultState[selectedPreviewEntity] : null;

    const canGoBack = tutorialStep > 1;
    const canGoForward = tutorialStep === 2 && activeTutorialEntity !== null;

    const goToPreviousStep = () => {
      setTutorialStep((current) => {
        if (current <= 1) return current;
        return (current - 1) as TutorialStep;
      });
    };

    const goToNextStep = () => {
      if (tutorialStep === 1 && activeTutorialEntity) {
        setTutorialStep(2);
        return;
      }
      if (tutorialStep === 2 && activeTutorialEntity) {
        setTutorialStep(3);
        return;
      }
      if (tutorialStep === 3 && selectedPreviewState) {
        setTutorialStep(4);
        if (selectedPreviewEntity) {
          scrollToEntityCard(selectedPreviewEntity);
        }
        return;
      }
      if (tutorialStep === 4 && selectedResultState?.mode === "preview") {
        setTutorialStep(5);
      }
    };

    const renderStepNavigation = (step: TutorialStep, compact: boolean) => {
      if (step === 1) {
        return null;
      }

      const buttonClass = compact ? "h-8 w-8 rounded-full" : "h-9 w-9 rounded-full";
      const iconClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";
      const labelClass = compact
        ? "font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600"
        : "font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600";
      const previousLabel = `Kembali ke langkah ${Math.max(step - 1, 1)}`;
      const nextLabel = `Lanjut ke langkah ${Math.min(step + 1, 5)}`;

      if (step === 2) {
        return (
          <TooltipProvider delayDuration={150}>
            <div className="mt-3 flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={buttonClass}
                        disabled={!canGoBack}
                        onClick={goToPreviousStep}
                        aria-label={previousLabel}
                      >
                        <ArrowLeft className={iconClass} />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{previousLabel}</TooltipContent>
                </Tooltip>
                <span className={labelClass}>{previousLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={labelClass}>{nextLabel}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={buttonClass}
                        disabled={!canGoForward}
                        onClick={goToNextStep}
                        aria-label={nextLabel}
                      >
                        <ArrowRight className={iconClass} />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{nextLabel}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        );
      }

      return (
        <TooltipProvider delayDuration={150}>
          <div className="mt-3 flex w-full items-center justify-start gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={buttonClass}
                    disabled={!canGoBack}
                    onClick={goToPreviousStep}
                    aria-label={previousLabel}
                  >
                    <ArrowLeft className={iconClass} />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{previousLabel}</TooltipContent>
            </Tooltip>
            <span className={labelClass}>{previousLabel}</span>
          </div>
        </TooltipProvider>
      );
    };

    const renderStepActions = (step: TutorialStep, compact: boolean) => {
      const actionClass = compact
        ? "h-8 rounded-lg px-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
        : "h-9 rounded-lg px-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em]";

      if (step === 1) {
        return (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(["wajib-pajak", "objek-pajak"] as DataToolsEntity[]).map((entity) => (
                <Button
                  key={`tutorial-entity-${entity}`}
                  type="button"
                  variant={activeTutorialEntity === entity ? "default" : "outline"}
                  className={actionClass}
                  onClick={() => {
                    setActiveTutorialEntity(entity);
                    setTutorialStep(2);
                  }}
                >
                  {ENTITY_LABELS[entity]}
                </Button>
              ))}
            </div>
            {renderStepNavigation(step, compact)}
          </>
        );
      }

      if (step === 2) {
        return (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={actionClass}
                disabled={!activeTutorialEntity}
                onClick={() => activeTutorialEntity && handleTutorialDownloadSample(activeTutorialEntity)}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                {activeTutorialEntity ? `Sample ${ENTITY_LABELS[activeTutorialEntity]}` : "Pilih Entitas Dulu"}
              </Button>
            </div>
            {renderStepNavigation(step, compact)}
          </>
        );
      }

      if (step === 3) {
        return (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={actionClass}
                disabled={!activeTutorialEntity}
                onClick={() => activeTutorialEntity && beginFileAction(activeTutorialEntity)}
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                {activeTutorialEntity ? `Pilih File ${ENTITY_LABELS[activeTutorialEntity]}` : "Pilih Entitas Dulu"}
              </Button>
            </div>
            {renderStepNavigation(step, compact)}
          </>
        );
      }

      if (step === 4) {
        return (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={actionClass}
                disabled={!selectedPreviewEntity || !selectedPreviewState}
                onClick={() => {
                  if (!selectedPreviewEntity || !selectedPreviewState) return;
                  setActiveTutorialEntity(selectedPreviewEntity);
                  scrollToEntityCard(selectedPreviewEntity);
                  void handleImport(selectedPreviewEntity, selectedPreviewState.file, "preview");
                }}
              >
                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                Preview & Validasi
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={`${actionClass} text-slate-600 hover:text-slate-950`}
                disabled={!selectedPreviewEntity}
                onClick={() => selectedPreviewEntity && beginFileAction(selectedPreviewEntity)}
              >
                Ganti File
              </Button>
            </div>
            {renderStepNavigation(step, compact)}
          </>
        );
      }

      const hasPreviewValidation = selectedResultState?.source === "live" && selectedResultState.mode === "preview";

      return (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className={actionClass}
              disabled={!selectedPreviewEntity || !selectedPreviewState}
              onClick={() => selectedPreviewEntity && requestImportConfirmation(selectedPreviewEntity)}
            >
              <Database className="mr-2 h-3.5 w-3.5" />
              {selectedPreviewEntity ? `Tambah/Perbaiki ${ENTITY_LABELS[selectedPreviewEntity]}` : "Pilih File Dulu"}
            </Button>
            {!hasPreviewValidation ? (
              <Button
                type="button"
                variant="outline"
                className={actionClass}
                disabled={!selectedPreviewEntity || !selectedPreviewState}
                onClick={() => {
                  if (!selectedPreviewEntity || !selectedPreviewState) return;
                  setActiveTutorialEntity(selectedPreviewEntity);
                  setTutorialStep(4);
                  scrollToEntityCard(selectedPreviewEntity);
                  void handleImport(selectedPreviewEntity, selectedPreviewState.file, "preview");
                }}
              >
                Preview & Validasi Dulu
              </Button>
            ) : null}
          </div>
          {renderStepNavigation(step, compact)}
        </>
      );
    };

    return (
      <Card className="mb-4 overflow-hidden border-black/10 bg-white p-5 md:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-sans text-base font-black uppercase tracking-[0.08em] text-slate-950">Tutorial Import</p>
              <Badge
                variant="outline"
                className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${activeEntityTone}`}
              >
                Konteks {activeEntityLabel}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              Flow import dibuat lebih aman: pilih entitas dulu, download sample bila perlu, lalu pilih file, validasi,
              dan tambah/perbaiki data.
            </p>
          </div>
          <Badge
            variant="outline"
            className="w-fit rounded-xl border-slate-950 bg-slate-950 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white shadow-[0_10px_24px_rgba(15,23,42,0.22)]"
          >
            Import Flow
          </Badge>
        </div>
        <Separator className="my-6 bg-slate-200" />
        <div className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
          <div className="relative overflow-hidden rounded-[28px] border border-sky-200/80 bg-gradient-to-br from-sky-100 via-indigo-100 to-slate-100 p-5 md:p-7">
            <div className="absolute left-[31px] top-[90px] bottom-10 hidden w-px bg-slate-300/70 md:block" />
            <div className="relative space-y-4">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = step.step === tutorialStep;
                const isCompleted = step.step < tutorialStep;

                if (isActive) {
                  return (
                    <div
                      key={`tutorial-step-${index}`}
                      className="relative overflow-hidden rounded-[22px] border border-white/80 bg-white px-4 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
                    >
                      <div className="absolute bottom-0 left-0 h-1.5 w-32 rounded-r-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-[0_8px_20px_rgba(59,130,246,0.35)]">
                          <StepIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-sans text-sm font-black uppercase tracking-[0.04em] text-slate-950">
                            {step.title}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">{step.body}</p>
                          {renderStepActions(step.step, false)}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`tutorial-step-${index}`}
                    className={`relative flex items-start gap-4 px-3 py-2 ${
                      isCompleted ? "text-slate-700" : "text-slate-500"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                        isCompleted
                          ? "border-blue-200 bg-white text-blue-600 shadow-sm"
                          : "border-slate-400/60 bg-white/35 text-slate-500"
                      }`}
                    >
                      <StepIcon className="h-5 w-5" />
                    </div>
                    <div className="pt-1">
                      <p
                        className={`font-sans text-sm font-semibold uppercase tracking-[0.04em] ${
                          isCompleted ? "text-slate-800" : "text-slate-500"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className={`mt-1 text-sm leading-6 ${isCompleted ? "text-slate-700" : "text-slate-500/90"}`}>
                        {step.body}
                      </p>
                      {renderStepActions(step.step, true)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-blue-400/70 bg-white p-6 shadow-[0_16px_40px_rgba(59,130,246,0.12)] md:p-8">
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-slate-200/80 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.14),_transparent_48%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(255,255,255,0.96))] p-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 shadow-inner transition-all duration-300">
                <ActiveStepIcon className="h-10 w-10" />
              </div>

              <div className="mt-6 max-w-[320px]">
                <p className="font-sans text-lg font-black text-slate-950">{illustrationTitleMap[tutorialStep]}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{illustrationCaptionMap[tutorialStep]}</p>
                <Badge
                  variant="outline"
                  className={`mt-4 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${activeEntityTone}`}
                >
                  {activeTutorialEntity ? `Flow ${activeEntityLabel}` : "Pilih lane WP atau OP"}
                </Badge>
                <div className="mt-4 flex justify-center">{renderStepActions(tutorialStep, false)}</div>
              </div>

              <div className="relative mt-8 flex w-full max-w-[320px] items-center justify-center">
                <div className="absolute inset-x-6 top-7 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                <div className="relative flex w-full items-center justify-between">
                  {steps.map((step) => {
                    const StepIcon = step.icon;
                    const isActive = step.step === tutorialStep;
                    const isCompleted = step.step < tutorialStep;

                    return (
                      <div key={`tutorial-visual-${step.step}`} className="flex flex-col items-center gap-2">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 ${
                            isActive
                              ? "scale-110 border-blue-500 bg-blue-500 text-white shadow-[0_12px_30px_rgba(59,130,246,0.32)]"
                              : isCompleted
                                ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                : "border-slate-300 bg-white text-slate-400"
                          }`}
                        >
                          <StepIcon className="h-5 w-5" />
                        </div>
                        <div
                          className={`h-2 w-2 rounded-full ${
                            isActive ? "bg-blue-500" : isCompleted ? "bg-emerald-400" : "bg-slate-300"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 flex w-full max-w-[330px] justify-center">
                <div className="relative w-[210px]">
                  <div className="absolute -top-4 left-1/2 h-10 w-px -translate-x-1/2 bg-gradient-to-b from-slate-300 to-slate-200" />
                  <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
                    {tutorialStep === 1 ? (
                      <FileSpreadsheet className="h-5 w-5" />
                    ) : tutorialStep === 2 ? (
                      <Download className="h-5 w-5" />
                    ) : tutorialStep === 3 ? (
                      <Upload className="h-5 w-5" />
                    ) : tutorialStep === 4 ? (
                      <ShieldCheck className="h-5 w-5" />
                    ) : (
                      <Database className="h-5 w-5" />
                    )}
                  </div>

                  <div
                    className={`rounded-[24px] border px-5 py-4 shadow-[0_12px_26px_rgba(15,23,42,0.10)] transition-all duration-300 ${
                      tutorialStep === 1
                        ? "border-slate-300 bg-gradient-to-b from-slate-100 to-white"
                        : tutorialStep === 2
                        ? "border-amber-300 bg-gradient-to-b from-amber-100 to-amber-200"
                        : tutorialStep === 3
                          ? "border-sky-300 bg-gradient-to-b from-sky-100 to-blue-100"
                          : tutorialStep === 4
                            ? "border-indigo-300 bg-gradient-to-b from-indigo-100 to-blue-100"
                            : "border-emerald-300 bg-gradient-to-b from-emerald-100 to-green-100"
                    }`}
                  >
                    <div
                      className={`mx-auto mb-3 h-2.5 rounded-full ${
                        tutorialStep === 1
                          ? "w-16 bg-slate-500/75"
                          : tutorialStep === 2
                          ? "w-20 bg-sky-500/85"
                          : tutorialStep === 3
                            ? "w-24 bg-blue-500/80"
                            : tutorialStep === 4
                              ? "w-16 bg-indigo-500/85"
                              : "w-24 bg-emerald-500/80"
                      }`}
                    />
                    <div className="space-y-2 rounded-2xl border border-white/70 bg-white/75 px-4 py-4">
                      {tutorialStep === 1 ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-700">
                            WP
                          </div>
                          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-700">
                            OP
                          </div>
                        </div>
                      ) : tutorialStep === 4 ? (
                        <div className="space-y-2">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-700">
                            preview lokal
                          </div>
                          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-indigo-700">
                            dry-run backend
                          </div>
                        </div>
                      ) : tutorialStep === 5 ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-700">
                            Created
                          </div>
                          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-blue-700">
                            Updated
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-700">
                            Skipped
                          </div>
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-700">
                            Failed
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-700">
                          {tutorialStep === 2 ? "sample csv" : "file csv lokal"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 w-full max-w-[280px]">
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all duration-300"
                    style={{ width: progressWidth }}
                  />
                </div>
                <p className="mt-3 font-sans text-sm font-medium text-slate-600">{progressLabelMap[tutorialStep]}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{statusMessage}</p>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {illustrationChipMap[tutorialStep].map((label) => (
                  <Badge
                    key={`tutorial-illustration-${label}`}
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  function renderTutorialCard() {
    const steps: Array<{
      step: TutorialStep;
      title: string;
      shortLabel: string;
      body: string;
      icon: LucideIcon;
    }> = [
      {
        step: 1,
        title: "LANGKAH 1: Pilih Entitas",
        shortLabel: "Entitas",
        body: "Tentukan dulu apakah kamu sedang import Wajib Pajak atau Objek Pajak.",
        icon: FileSpreadsheet,
      },
      {
        step: 2,
        title: "LANGKAH 2: Download Sample",
        shortLabel: "Sample",
        body: "Unduh sample dulu kalau belum tahu format file yang benar.",
        icon: Download,
      },
      {
        step: 3,
        title: "LANGKAH 3: Pilih File",
        shortLabel: "File",
        body: "Pilih file CSV dari komputer untuk memunculkan preview lokal dan siap divalidasi.",
        icon: Upload,
      },
      {
        step: 4,
        title: "LANGKAH 4: Preview & Validasi",
        shortLabel: "Validasi",
        body: "Tampilkan preview file lokal dan jalankan dry-run backend tanpa menyimpan data.",
        icon: ShieldCheck,
      },
      {
        step: 5,
        title: "LANGKAH 5: Tambah/Perbaiki",
        shortLabel: "Import",
        body: "Kalau hasil preview sudah sesuai, klik Tambah/Perbaiki Data untuk menulis ke sistem.",
        icon: Database,
      },
    ];
    const activeStep = steps.find((step) => step.step === tutorialStep) ?? steps[0];
    const ActiveStepIcon = activeStep.icon;
    const activeEntityLabel = activeTutorialEntity ? ENTITY_LABELS[activeTutorialEntity] : "WP / OP";
    const activeEntityTone =
      activeTutorialEntity === "wajib-pajak"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : activeTutorialEntity === "objek-pajak"
          ? "border-blue-200 bg-blue-50 text-blue-800"
          : "border-slate-200 bg-slate-50 text-slate-700";
    const hasLiveImport = Object.values(importResultState).some(
      (result) => result?.source === "live" && result.mode === "import",
    );
    const hasLivePreview = Object.values(importResultState).some(
      (result) => result?.source === "live" && result.mode === "preview",
    );
    const statusMessage =
      hasLiveImport && tutorialStep === 5
        ? "Import final selesai. Audit hasil tersedia di workspace aktif."
        : tutorialStep === 5
          ? "Kalau hasil validasi sudah sesuai, lanjutkan ke import final."
          : hasLivePreview && tutorialStep === 4
            ? "Validasi selesai. Periksa action dan warning sebelum import final."
            : tutorialStep === 4
              ? "Jalankan simulasi import tanpa menyimpan data ke sistem."
              : tutorialStep === 3
                ? "Pilih satu file CSV untuk konteks aktif, lalu validasi."
                : tutorialStep === 2
                  ? "Unduh sample jika perlu, atau lanjutkan bila file sudah siap."
                  : "Mulai dengan memilih entitas kerja lebih dulu.";
    const progressWidth = `${Math.max((tutorialStep / steps.length) * 100, 20)}%`;
    const tutorialEntities: DataToolsEntity[] = activeTutorialEntity
      ? [activeTutorialEntity]
      : ["wajib-pajak", "objek-pajak"];
    const selectedPreviewEntity =
      tutorialEntities.find((entity) => localPreviewState[entity]) ??
      activeTutorialEntity ??
      (localPreviewState["wajib-pajak"] ? "wajib-pajak" : null) ??
      (localPreviewState["objek-pajak"] ? "objek-pajak" : null);
    const selectedPreviewState = selectedPreviewEntity ? localPreviewState[selectedPreviewEntity] : null;
    const selectedResultState = selectedPreviewEntity ? importResultState[selectedPreviewEntity] : null;

    const canGoBack = tutorialStep > 1;
    const canGoForward = tutorialStep === 2 && activeTutorialEntity !== null;

    const goToPreviousStep = () => {
      setTutorialStep((current) => {
        if (current <= 1) return current;
        return (current - 1) as TutorialStep;
      });
    };

    const goToNextStep = () => {
      if (tutorialStep === 1 && activeTutorialEntity) {
        setTutorialStep(2);
        return;
      }
      if (tutorialStep === 2 && activeTutorialEntity) {
        setTutorialStep(3);
        return;
      }
      if (tutorialStep === 3 && selectedPreviewState) {
        setTutorialStep(4);
        scrollToImportWorkspace();
        return;
      }
      if (tutorialStep === 4 && selectedResultState?.mode === "preview") {
        setTutorialStep(5);
      }
    };

    const renderStepNavigation = (step: TutorialStep) => {
      if (step === 1) {
        return null;
      }

      const previousLabel = `Kembali ke langkah ${Math.max(step - 1, 1)}`;
      const nextLabel = `Lanjut ke langkah ${Math.min(step + 1, 5)}`;

      if (step === 2) {
        return (
          <TooltipProvider delayDuration={150}>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        disabled={!canGoBack}
                        onClick={goToPreviousStep}
                        aria-label={previousLabel}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{previousLabel}</TooltipContent>
                </Tooltip>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600">{previousLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600">{nextLabel}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        disabled={!canGoForward}
                        onClick={goToNextStep}
                        aria-label={nextLabel}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{nextLabel}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        );
      }

      return (
        <TooltipProvider delayDuration={150}>
          <div className="mt-4 flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    disabled={!canGoBack}
                    onClick={goToPreviousStep}
                    aria-label={previousLabel}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{previousLabel}</TooltipContent>
            </Tooltip>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600">{previousLabel}</span>
          </div>
        </TooltipProvider>
      );
    };

    const renderStepActions = (step: TutorialStep) => {
      const actionClass = "h-10 rounded-xl px-4 font-mono text-[10px] font-bold uppercase tracking-[0.14em]";

      if (step === 1) {
        return (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["wajib-pajak", "objek-pajak"] as DataToolsEntity[]).map((entity) => (
              <Button
                key={`tutorial-entity-${entity}`}
                type="button"
                variant={activeTutorialEntity === entity ? "default" : "outline"}
                className={`${actionClass} ${
                  activeTutorialEntity === entity
                    ? "bg-slate-950 text-white hover:bg-slate-950"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
                onClick={() => {
                  setActiveTutorialEntity(entity);
                  setTutorialStep(2);
                }}
              >
                {ENTITY_LABELS[entity]}
              </Button>
            ))}
          </div>
        );
      }

      if (step === 2) {
        return (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={actionClass}
                disabled={!activeTutorialEntity}
                onClick={() => activeTutorialEntity && handleTutorialDownloadSample(activeTutorialEntity)}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                {activeTutorialEntity ? `Sample ${ENTITY_LABELS[activeTutorialEntity]}` : "Pilih Entitas Dulu"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={`${actionClass} text-slate-600 hover:text-slate-950`}
                disabled={!activeTutorialEntity}
                onClick={goToNextStep}
              >
                Skip Sample
              </Button>
            </div>
            {renderStepNavigation(step)}
          </>
        );
      }

      if (step === 3) {
        return (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={actionClass}
                disabled={!activeTutorialEntity}
                onClick={() => activeTutorialEntity && beginFileAction(activeTutorialEntity)}
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                {activeTutorialEntity ? `Pilih File ${ENTITY_LABELS[activeTutorialEntity]}` : "Pilih Entitas Dulu"}
              </Button>
            </div>
            {renderStepNavigation(step)}
          </>
        );
      }

      if (step === 4) {
        return (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={actionClass}
                disabled={!selectedPreviewEntity || !selectedPreviewState}
                onClick={() => {
                  if (!selectedPreviewEntity || !selectedPreviewState) return;
                  setActiveTutorialEntity(selectedPreviewEntity);
                  scrollToImportWorkspace();
                  void handleImport(selectedPreviewEntity, selectedPreviewState.file, "preview");
                }}
              >
                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                Preview & Validasi
              </Button>
              <Button
                type="button"
                variant="ghost"
                className={`${actionClass} text-slate-600 hover:text-slate-950`}
                disabled={!selectedPreviewEntity}
                onClick={() => selectedPreviewEntity && beginFileAction(selectedPreviewEntity)}
              >
                Ganti File
              </Button>
            </div>
            {renderStepNavigation(step)}
          </>
        );
      }

      const hasPreviewValidation = selectedResultState?.source === "live" && selectedResultState.mode === "preview";

      return (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className={actionClass}
              disabled={!selectedPreviewEntity || !selectedPreviewState}
              onClick={() => selectedPreviewEntity && requestImportConfirmation(selectedPreviewEntity)}
            >
              <Database className="mr-2 h-3.5 w-3.5" />
              {selectedPreviewEntity ? `Tambah/Perbaiki ${ENTITY_LABELS[selectedPreviewEntity]}` : "Pilih File Dulu"}
            </Button>
            {!hasPreviewValidation ? (
              <Button
                type="button"
                variant="outline"
                className={actionClass}
                disabled={!selectedPreviewEntity || !selectedPreviewState}
                onClick={() => {
                  if (!selectedPreviewEntity || !selectedPreviewState) return;
                  setActiveTutorialEntity(selectedPreviewEntity);
                  setTutorialStep(4);
                  scrollToImportWorkspace();
                  void handleImport(selectedPreviewEntity, selectedPreviewState.file, "preview");
                }}
              >
                Preview & Validasi Dulu
              </Button>
            ) : null}
          </div>
          {renderStepNavigation(step)}
        </>
      );
    };

    return (
      <Card className="mb-4 border-black/10 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-sans text-base font-black uppercase tracking-[0.08em] text-slate-950">Import Flow</p>
              <Badge
                variant="outline"
                className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${activeEntityTone}`}
              >
                Konteks {activeEntityLabel}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              Wizard import dibuat singkat: satu langkah aktif, satu aksi utama, lalu hasilnya dibaca di workspace.
            </p>
          </div>
          <Badge
            variant="outline"
            className="w-fit rounded-full border-slate-950 bg-slate-950 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white"
          >
            Langkah {tutorialStep}/5
          </Badge>
        </div>

        <div className="mt-4 overflow-x-auto pb-1">
          <div className="flex min-w-[520px] items-center gap-2 md:min-w-0">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = step.step === tutorialStep;
              const isCompleted = step.step < tutorialStep;

              return (
                <div key={`compact-step-${step.step}`} className="flex items-center gap-2">
                  <div
                    className={`flex min-w-[92px] items-center gap-2 rounded-2xl border px-3 py-2 transition-colors duration-200 ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white"
                        : isCompleted
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        isActive
                          ? "bg-white/15 text-white"
                          : isCompleted
                            ? "bg-emerald-500 text-white"
                            : "bg-white text-slate-400"
                      }`}
                    >
                      <StepIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em]">{step.shortLabel}</span>
                  </div>
                  {index < steps.length - 1 ? (
                    <div className={`h-px w-5 ${isCompleted ? "bg-emerald-300" : "bg-slate-300"}`} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <ActiveStepIcon className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="font-sans text-sm font-black uppercase tracking-[0.05em] text-slate-950">{activeStep.title}</p>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700">{activeStep.body}</p>
              </div>
            </div>
            <div className="w-full max-w-sm lg:text-right">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-500"
                  style={{ width: progressWidth }}
                />
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">{statusMessage}</p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">{renderStepActions(tutorialStep)}</div>
        </div>
      </Card>
    );
  }

  function renderLocalFilePreview(entity: DataToolsEntity) {
    const preview = localPreviewState[entity];
    if (!preview) return null;
    const visibleColumns = preview.columns.slice(0, 10);
    const remainingColumns = Math.max(preview.columns.length - visibleColumns.length, 0);

    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div>
          <p className="font-sans text-sm font-black uppercase tracking-[0.12em] text-blue-950">Preview File Lokal</p>
          <p className="mt-1 text-sm text-blue-950/75">
            File <span className="font-mono font-bold">{preview.fileName}</span> berisi {preview.totalRows} baris data.
            Periksa kolom dan contoh baris di bawah, lalu lanjutkan langkah berikutnya dari wizard di atas.
          </p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-blue-200 bg-white p-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-900/65">file</p>
            <p className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-blue-950">{preview.fileName}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-white p-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-900/65">baris</p>
            <p className="font-sans text-lg font-black text-blue-950">{preview.totalRows}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-white p-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-900/65">kolom</p>
            <p className="font-sans text-lg font-black text-blue-950">{preview.columns.length}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-white p-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-blue-900/65">contoh baris</p>
            <p className="font-sans text-lg font-black text-blue-950">{preview.rows.length}</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-black/10 bg-white p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black">Kolom Terdeteksi</p>
            {remainingColumns > 0 ? (
              <Badge
                variant="outline"
                className="w-fit border-black/10 bg-stone-100 font-mono text-[10px] uppercase tracking-[0.14em] text-black"
              >
                +{remainingColumns} kolom lain
              </Badge>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleColumns.map((column) => (
              <Badge
                key={`${entity}-column-${column}`}
                variant="outline"
                className="border-black/10 bg-stone-100 font-mono text-[10px] tracking-[0.12em] text-black"
              >
                {column}
              </Badge>
            ))}
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-black/10 bg-white p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black">Contoh Baris</p>
          <div className="mt-3 grid gap-3 lg:hidden">
            {preview.rows.slice(0, 2).map((row, rowIndex) => (
              <div key={`${entity}-mobile-row-${rowIndex}`} className="rounded-lg border border-black/10 bg-stone-50 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">baris {rowIndex + 1}</p>
                <div className="mt-2 space-y-2">
                  {visibleColumns.slice(0, 4).map((column) => (
                    <div key={`${entity}-mobile-${rowIndex}-${column}`} className="rounded-md border border-white bg-white p-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-black/55">{column}</p>
                      <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-black/80">{row[column] || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 hidden overflow-x-auto lg:block">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-black/10 bg-stone-50">
                  {visibleColumns.map((column) => (
                    <th
                      key={`${entity}-head-${column}`}
                      className="px-3 py-2 text-left font-mono text-[10px] tracking-[0.12em] text-black"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 3).map((row, rowIndex) => (
                  <tr key={`${entity}-row-${rowIndex}`} className="border-b border-black/5 last:border-b-0">
                    {visibleColumns.map((column) => (
                      <td
                        key={`${entity}-row-${rowIndex}-${column}`}
                        className="px-3 py-2 align-top font-mono text-[10px] tracking-[0.12em] text-black/70"
                      >
                        {row[column] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderImportResultState(entity: DataToolsEntity) {
    const result = importResultState[entity];
    if (!result) return null;
    const filterOptions = getPreviewFilterOptions(entity, result.previewRows);
    const activeFilter = filterOptions.some((item) => item.key === previewFilter[entity]) ? previewFilter[entity] : "all";
    const filteredPreviewRows = filterPreviewRows(entity, result.previewRows, activeFilter);
    const summaryLabelMap =
      entity === "wajib-pajak"
        ? {
            compactRows: "compact",
            legacyRows: "legacy",
            warningRows: "warning rows",
          }
        : {
            wpResolvedRows: "npwpd ok",
            wpUnresolvedRows: "npwpd gagal",
            rekeningResolvedRows: "rekening ok",
            rekeningUnresolvedRows: "rekening gagal",
            warningRows: "warning rows",
          };
    const summaryEntries = Object.entries(summaryLabelMap)
      .map(([key, label]) => ({
        key,
        label,
        value: result.previewSummary[key],
      }))
      .filter((entry) => Number.isFinite(entry.value));
    const actionSummaryCards = [
      { key: "created", label: "created", value: result.created },
      { key: "updated", label: "updated", value: result.updated },
      { key: "skipped", label: "skipped", value: result.skipped },
      { key: "failed", label: "failed", value: result.failed },
    ];

    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-sans text-sm font-black uppercase tracking-[0.12em] text-emerald-900">
              {result.mode === "preview" ? "Hasil Preview Import" : "Hasil Import Terakhir"}
            </p>
            <p className="mt-1 text-sm text-emerald-900/75">
              {result.source === "history"
                ? "Snapshot lokal dari histori browser. Ringkasan ini bisa dipakai untuk audit cepat, tetapi tombol unduh koreksi dinonaktifkan."
                : result.mode === "preview"
                ? "Validasi selesai tanpa menyimpan data. Lanjutkan ke import final jika hasilnya sudah bersih."
                : "Ringkasan import terakhir. Jika masih ada baris gagal, unduh CSV error untuk koreksi file sumber."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-emerald-300 bg-white font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-900">
              {result.mode === "preview" ? "dry-run" : "import"}
            </Badge>
            {result.warnings.length > 0 ? (
              <Badge variant="outline" className="border-amber-300 bg-white font-mono text-[10px] uppercase tracking-[0.14em] text-amber-900">
                {result.warnings.length} warning
              </Badge>
            ) : null}
            {result.source === "history" ? (
              <Badge variant="outline" className="border-black/10 bg-white font-mono text-[10px] uppercase tracking-[0.14em] text-black">
                historis
              </Badge>
            ) : null}
            {result.source === "live" && (result.previewRows.length > 0 || result.errors.length > 0) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                  >
                    Unduh Audit
                    <ChevronDown className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border border-black">
                  {result.previewRows.length > 0 ? (
                    <DropdownMenuItem className="font-mono text-xs" onSelect={() => downloadImportAuditReport(entity, result)}>
                      Download Report CSV
                    </DropdownMenuItem>
                  ) : null}
                  {result.errors.length > 0 ? (
                    <DropdownMenuItem className="font-mono text-xs" onSelect={() => downloadImportErrors(entity, result)}>
                      Download CSV Error
                    </DropdownMenuItem>
                  ) : null}
                  {result.errors.length > 0 ? (
                    <DropdownMenuItem className="font-mono text-xs" onSelect={() => downloadCorrectionTemplate(entity, result)}>
                      Download Template Koreksi
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid gap-2 grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-emerald-200 bg-white p-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-900/65">total</p>
            <p className="font-sans text-lg font-black text-emerald-950">{result.total}</p>
          </div>
          {actionSummaryCards.map((entry) => (
            <div key={`${entity}-action-summary-${entry.key}`} className="rounded-lg border border-emerald-200 bg-white p-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-900/65">{entry.label}</p>
              <p className="font-sans text-lg font-black text-emerald-950">{entry.value}</p>
            </div>
          ))}
        </div>
        {result.warnings.length > 0 || result.errors.length > 0 || summaryEntries.length > 0 ? (
          <div className="mt-3 rounded-lg border border-black/10 bg-white p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black">audit ringkas</p>
                {summaryEntries.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {summaryEntries.map((entry) => (
                      <Badge
                        key={`${entity}-summary-${entry.key}`}
                        variant="outline"
                        className="border-black/10 bg-stone-50 font-mono text-[10px] uppercase tracking-[0.14em] text-black"
                      >
                        {entry.label}: {entry.value}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
                {result.warnings.length > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-900">warning</p>
                    <div className="mt-2 space-y-1.5">
                      {result.warnings.slice(0, 2).map((warning) => (
                        <p key={`${entity}-${warning}`} className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-900/80">
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
                {result.errors.length > 0 ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose-900">error</p>
                    <div className="mt-2 space-y-1.5">
                      {result.errors.slice(0, 2).map((error) => (
                        <p key={`${entity}-${error}`} className="font-mono text-[10px] uppercase tracking-[0.12em] text-rose-900/80">
                          {error}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {result.previewRows.length > 0 ? (
          <div className="mt-3 rounded-lg border border-black/10 bg-white p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black">preview per baris</p>
              <div className="flex flex-col gap-2 md:items-end">
                <Badge variant="outline" className="border-black/10 bg-stone-100 font-mono text-[10px] uppercase tracking-[0.14em] text-black">
                  {Math.min(filteredPreviewRows.length, 5)} / {filteredPreviewRows.length} baris
                </Badge>
                <Tabs
                  value={activeFilter}
                  onValueChange={(value) =>
                    setPreviewFilter((current) => ({
                      ...current,
                      [entity]: value as PreviewFilterKey,
                    }))
                  }
                >
                  <TabsList className="h-auto flex-wrap justify-start bg-stone-100 p-1">
                    {filterOptions.map((option) => (
                      <TabsTrigger
                        key={`${entity}-${option.key}`}
                        value={option.key}
                        className="font-mono text-[10px] uppercase tracking-[0.12em]"
                      >
                        {option.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {filteredPreviewRows.slice(0, 3).map((row) => (
                <div
                  key={`${entity}-${row.rowNumber}-${row.entityLabel}`}
                  className={`rounded-lg border p-2.5 ${
                    row.action === "failed"
                      ? "border-amber-200 bg-amber-50"
                      : row.action === "skipped"
                        ? "border-black/10 bg-stone-50"
                        : "border-emerald-200 bg-emerald-50/60"
                  }`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-sans text-sm font-black text-black">
                        Baris {row.rowNumber} · {row.entityLabel || "Tanpa label"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {buildPreviewRowBadges(entity, row).map((badge) => (
                        <Badge
                          key={`${entity}-${row.rowNumber}-${badge.label}`}
                          variant="outline"
                          className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
                            badge.tone === "success"
                              ? "border-emerald-300 bg-white text-emerald-900"
                              : badge.tone === "warning"
                                ? "border-amber-300 bg-white text-amber-900"
                                : "border-black/15 bg-white text-black"
                          }`}
                        >
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {row.resolutionSteps.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {row.resolutionSteps.slice(0, 2).map((step) => (
                        <p
                          key={`${entity}-${row.rowNumber}-resolution-${step}`}
                          className="font-mono text-[10px] uppercase tracking-[0.12em] text-black/60"
                        >
                          {step}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {row.warnings.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {row.warnings.slice(0, 2).map((warning) => (
                        <p
                          key={`${entity}-${row.rowNumber}-warning-${warning}`}
                          className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-900/85"
                        >
                          {warning}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {row.messages.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {row.messages.slice(0, 2).map((message) => (
                        <p
                          key={`${entity}-${row.rowNumber}-message-${message}`}
                          className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-900/85"
                        >
                          {message}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderGroup(
    entityConfig: DataToolsEntityConfig,
    group: DataToolsGroupConfig,
    groupIndex: number,
    primaryTab: DataToolsPrimaryTab,
  ) {
    const visibleActions = getVisibleGroupActions(group, primaryTab);
    if (visibleActions.length === 0) return null;

    const styles = GROUP_STYLES[group.tone];
    return (
      <div
        key={`${entityConfig.entity}-${group.title}-${groupIndex}`}
        className={`rounded-2xl border p-4 ${styles.panel}`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-sm font-black uppercase tracking-[0.05em] text-black">{group.title}</p>
            <p className="mt-1 text-sm leading-6 text-black/60">
              {group.description}
            </p>
          </div>
          <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-[0.14em] ${styles.badge}`}>
            {group.tone === "internal" ? "Internal" : "Sample"}
          </Badge>
        </div>
        <div className="space-y-3">
          {visibleActions.map((action, actionIndex) => (
            <div
              key={`${entityConfig.entity}-${group.title}-action-${actionIndex}`}
              className="rounded-xl border border-black/10 bg-white p-3"
            >
              {renderAction(entityConfig, action, actionIndex)}
              <p className="mt-2 px-1 text-sm leading-6 text-black/60">{action.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderExportWorkbenchHeader() {
    return (
      <Card className="mb-4 border-black/10 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-sans text-base font-black uppercase tracking-[0.08em] text-slate-950">Export Catalog</p>
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-700"
              >
                Ringkas
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              Pilih keluaran CSV per entitas tanpa membuka workflow import. Semua aksi export dikemas sebagai katalog yang lebih padat.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600"
            >
              Compact CSV
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600"
            >
              Operasional
            </Badge>
          </div>
        </div>
      </Card>
    );
  }

  function renderImportHistoryPanel() {
    const entityFilterOptions = getHistoryEntityFilterOptions(importHistory);
    const modeFilterOptions = getHistoryModeFilterOptions(importHistory);
    const filteredHistoryEntries = filterImportHistoryEntries(
      importHistory,
      historyEntityFilter,
      historyModeFilter,
      historySearchTerm,
    );
    const searchSummary = getHistorySearchSummary(historySearchTerm);

    return (
      <Card className="mb-4 border-black/10 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-sans text-sm font-black uppercase tracking-[0.12em] text-black">Histori Import Lokal</p>
            <p className="mt-2 text-sm text-black/70">
              Menyimpan preview dan import terakhir di browser ini, supaya operator bisa melihat ringkasan run tanpa
              mengulang upload file.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="w-fit border-black/10 bg-stone-100 font-mono text-[10px] uppercase tracking-[0.14em] text-black"
            >
              {importHistory.length} run tersimpan
            </Badge>
            {importHistory.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                onClick={handleClearHistory}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Clear History
              </Button>
            ) : null}
          </div>
        </div>

        {importHistory.length > 0 ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <div className="rounded-xl border border-black/10 bg-stone-50 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black">filter entitas</p>
              <Tabs value={historyEntityFilter} onValueChange={(value) => setHistoryEntityFilter(value as HistoryEntityFilterKey)}>
                <TabsList className="mt-2 h-auto flex-wrap justify-start bg-white p-1">
                  {entityFilterOptions.map((option) => (
                    <TabsTrigger
                      key={`history-entity-${option.key}`}
                      value={option.key}
                      className="font-mono text-[10px] uppercase tracking-[0.12em]"
                    >
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="rounded-xl border border-black/10 bg-stone-50 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black">filter mode</p>
              <Tabs value={historyModeFilter} onValueChange={(value) => setHistoryModeFilter(value as HistoryModeFilterKey)}>
                <TabsList className="mt-2 h-auto flex-wrap justify-start bg-white p-1">
                  {modeFilterOptions.map((option) => (
                    <TabsTrigger
                      key={`history-mode-${option.key}`}
                      value={option.key}
                      className="font-mono text-[10px] uppercase tracking-[0.12em]"
                    >
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="rounded-xl border border-black/10 bg-stone-50 p-3 xl:col-span-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black">search keyword</p>
              <Input
                value={historySearchTerm}
                onChange={(event) => setHistorySearchTerm(event.target.value)}
                placeholder="Cari: wp, op, preview, import, pinned, rekening..."
                className="mt-2 h-11 bg-white px-4 text-[12px] shadow-none ring-1 ring-black/10 placeholder:text-black/35"
              />
            </div>
          </div>
        ) : null}

        {hasHistorySearchTerm(historySearchTerm) ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-black/10 bg-stone-100 font-mono text-[10px] uppercase tracking-[0.14em] text-black"
            >
              {searchSummary}
            </Badge>
          </div>
        ) : null}

        {filteredHistoryEntries.length > 0 ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {filteredHistoryEntries.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-xl border p-4 ${
                  activeHistoryId === entry.id ? "border-emerald-300 bg-emerald-50/70" : "border-black/10 bg-stone-50"
                }`}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-sans text-sm font-black text-black">{ENTITY_LABELS[entry.entity]}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
                      {formatHistoryTimestamp(entry.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.pinned ? (
                      <Badge
                        variant="outline"
                        className="w-fit border-black bg-black font-mono text-[10px] uppercase tracking-[0.14em] text-white"
                      >
                        Pinned
                      </Badge>
                    ) : null}
                    <Badge
                      variant="outline"
                      className={`w-fit font-mono text-[10px] uppercase tracking-[0.14em] ${
                        entry.mode === "preview"
                          ? "border-amber-300 bg-amber-100 text-amber-900"
                          : "border-emerald-300 bg-emerald-100 text-emerald-900"
                      }`}
                    >
                      {entry.mode === "preview" ? "Preview" : "Import"}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-lg border border-black/10 bg-white p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">total</p>
                    <p className="font-sans text-lg font-black text-black">{entry.total}</p>
                  </div>
                  <div className="rounded-lg border border-black/10 bg-white p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">created</p>
                    <p className="font-sans text-lg font-black text-black">{entry.created}</p>
                  </div>
                  <div className="rounded-lg border border-black/10 bg-white p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">updated</p>
                    <p className="font-sans text-lg font-black text-black">{entry.updated}</p>
                  </div>
                  <div className="rounded-lg border border-black/10 bg-white p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">skipped</p>
                    <p className="font-sans text-lg font-black text-black">{entry.skipped}</p>
                  </div>
                  <div className="rounded-lg border border-black/10 bg-white p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">failed</p>
                    <p className="font-sans text-lg font-black text-black">{entry.failed}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                    onClick={() => handleRemoveHistory(entry.id)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Hapus Run
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                    onClick={() => handleTogglePinnedHistory(entry.id)}
                  >
                    {entry.pinned ? <PinOff className="mr-2 h-3.5 w-3.5" /> : <Pin className="mr-2 h-3.5 w-3.5" />}
                    {entry.pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                    onClick={() => restoreImportHistory(entry)}
                  >
                    Buka Ringkasan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : importHistory.length > 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-black/15 bg-stone-50 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
              {hasHistorySearchTerm(historySearchTerm)
                ? "Tidak ada histori yang cocok dengan keyword dan filter aktif. Ubah keyword, entitas, atau mode untuk melihat run lain."
                : "Tidak ada histori yang cocok dengan filter aktif. Ubah filter entitas atau mode untuk melihat run lain."}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-black/15 bg-stone-50 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
              Belum ada histori. Jalankan preview atau import untuk mulai menyimpan ringkasan run.
            </p>
          </div>
        )}
      </Card>
    );
  }

  function renderImportWorkspaceEmptyState(title: string, description: string, action?: React.ReactNode) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-5 text-center md:p-6">
        <p className="font-sans text-sm font-black uppercase tracking-[0.08em] text-slate-950">{title}</p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </div>
    );
  }

  function renderImportWorkbench() {
    const activeEntity =
      activeTutorialEntity ??
      (localPreviewState["wajib-pajak"] ? "wajib-pajak" : null) ??
      (localPreviewState["objek-pajak"] ? "objek-pajak" : null) ??
      (importResultState["wajib-pajak"] ? "wajib-pajak" : null) ??
      (importResultState["objek-pajak"] ? "objek-pajak" : null) ??
      "wajib-pajak";
    const activeEntityConfig = getEntityConfig(activeEntity);
    const activePreview = localPreviewState[activeEntity];
    const activeResult = importResultState[activeEntity];

    let body: React.ReactNode;
    if (activeImportWorkspaceView === "history") {
      body = (
        <div className="space-y-4">
          {renderImportHistoryPanel()}
          {renderMaintenanceActions(activeEntity)}
        </div>
      );
    } else if (activeImportWorkspaceView === "result") {
      body = activeResult ? (
        renderImportResultState(activeEntity)
      ) : renderImportWorkspaceEmptyState(
          "Belum Ada Hasil Validasi",
          `Jalankan preview untuk ${ENTITY_LABELS[activeEntity]} dari wizard di atas supaya summary created, updated, skipped, dan failed muncul di sini.`,
        );
    } else {
      body = activePreview ? (
        renderLocalFilePreview(activeEntity)
      ) : renderImportWorkspaceEmptyState(
          "Belum Ada File Lokal",
          `Pilih file CSV ${ENTITY_LABELS[activeEntity]} dari wizard di atas untuk mulai menampilkan preview kolom lokal dan melanjutkan ke validasi backend.`,
        );
    }

    return (
      <div ref={importWorkbenchRef} className="space-y-4">
        <Card className="border-black/10 bg-white p-3 md:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-sans text-xs font-black uppercase tracking-[0.14em] text-black">Workspace</p>
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-700"
              >
                {activeEntityConfig?.title ?? ENTITY_LABELS[activeEntity]}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500"
              >
                {activeImportWorkspaceView === "file"
                  ? "Preview Lokal"
                  : activeImportWorkspaceView === "result"
                    ? "Hasil Validasi"
                    : "Riwayat"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["wajib-pajak", "objek-pajak"] as DataToolsEntity[]).map((entity) => (
                <Button
                  key={`workspace-entity-${entity}`}
                  type="button"
                  variant={activeEntity === entity ? "default" : "outline"}
                  className="h-9 rounded-xl px-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                  onClick={() => setActiveTutorialEntity(entity)}
                >
                  {ENTITY_LABELS[entity]}
                </Button>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl px-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                  >
                    Tools
                    <ChevronDown className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 border border-black">
                  <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-500">
                    Utility Sekunder
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="font-mono text-xs" onSelect={() => setActiveImportWorkspaceView("history")}>
                    Lihat Riwayat Lokal
                  </DropdownMenuItem>
                  {canResetImportedData ? (
                    <DropdownMenuItem
                      className="font-mono text-xs text-red-700 focus:text-red-700"
                      onSelect={() => setPendingResetConfirmation({ entity: activeEntity })}
                    >
                      {activeEntity === "wajib-pajak" ? "Reset Import WP" : "Reset Import OP"}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Tabs value={activeImportWorkspaceView} onValueChange={(value) => setActiveImportWorkspaceView(value as ImportWorkspaceView)}>
            <TabsList className="mt-3 h-auto flex-wrap justify-start rounded-2xl border border-black/10 bg-slate-50 p-1">
              <TabsTrigger
                value="file"
                className="rounded-xl font-mono text-[10px] uppercase tracking-[0.12em] data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                File
              </TabsTrigger>
              <TabsTrigger
                value="result"
                className="rounded-xl font-mono text-[10px] uppercase tracking-[0.12em] data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Hasil
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-xl font-mono text-[10px] uppercase tracking-[0.12em] data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                Riwayat
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </Card>
        {body}
      </div>
    );
  }

  return (
    <BackofficeLayout>
      <div className="p-4 md:p-6" data-testid="backoffice-data-tools-page">
        <Tabs value={activePrimaryTab} onValueChange={(value) => setActivePrimaryTab(value as DataToolsPrimaryTab)}>
          <Card className="mb-4 border-black/10 bg-white p-3 md:p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-sans text-lg font-black uppercase tracking-[0.04em] text-slate-950 md:text-xl">
                      Data Tools
                    </h1>
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-700"
                    >
                      {activePrimaryTab === "import" ? "Import Workbench" : "Export Catalog"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Alat CSV untuk workflow import SIMPATDA dan export operasional backoffice.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600"
                  >
                    CSV
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600"
                  >
                    WP / OP
                  </Badge>
                </div>
                <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-black/10 bg-slate-50 p-1 shadow-none lg:w-[280px]">
                  <TabsTrigger
                    value="import"
                    className="rounded-xl py-2.5 font-sans text-sm font-black uppercase tracking-[0.06em] data-[state=active]:bg-slate-950 data-[state=active]:text-white"
                  >
                    Import
                  </TabsTrigger>
                  <TabsTrigger
                    value="export"
                    className="rounded-xl py-2.5 font-sans text-sm font-black uppercase tracking-[0.06em] data-[state=active]:bg-slate-950 data-[state=active]:text-white"
                  >
                    Export
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </Card>
        </Tabs>

        {activePrimaryTab === "import" ? renderTutorialCard() : null}
        {DATA_TOOLS_ENTITY_CONFIG.map((entityConfig) => (
          <input
            key={`hidden-input-${entityConfig.entity}`}
            ref={fileRefs[entityConfig.entity]}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleLocalFileSelection(entityConfig.entity, file);
              }
              const fileInput = fileRefs[entityConfig.entity].current;
              if (fileInput) {
                fileInput.value = "";
              }
            }}
          />
        ))}

        {activePrimaryTab === "import" ? renderImportWorkbench() : null}

        {activePrimaryTab === "export" ? renderExportWorkbenchHeader() : null}

        {activePrimaryTab === "export" ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {DATA_TOOLS_ENTITY_CONFIG.map((entityConfig) => {
              const EntityIcon = entityConfig.icon;
              const visibleGroups = entityConfig.groups
                .map((group, groupIndex) => ({
                  group,
                  groupIndex,
                  actions: getVisibleGroupActions(group, activePrimaryTab),
                }))
                .filter((item) => item.actions.length > 0);

              if (visibleGroups.length === 0) {
                return null;
              }

              return (
                <Card
                  key={entityConfig.entity}
                  className="overflow-hidden border-black/10 bg-white p-4 md:p-5"
                  ref={(node) => {
                    entityCardRefs.current[entityConfig.entity] = node;
                  }}
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                      <EntityIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-sans text-base font-black uppercase tracking-[0.05em] text-slate-950">
                        {entityConfig.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Pilih jenis export yang sesuai untuk kebutuhan operasional atau sample format.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {visibleGroups.map(({ group, groupIndex }) => (
                      <div key={`${entityConfig.entity}-group-${groupIndex}`} className="space-y-4">
                        {groupIndex > 0 ? <Separator className="bg-black/10" /> : null}
                        {renderGroup(entityConfig, group, groupIndex, activePrimaryTab)}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}
        <AlertDialog
          open={pendingImportConfirmation !== null}
          onOpenChange={(open) => {
            if (!open) setPendingImportConfirmation(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Import Final</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingImportConfirmation
                  ? `File ${localPreviewState[pendingImportConfirmation.entity]?.fileName ?? "terpilih"} akan diimport ke ${ENTITY_LABELS[pendingImportConfirmation.entity]} dan benar-benar ditulis ke sistem. Pastikan preview lokal dan preview validasi sudah sesuai sebelum melanjutkan.`
                  : "Pastikan data yang akan diimport memang siap ditulis ke sistem."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => void confirmPendingImport()}>
                Ya, Import ke Sistem
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={pendingResetConfirmation !== null}
          onOpenChange={(open) => {
            if (!open) setPendingResetConfirmation(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Reset Data Import</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingResetConfirmation
                  ? `Aksi ini akan menghapus data ${ENTITY_LABELS[pendingResetConfirmation.entity]} yang dibuat lewat import CSV.${
                      pendingResetConfirmation.entity === "wajib-pajak"
                        ? " OP yang terkait ke WP import tersebut juga akan ikut dibersihkan."
                        : ""
                    }`
                  : "Aksi ini akan menghapus data hasil import CSV."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => pendingResetConfirmation && void handleResetImportedData(pendingResetConfirmation.entity)}
              >
                Ya, Reset Data Import
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </BackofficeLayout>
  );
}
