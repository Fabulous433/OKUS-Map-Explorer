import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Building2,
  Download,
  Eye,
  FileText,
  MapPinned,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AttachmentPreviewDialog } from "@/components/attachments/attachment-preview-dialog";
import { AttachmentTypeBadge } from "@/components/attachments/attachment-type-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { createPublicMapDesaKey } from "@/lib/map/public-map-route-state";
import { queryClient } from "@/lib/queryClient";
import type {
  EntityAttachmentResponse,
  MasterKecamatan,
  MasterKelurahan,
  MasterRekeningPajak,
  ObjekPajak,
  PaginatedResult,
  WajibPajakListItem,
  WajibPajakWithBadanUsaha,
} from "@shared/schema";
import BackofficeLayout from "./layout";
import { OPFormDialog } from "./objek-pajak-form-dialog";
import {
  getObjekPajakDetailEntries,
  invalidateObjekPajakQueries,
  jenisPajakColor,
  shortLabel,
} from "./objek-pajak-shared";

type InfoRow = {
  label: string;
  value: string;
};

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: numeric % 1 === 0 ? 0 : 2,
  }).format(numeric)}`;
}

function formatPercent(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: numeric % 1 === 0 ? 0 : 2,
  }).format(numeric)}%`;
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatWpRole(value?: string | null) {
  if (!value) return null;
  if (value === "pemilik") return "Pemilik";
  if (value === "pengelola") return "Pengelola";
  return value;
}

function formatWpType(value?: string | null) {
  if (!value) return null;
  if (value === "orang_pribadi") return "Orang Pribadi";
  if (value === "badan_usaha") return "Badan Usaha";
  return value;
}

function statusBadgeClass(status?: string | null) {
  if (status === "active") return "border-transparent bg-primary text-black";
  return "border-transparent bg-[#d9dde2] text-[#4e565f]";
}

function verificationBadgeClass(status?: string | null) {
  if (status === "verified") return "border-green-700 bg-green-50 text-green-800";
  if (status === "rejected") return "border-red-700 bg-red-50 text-red-700";
  return "border-yellow-700 bg-yellow-50 text-yellow-800";
}

function compactValue(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function infoRows(rows: Array<InfoRow | null | undefined>) {
  return rows.filter((row): row is InfoRow => Boolean(row && row.value));
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Building2;
  title: string;
  subtitle?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white/95 px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-sans text-xl font-black text-[#111111]">{title}</h2>
          {subtitle ? (
            <p className="truncate font-sans text-base font-black text-black/80">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function KeyValueList({ rows }: { rows: InfoRow[] }) {
  return (
    <div className="divide-y divide-black/8">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="grid grid-cols-[116px_minmax(0,1fr)] gap-4 py-3 first:pt-0 last:pb-0"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/45">{row.label}</p>
          <p className="font-sans text-[15px] font-semibold leading-6 text-[#171717]">{row.value}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-black/15 bg-[#f7f4ea] px-4 py-5 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/45">Belum tersedia</p>
      <p className="mt-2 font-sans text-sm font-semibold text-black/70">{message}</p>
    </div>
  );
}

export default function BackofficeObjekPajakDetail() {
  const { hasRole } = useAuth();
  const canMutate = hasRole(["admin", "editor"]);
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute("/backoffice/objek-pajak/:id");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<EntityAttachmentResponse | null>(null);
  const [isLocationInfoOpen, setIsLocationInfoOpen] = useState(false);

  const opId = Number(params?.id);
  const isValidId = matched && Number.isFinite(opId) && opId > 0;
  const opQueryKey = `/api/objek-pajak/${opId}`;
  const attachmentQueryKey = `/api/objek-pajak/${opId}/attachments`;

  const opQuery = useQuery<ObjekPajak>({
    queryKey: [opQueryKey],
    enabled: isValidId,
  });

  const op = opQuery.data ?? null;

  const wpQuery = useQuery<WajibPajakWithBadanUsaha>({
    queryKey: [`/api/wajib-pajak/detail/${op?.wpId}`],
    enabled: Boolean(op?.wpId),
  });

  const attachmentQuery = useQuery<EntityAttachmentResponse[]>({
    queryKey: [attachmentQueryKey],
    enabled: isValidId,
  });

  const wpListQuery = useQuery<PaginatedResult<WajibPajakListItem>>({
    queryKey: ["/api/wajib-pajak?page=1&limit=100"],
    enabled: canMutate,
  });

  const rekeningListQuery = useQuery<MasterRekeningPajak[]>({
    queryKey: ["/api/master/rekening-pajak"],
    enabled: canMutate,
  });

  const kecamatanListQuery = useQuery<MasterKecamatan[]>({
    queryKey: ["/api/master/kecamatan"],
    enabled: canMutate,
  });

  const kelurahanListQuery = useQuery<MasterKelurahan[]>({
    queryKey: ["/api/master/kelurahan"],
    enabled: canMutate,
  });

  const wpList = wpListQuery.data?.items ?? [];
  const rekeningList = rekeningListQuery.data ?? [];
  const kecamatanList = kecamatanListQuery.data ?? [];
  const kelurahanList = kelurahanListQuery.data ?? [];
  const attachments = attachmentQuery.data ?? [];

  const detailRows = useMemo(
    () => (op ? getObjekPajakDetailEntries(op.jenisPajak, op.detailPajak as Record<string, unknown> | null) : []),
    [op],
  );

  const objectRows = useMemo(
    () =>
      op
        ? infoRows([
            { label: "Nama Objek", value: op.namaOp },
            { label: "Alamat", value: op.alamatOp },
            { label: "Jenis Pajak", value: op.jenisPajak },
            {
              label: "Rekening",
              value: compactValue(op.noRekPajak) ?? "",
            },
            {
              label: "Wilayah",
              value: [compactValue(op.kecamatan), compactValue(op.kelurahan)].filter(Boolean).join(", "),
            },
            { label: "Omset/Bulan", value: formatMoney(op.omsetBulanan) ?? "" },
            { label: "Tarif", value: formatPercent(op.tarifPersen) ?? "" },
            { label: "Pajak/Bulan", value: formatMoney(op.pajakBulanan) ?? "" },
          ])
        : [],
    [op],
  );

  const wpRows = useMemo(
    () =>
      wpQuery.data
        ? infoRows([
            { label: "Peran", value: formatWpRole(wpQuery.data.peranWp) ?? "" },
            { label: "Jenis WP", value: formatWpType(wpQuery.data.jenisWp) ?? "" },
            { label: "NPWPD", value: compactValue(wpQuery.data.npwpd) ?? "" },
            {
              label: "NIK WP",
              value:
                compactValue(wpQuery.data.nikKtpWp) ??
                compactValue(wpQuery.data.nikPengelola) ??
                "",
            },
            { label: "Alamat Pemilik", value: compactValue(wpQuery.data.alamatWp) ?? "" },
            { label: "WA Pemilik", value: compactValue(wpQuery.data.teleponWaWp) ?? "" },
            { label: "Nama Pengelola", value: compactValue(wpQuery.data.namaPengelola) ?? "" },
            { label: "Alamat Pengelola", value: compactValue(wpQuery.data.alamatPengelola) ?? "" },
            { label: "WA Pengelola", value: compactValue(wpQuery.data.teleponWaPengelola) ?? "" },
            { label: "Badan Usaha", value: compactValue(wpQuery.data.badanUsaha?.namaBadanUsaha) ?? "" },
            { label: "NPWP Badan", value: compactValue(wpQuery.data.badanUsaha?.npwpBadanUsaha) ?? "" },
            { label: "Alamat Badan", value: compactValue(wpQuery.data.badanUsaha?.alamatBadanUsaha) ?? "" },
          ])
        : [],
    [wpQuery.data],
  );

  const locationRows = useMemo(
    () =>
      op
        ? infoRows([
            {
              label: "Koordinat",
              value:
                compactValue(op.latitude?.toString()) && compactValue(op.longitude?.toString())
                  ? `${op.latitude}, ${op.longitude}`
                  : "",
            },
            {
              label: "Verifikasi",
              value:
                op.statusVerifikasi === "verified"
                  ? "Terverifikasi"
                  : op.statusVerifikasi === "rejected"
                    ? "Ditolak"
                    : "Draft",
            },
          ])
        : [],
    [op],
  );

  const hasCoordinates = Boolean(
    compactValue(op?.latitude?.toString()) && compactValue(op?.longitude?.toString()),
  );
  const isEditReady =
    canMutate &&
    Boolean(op) &&
    !wpListQuery.isLoading &&
    !rekeningListQuery.isLoading &&
    !kecamatanListQuery.isLoading &&
    !kelurahanListQuery.isLoading;

  const errorMessage = opQuery.error instanceof Error ? opQuery.error.message : "Detail objek pajak tidak ditemukan.";

  const handleBack = () => {
    setLocation("/backoffice/objek-pajak");
  };

  const handleOpenMap = () => {
    if (!op) return;

    if (!hasCoordinates) {
      setIsLocationInfoOpen(true);
      return;
    }

    const params = new URLSearchParams({
      focusOpId: String(op.id),
      focusLat: String(op.latitude),
      focusLng: String(op.longitude),
      includeUnverified: "true",
    });
    const kelurahanName = (op.kelurahan ?? kelurahanList.find((item) => item.cpmKelId === op.kelurahanId)?.cpmKelurahan ?? "").trim();
    if (op.kecamatanId && kelurahanName) {
      params.set("stage", "desa");
      params.set("kecamatanId", op.kecamatanId);
      params.set(
        "desaKey",
        createPublicMapDesaKey({
          kecamatanId: op.kecamatanId,
          desaName: kelurahanName,
        }),
      );
    } else if (op.kecamatanId) {
      params.set("stage", "kecamatan");
      params.set("kecamatanId", op.kecamatanId);
    }
    setLocation(`/?${params.toString()}`);
  };

  const handleSaved = async () => {
    invalidateObjekPajakQueries();
    await queryClient.invalidateQueries({ queryKey: [opQueryKey] });
    await queryClient.invalidateQueries({ queryKey: [attachmentQueryKey] });
    await queryClient.invalidateQueries({
      predicate: (query) =>
        typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/wajib-pajak/detail/"),
    });
  };

  if (!isValidId) {
    return (
      <BackofficeLayout hideMobileChrome>
        <div className="min-h-screen bg-[#efede6] px-4 py-6">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-black/10 bg-white p-6 shadow-card">
            <p className="font-sans text-2xl font-black text-black">ID Objek Pajak tidak valid</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-black/55">
              Buka data dari daftar objek pajak untuk melihat detailnya.
            </p>
            <Button className="mt-5 font-mono text-xs font-bold" onClick={() => setLocation("/backoffice/objek-pajak")}>
              Kembali ke daftar
            </Button>
          </div>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout hideMobileChrome>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f4f1e8_0%,#ece8dd_44%,#e6e1d5_100%)]">
        <div className="mx-auto max-w-5xl px-4 pb-28 pt-4 lg:px-8 lg:pt-8" data-testid="backoffice-op-detail-page">
          <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-black/10 bg-[#f4f1e8]/95 px-4 pb-3 pt-4 backdrop-blur lg:static lg:mx-0 lg:border-none lg:bg-transparent lg:px-0 lg:pb-5 lg:pt-0">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-2xl border border-black/10 bg-white text-black shadow-[0_8px_20px_rgba(0,0,0,0.08)] sm:h-11 sm:w-11"
                onClick={handleBack}
                aria-label="Kembali ke daftar objek pajak"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="whitespace-nowrap font-sans text-[clamp(1.45rem,5.8vw,2.75rem)] font-black leading-none text-black">
                  Detail Objek Pajak
                </h1>
              </div>
            </div>
          </div>

          {opQuery.isLoading ? (
            <div className="space-y-4">
              <div className="h-32 animate-pulse rounded-[32px] bg-[#ddd7c7]" />
              <div className="h-56 animate-pulse rounded-[28px] bg-white/70" />
              <div className="h-56 animate-pulse rounded-[28px] bg-white/70" />
            </div>
          ) : opQuery.isError || !op ? (
            <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-card">
              <p className="font-sans text-2xl font-black text-black">Objek Pajak tidak ditemukan</p>
              <p className="mt-2 font-sans text-sm text-black/70">{errorMessage}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button className="font-mono text-xs font-bold" onClick={() => opQuery.refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Muat Ulang
                </Button>
                <Button variant="outline" className="font-mono text-xs" onClick={() => setLocation("/backoffice/objek-pajak")}>
                  Kembali ke daftar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <section
                className="overflow-hidden rounded-[32px] border border-black/10 bg-[#f7f4ea] shadow-[0_24px_70px_rgba(0,0,0,0.10)]"
                data-testid="op-detail-hero"
              >
                <div className="bg-primary px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/65">NOPD</p>
                  <p className="mt-1 break-all font-sans text-2xl font-black leading-tight text-black">{op.nopd}</p>
                </div>
                <div className="space-y-4 px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Objek Pajak</p>
                      <p className="mt-1 font-sans text-2xl font-black leading-tight text-black">{op.namaOp}</p>
                    </div>
                    <Badge className={`font-mono text-[10px] ${jenisPajakColor(op.jenisPajak)}`}>
                      {shortLabel(op.jenisPajak)}
                    </Badge>
                  </div>

                  <p className="font-sans text-sm leading-6 text-black/72">{op.alamatOp}</p>

                  <div className="flex flex-wrap gap-2">
                    <Badge className={`border font-mono text-[10px] uppercase ${statusBadgeClass(op.status)}`}>
                      {op.status}
                    </Badge>
                    <Badge className={`border font-mono text-[10px] uppercase ${verificationBadgeClass(op.statusVerifikasi)}`}>
                      {op.statusVerifikasi}
                    </Badge>
                    <Badge className="border border-black/10 bg-white font-mono text-[10px] text-black/80">
                      {op.jenisPajak}
                    </Badge>
                  </div>
                </div>
              </section>

              <Section icon={Building2} title="Informasi Objek">
                <KeyValueList rows={objectRows} />
              </Section>

              <Section
                icon={UserRound}
                title="INFO WP"
                subtitle={wpQuery.data?.displayName ?? null}
              >
                {wpQuery.isLoading ? (
                  <div className="h-32 animate-pulse rounded-[22px] bg-[#f3efe4]" />
                ) : wpRows.length > 0 ? (
                  <KeyValueList rows={wpRows} />
                ) : (
                  <EmptyState message="Informasi wajib pajak belum ditemukan di repo." />
                )}
              </Section>

              <Section icon={FileText} title="Detail Pajak">
                {detailRows.length > 0 ? (
                  <KeyValueList rows={detailRows} />
                ) : (
                  <EmptyState message="Detail pajak belum diisi" />
                )}
              </Section>

              <Section icon={MapPinned} title="Lokasi & Lampiran">
                <div className="space-y-5">
                  {locationRows.length > 0 ? <KeyValueList rows={locationRows} /> : null}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/45">Lampiran</p>
                        <p className="font-sans text-sm font-semibold text-black/75">
                          Preview dan download dokumen pendukung objek pajak.
                        </p>
                      </div>
                      <Badge className="border border-black/10 bg-white font-mono text-[10px] text-black/75">
                        {attachments.length} file
                      </Badge>
                    </div>

                    {attachmentQuery.isLoading ? (
                      <div className="h-24 animate-pulse rounded-[22px] bg-[#f3efe4]" />
                    ) : attachments.length === 0 ? (
                      <EmptyState message="Lampiran belum ada untuk objek pajak ini." />
                    ) : (
                      <div className="space-y-3">
                        {attachments.map((item) => {
                          const downloadUrl = `/api/objek-pajak/${op.id}/attachments/${item.id}/download`;
                          return (
                            <div
                              key={item.id}
                              className="rounded-[22px] border border-black/10 bg-[#faf7ef] px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.05)]"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#202020] text-white">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <AttachmentTypeBadge documentType={item.documentType} />
                                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/45">
                                      {formatDate(item.uploadedAt)}
                                    </span>
                                  </div>
                                  <p className="mt-2 truncate font-sans text-sm font-black text-black">{item.fileName}</p>
                                  <p className="font-mono text-[11px] text-black/55">{item.uploadedBy}</p>
                                  {item.notes ? (
                                    <p className="mt-1 font-sans text-sm leading-6 text-black/70">{item.notes}</p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="h-11 w-11 rounded-[16px] border-white/80 bg-[#eef2f5] text-[#49515a] shadow-[6px_6px_14px_rgba(148,163,184,0.22),-6px_-6px_14px_rgba(255,255,255,0.92)] hover:bg-[#f5f7f9]"
                                      onClick={() => setPreviewItem(item)}
                                      aria-label="Preview attachment"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Preview</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="h-11 w-11 rounded-[16px] border-white/80 bg-[#eef2f5] text-[#49515a] shadow-[6px_6px_14px_rgba(148,163,184,0.22),-6px_-6px_14px_rgba(255,255,255,0.92)] hover:bg-[#f5f7f9]"
                                      onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
                                      aria-label="Download attachment"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Download</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-40 border-t border-black/10 bg-[#f4f1e8]/96 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                className="h-14 rounded-[20px] bg-primary px-3 text-center font-sans text-[clamp(1rem,4vw,1.55rem)] font-black leading-none text-black shadow-[0_12px_24px_rgba(255,208,0,0.28)] hover:bg-primary/95"
                onClick={() => setIsEditOpen(true)}
                disabled={!isEditReady}
              >
                Edit Data
              </Button>
              <Button
                type="button"
                className="h-14 rounded-[20px] bg-[#121212] px-3 text-center font-sans text-[clamp(1rem,4vw,1.55rem)] font-black leading-none text-primary shadow-[0_12px_24px_rgba(0,0,0,0.24)] hover:bg-black"
                onClick={handleOpenMap}
              >
                Lihat Lokasi
              </Button>
            </div>
            {!canMutate ? (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">
                Edit data hanya tersedia untuk admin dan editor.
              </p>
            ) : !hasCoordinates ? (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">
                Koordinat belum tersedia. Tombol lokasi akan menampilkan info penandaan.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {canMutate && op ? (
        <OPFormDialog
          mode="edit"
          editOp={op}
          wpList={wpList}
          rekeningList={rekeningList}
          kecamatanList={kecamatanList}
          kelurahanList={kelurahanList}
          isOpen={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSaved={handleSaved}
        />
      ) : null}

      <AttachmentPreviewDialog
        open={Boolean(previewItem)}
        onOpenChange={(open) => {
          if (!open) setPreviewItem(null);
        }}
        attachment={previewItem}
        downloadUrl={previewItem ? `/api/objek-pajak/${opId}/attachments/${previewItem.id}/download` : null}
      />

      <AlertDialog open={isLocationInfoOpen} onOpenChange={setIsLocationInfoOpen}>
        <AlertDialogContent className="max-w-sm rounded-[28px] border-black/10 bg-[#f7f4ea] p-0 shadow-[0_24px_70px_rgba(0,0,0,0.15)]">
          <AlertDialogHeader className="border-b border-black/10 px-5 py-4">
            <AlertDialogTitle className="font-sans text-2xl font-black text-black">
              Lokasi belum ditandai
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm leading-6 text-black/70">
              Objek pajak ini belum punya titik koordinat. Tandai lokasi dulu di form edit agar bisa dibuka di peta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 py-4">
            <AlertDialogAction className="h-11 rounded-[16px] bg-primary font-mono text-xs font-bold uppercase tracking-[0.18em] text-black hover:bg-primary/95">
              Mengerti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BackofficeLayout>
  );
}
