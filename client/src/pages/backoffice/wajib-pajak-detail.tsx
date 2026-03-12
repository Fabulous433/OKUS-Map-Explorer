import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Eye,
  FileText,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { AttachmentPreviewDialog } from "@/components/attachments/attachment-preview-dialog";
import { AttachmentTypeBadge } from "@/components/attachments/attachment-type-badge";
import BackofficeLayout from "./layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  EntityAttachmentResponse,
  ObjekPajakListItem,
  PaginatedResult,
  WajibPajakWithBadanUsaha,
} from "@shared/schema";

type InfoRow = {
  label: string;
  value: string;
};

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function compactValue(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatStatus(status?: string | null) {
  return status === "inactive" ? "Inactive" : "Active";
}

function formatVerification(status?: string | null) {
  if (status === "verified") return "Terverifikasi";
  if (status === "rejected") return "Ditolak";
  return "Draft";
}

function formatWpRole(value?: string | null) {
  if (value === "pengelola") return "Pengelola";
  if (value === "pemilik") return "Pemilik";
  return value ?? "-";
}

function formatWpType(value?: string | null) {
  if (value === "badan_usaha") return "Badan Usaha";
  if (value === "orang_pribadi") return "Orang Pribadi";
  return value ?? "-";
}

function formatValidationStatus(hasAttachments: boolean) {
  return hasAttachments ? "Valid" : "Belum Tervalidasi";
}

function statusBadgeClass(status?: string | null) {
  if (status === "active") return "border-transparent bg-primary text-black";
  return "border-transparent bg-white/18 text-white";
}

function verificationBadgeClass(status?: string | null) {
  if (status === "verified") return "border-green-700/20 bg-green-50 text-green-800";
  if (status === "rejected") return "border-red-700/20 bg-red-50 text-red-700";
  return "border-black/10 bg-white text-black/75";
}

function opStatusBadgeClass(status?: string | null) {
  if (status === "active") return "border-emerald-700/20 bg-emerald-50 text-emerald-700";
  return "border-slate-700/20 bg-slate-100 text-slate-700";
}

function heroChipClass() {
  return "border-transparent bg-white/10 text-white";
}

function validationTone(hasAttachments: boolean) {
  if (hasAttachments) {
    return {
      card: "border border-emerald-400/20 bg-emerald-500/10",
      iconWrap: "bg-emerald-500/18 text-emerald-300",
      label: "text-emerald-100/75",
      value: "text-emerald-300",
    };
  }

  return {
    card: "border border-amber-400/20 bg-amber-500/10",
    iconWrap: "bg-amber-500/18 text-amber-300",
    label: "text-amber-100/75",
    value: "text-amber-300",
  };
}

function activeAddress(wp: WajibPajakWithBadanUsaha) {
  return compactValue(wp.peranWp === "pengelola" ? wp.alamatPengelola : wp.alamatWp) ?? "-";
}

function activeKecamatan(wp: WajibPajakWithBadanUsaha) {
  return compactValue(wp.peranWp === "pengelola" ? wp.kecamatanPengelola : wp.kecamatanWp) ?? "-";
}

function activeKelurahan(wp: WajibPajakWithBadanUsaha) {
  return compactValue(wp.peranWp === "pengelola" ? wp.kelurahanPengelola : wp.kelurahanWp) ?? "-";
}

function activeNik(wp: WajibPajakWithBadanUsaha) {
  return compactValue(wp.peranWp === "pengelola" ? wp.nikPengelola : wp.nikKtpWp) ?? "-";
}

function activeContact(wp: WajibPajakWithBadanUsaha) {
  return compactValue(wp.peranWp === "pengelola" ? wp.teleponWaPengelola : wp.teleponWaWp) ?? "-";
}

function primaryWpName(wp: WajibPajakWithBadanUsaha) {
  if (wp.jenisWp === "badan_usaha") {
    return compactValue(wp.badanUsaha?.namaBadanUsaha) ?? wp.displayName;
  }
  return wp.displayName;
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  subtitle?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white/95 px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-sans text-[1.15rem] font-black uppercase tracking-[0.08em] text-[#111111]">
            {title}
          </h2>
          {subtitle ? <p className="font-sans text-sm font-semibold text-black/68">{subtitle}</p> : null}
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
          className="grid grid-cols-[108px_minmax(0,1fr)] gap-4 py-3 first:pt-0 last:pb-0"
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

export default function BackofficeWajibPajakDetail() {
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute("/backoffice/wajib-pajak/:id");
  const [previewItem, setPreviewItem] = useState<EntityAttachmentResponse | null>(null);

  const wpId = Number(params?.id);
  const isValidId = matched && Number.isFinite(wpId) && wpId > 0;
  const wpQueryKey = `/api/wajib-pajak/detail/${wpId}`;
  const attachmentQueryKey = `/api/wajib-pajak/${wpId}/attachments`;
  const opListQueryKey = `/api/objek-pajak?page=1&limit=6&includeUnverified=true&wpId=${wpId}`;

  const wpQuery = useQuery<WajibPajakWithBadanUsaha>({
    queryKey: [wpQueryKey],
    enabled: isValidId,
  });

  const attachmentQuery = useQuery<EntityAttachmentResponse[]>({
    queryKey: [attachmentQueryKey],
    enabled: isValidId,
  });

  const opListQuery = useQuery<PaginatedResult<ObjekPajakListItem>>({
    queryKey: [opListQueryKey],
    enabled: isValidId,
  });

  const wp = wpQuery.data ?? null;
  const attachments = attachmentQuery.data ?? [];
  const opItems = opListQuery.data?.items ?? [];
  const opMeta = opListQuery.data?.meta;
  const displayName = wp ? primaryWpName(wp) : "-";
  const hasAttachments = attachments.length > 0;
  const validationUi = validationTone(hasAttachments);
  const errorMessage =
    wpQuery.error instanceof Error ? wpQuery.error.message : "Data wajib pajak tidak tersedia saat ini.";

  const wpRows = useMemo(
    () =>
      wp
        ? [
            { label: "Alamat", value: activeAddress(wp) },
            { label: "Kecamatan", value: activeKecamatan(wp) },
            { label: "Kel/Desa", value: activeKelurahan(wp) },
            { label: "NIK", value: activeNik(wp) },
            { label: "Kontak", value: activeContact(wp) },
            { label: "Jenis WP", value: formatWpType(wp.jenisWp) },
            { label: "Peran WP", value: formatWpRole(wp.peranWp) },
          ]
        : [],
    [wp],
  );

  const latestAttachments = useMemo(
    () =>
      [...attachments]
        .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime())
        .slice(0, 3),
    [attachments],
  );

  const handleBack = () => setLocation("/backoffice/wajib-pajak");

  if (!isValidId) {
    return (
      <BackofficeLayout hideMobileChrome>
        <div className="min-h-screen bg-[#efede6] px-4 py-6">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-black/10 bg-white p-6 shadow-card">
            <p className="font-sans text-2xl font-black text-black">ID Wajib Pajak tidak valid</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-black/55">
              Buka data dari daftar wajib pajak untuk melihat detailnya.
            </p>
            <Button className="mt-5 font-mono text-xs font-bold" onClick={handleBack}>
              Kembali ke daftar
            </Button>
          </div>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout hideMobileChrome>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f3efe8_0%,#ece8df_42%,#e5dfd2_100%)]">
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-4 lg:px-8 lg:pt-8" data-testid="backoffice-wp-detail-page">
          <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-black/10 bg-[#f3efe8]/95 px-4 pb-3 pt-4 backdrop-blur lg:static lg:mx-0 lg:border-none lg:bg-transparent lg:px-0 lg:pb-5 lg:pt-0">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-2xl border border-black/10 bg-white text-black shadow-[0_8px_20px_rgba(0,0,0,0.08)] sm:h-11 sm:w-11"
                onClick={handleBack}
                aria-label="Kembali ke daftar wajib pajak"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="whitespace-nowrap font-sans text-[clamp(1.35rem,5.2vw,2.65rem)] font-black leading-none text-black">
                  Detail Wajib Pajak
                </h1>
              </div>
            </div>
          </div>

          {wpQuery.isLoading ? (
            <div className="space-y-4">
              <div className="h-44 animate-pulse rounded-[32px] bg-[#d8d2c5]" />
              <div className="h-64 animate-pulse rounded-[28px] bg-white/75" />
              <div className="h-56 animate-pulse rounded-[28px] bg-white/75" />
            </div>
          ) : wpQuery.isError || !wp ? (
            <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-card">
              <p className="font-sans text-2xl font-black text-black">Wajib Pajak tidak ditemukan</p>
              <p className="mt-2 font-sans text-sm text-black/70">{errorMessage}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button className="font-mono text-xs font-bold" onClick={() => wpQuery.refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Muat Ulang
                </Button>
                <Button variant="outline" className="font-mono text-xs" onClick={handleBack}>
                  Kembali ke daftar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <section
                className="overflow-hidden rounded-[32px] border border-black/10 bg-[linear-gradient(135deg,#061331_0%,#0a173b_42%,#161228_100%)] text-white shadow-[0_24px_70px_rgba(0,0,0,0.16)]"
                data-testid="wp-detail-hero"
              >
                <div className="space-y-5 px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#ff9a4d]">Taxpayer Profile</p>
                      <p className="mt-3 font-sans text-[clamp(1.45rem,5.2vw,2.3rem)] font-black leading-[1.08] text-white">
                        {displayName}
                      </p>
                      <p className="mt-2 break-all font-mono text-[13px] uppercase tracking-[0.16em] text-white/62">
                        {wp.npwpd || "-"}
                      </p>
                    </div>
                    <Badge className={`font-mono text-[10px] uppercase ${statusBadgeClass(wp.statusAktif)}`}>
                      {formatStatus(wp.statusAktif)}
                    </Badge>
                  </div>

                  <div className="grid gap-3 border-t border-white/18 pt-4 sm:grid-cols-2">
                    <div className={`flex items-center gap-3 rounded-[22px] px-4 py-3 ${validationUi.card}`}>
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${validationUi.iconWrap}`}>
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-sans text-sm ${validationUi.label}`}>Status Validasi</p>
                        <p className={`font-sans text-lg font-black ${validationUi.value}`}>{formatValidationStatus(hasAttachments)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-start gap-2 rounded-[22px] border border-white/10 bg-white/8 px-4 py-3">
                      <Badge className={`font-mono text-[10px] uppercase ${heroChipClass()}`}>
                        {formatWpType(wp.jenisWp)}
                      </Badge>
                      <Badge className={`font-mono text-[10px] uppercase ${heroChipClass()}`}>
                        {formatWpRole(wp.peranWp)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </section>

              <Section icon={UserRound} title="INFO WP" subtitle={displayName}>
                <KeyValueList rows={wpRows} />
              </Section>

              <Section
                icon={Building2}
                title="OP TERDAFTAR"
                subtitle={
                  typeof opMeta?.total === "number"
                    ? `${opMeta.total} objek pajak`
                    : "Daftar objek pajak yang memakai WP ini"
                }
              >
                {opListQuery.isLoading ? (
                  <div className="h-28 animate-pulse rounded-[22px] bg-[#f3efe4]" />
                ) : opItems.length === 0 ? (
                  <EmptyState message="Belum ada objek pajak yang terdaftar untuk wajib pajak ini." />
                ) : (
                  <div className="space-y-3">
                    {opItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full rounded-[22px] border border-black/10 bg-[#faf7ef] px-4 py-4 text-left shadow-[0_10px_24px_rgba(0,0,0,0.05)] transition-transform duration-150 hover:-translate-y-0.5"
                        onClick={() => setLocation(`/backoffice/objek-pajak/${item.id}`)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                              NOPD {item.nopd}
                            </p>
                            <Badge className={`shrink-0 font-mono text-[10px] uppercase ${opStatusBadgeClass(item.status)}`}>
                              {formatStatus(item.status)}
                            </Badge>
                          </div>
                          <p className="truncate font-sans text-[1.05rem] font-black leading-6 text-black">
                            {item.namaOp}
                          </p>
                          <p className="min-w-0 truncate font-sans text-sm text-black/70">{item.jenisPajak}</p>
                        </div>
                      </button>
                    ))}
                    {typeof opMeta?.total === "number" && opMeta.total > opItems.length ? (
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/45">
                        +{opMeta.total - opItems.length} objek pajak lainnya belum ditampilkan.
                      </p>
                    ) : null}
                  </div>
                )}
              </Section>

              <Section
                icon={FileText}
                title="LAMPIRAN TERAKHIR"
                subtitle={
                  attachments.length > 0
                    ? `${attachments.length} file tersimpan`
                    : "Dokumen wajib pajak terbaru"
                }
              >
                {attachmentQuery.isLoading ? (
                  <div className="h-28 animate-pulse rounded-[22px] bg-[#f3efe4]" />
                ) : latestAttachments.length === 0 ? (
                  <EmptyState message="Belum ada lampiran untuk wajib pajak ini." />
                ) : (
                  <div className="space-y-3">
                    {latestAttachments.map((item) => {
                      const downloadUrl = `/api/wajib-pajak/${wp.id}/attachments/${item.id}/download`;
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
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 rounded-[16px] border-white/80 bg-[#eef2f5] px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#49515a] shadow-[6px_6px_14px_rgba(148,163,184,0.22),-6px_-6px_14px_rgba(255,255,255,0.92)] hover:bg-[#f5f7f9]"
                              onClick={() => setPreviewItem(item)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 rounded-[16px] border-white/80 bg-[#eef2f5] px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#49515a] shadow-[6px_6px_14px_rgba(148,163,184,0.22),-6px_-6px_14px_rgba(255,255,255,0.92)] hover:bg-[#f5f7f9]"
                              onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Buka
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      </div>

      <AttachmentPreviewDialog
        open={Boolean(previewItem)}
        onOpenChange={(open) => {
          if (!open) setPreviewItem(null);
        }}
        attachment={previewItem}
        downloadUrl={previewItem ? `/api/wajib-pajak/${wpId}/attachments/${previewItem.id}/download` : null}
      />
    </BackofficeLayout>
  );
}
