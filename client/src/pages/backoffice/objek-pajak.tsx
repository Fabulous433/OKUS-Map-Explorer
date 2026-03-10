import React, { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Download, Edit, History, MapPin, Plus, Search, Trash2, Upload, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AuditHistoryDialog from "@/components/audit-history-dialog";
import { MobileOpCard } from "@/components/backoffice/mobile-op-card";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type {
  MasterKecamatan,
  MasterKelurahan,
  MasterRekeningPajak,
  ObjekPajak,
  ObjekPajakListItem,
  PaginatedResult,
  WajibPajakListItem,
} from "@shared/schema";
import BackofficeLayout from "./layout";
import { OPFormDialog } from "./objek-pajak-form-dialog";
import {
  INITIAL_CURSOR,
  invalidateObjekPajakQueries,
  jenisPajakColor,
  shortLabel,
} from "./objek-pajak-shared";
export default function BackofficeObjekPajak() {
  const { hasRole } = useAuth();
  const isMobile = useIsMobile();
  const canMutate = hasRole(["admin", "editor"]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editOp, setEditOp] = useState<ObjekPajak | null>(null);
  const [auditTargetId, setAuditTargetId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "draft" | "verified" | "rejected">("all");
  const [kecamatanFilterId, setKecamatanFilterId] = useState<string>("all");
  const [rekPajakFilterId, setRekPajakFilterId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [cursorHistory, setCursorHistory] = useState<number[]>([INITIAL_CURSOR]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const activeCursor = cursorHistory[cursorHistory.length - 1] ?? INITIAL_CURSOR;

  useEffect(() => {
    setPage(1);
    setCursorHistory([INITIAL_CURSOR]);
  }, [debouncedSearch, statusFilter, verificationFilter, kecamatanFilterId, rekPajakFilterId, limit]);

  const objekPajakQueryKey = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (activeCursor !== INITIAL_CURSOR) {
      params.set("cursor", String(activeCursor));
    }
    params.set("includeUnverified", "true");
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (verificationFilter !== "all") params.set("statusVerifikasi", verificationFilter);
    if (kecamatanFilterId !== "all") params.set("kecamatanId", kecamatanFilterId);
    if (rekPajakFilterId !== "all") params.set("rekPajakId", rekPajakFilterId);
    return `/api/objek-pajak?${params.toString()}`;
  }, [activeCursor, debouncedSearch, kecamatanFilterId, limit, page, rekPajakFilterId, statusFilter, verificationFilter]);

  const { data: listResult, isLoading, isFetching } = useQuery<PaginatedResult<ObjekPajakListItem>>({
    queryKey: [objekPajakQueryKey],
    placeholderData: keepPreviousData,
  });
  const opList = listResult?.items ?? [];
  const opMeta = listResult?.meta ?? {
    page,
    limit,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
    mode: "cursor" as const,
    cursor: activeCursor,
    nextCursor: null,
  };

  const { data: wpPage } = useQuery<PaginatedResult<WajibPajakListItem>>({
    queryKey: ["/api/wajib-pajak?page=1&limit=100"],
  });
  const wpList = Array.isArray(wpPage?.items) ? wpPage.items : [];

  const { data: rekeningListData } = useQuery<MasterRekeningPajak[]>({
    queryKey: ["/api/master/rekening-pajak"],
  });
  const rekeningList = Array.isArray(rekeningListData) ? rekeningListData : [];

  const { data: kecamatanListData } = useQuery<MasterKecamatan[]>({
    queryKey: ["/api/master/kecamatan"],
  });
  const kecamatanList = Array.isArray(kecamatanListData) ? kecamatanListData : [];

  const { data: kelurahanListData } = useQuery<MasterKelurahan[]>({
    queryKey: ["/api/master/kelurahan"],
  });
  const kelurahanList = Array.isArray(kelurahanListData) ? kelurahanListData : [];

  const { toast } = useToast();

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canMutate) return;

    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/objek-pajak/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const result = await res.json();
      if (!res.ok) {
        const description =
          typeof result?.message === "string"
            ? result.message
            : "Import OP gagal diproses. Periksa file CSV lalu coba lagi.";
        toast({ title: "Gagal", description, variant: "destructive" });
      } else {
        const errorPreview = Array.isArray(result.errors)
          ? result.errors
              .slice(0, 3)
              .filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
              .join(" | ")
          : "";
        toast({
          title: "Import Selesai",
          description:
            result.failed > 0 && errorPreview
              ? `${result.success} berhasil, ${result.failed} gagal dari ${result.total} data. Contoh error: ${errorPreview}`
              : `${result.success} berhasil, ${result.failed} gagal dari ${result.total} data`,
          variant: result.failed > 0 ? "destructive" : "default",
        });
        if (result.errors?.length > 0) {
          console.log("Import errors:", result.errors);
        }
        invalidateObjekPajakQueries();
      }
    } catch (err: any) {
      const description = err instanceof Error ? err.message : "Import OP gagal diproses. Coba lagi.";
      toast({ title: "Error", description, variant: "destructive" });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/objek-pajak/${id}`);
    },
    onSuccess: () => {
      invalidateObjekPajakQueries();
      toast({ title: "Berhasil", description: "Objek Pajak berhasil dihapus" });
    },
  });

  const verificationMutation = useMutation({
    mutationFn: async (payload: { id: number; statusVerifikasi: "verified" | "rejected"; catatanVerifikasi?: string }) => {
      const res = await apiRequest("PATCH", `/api/objek-pajak/${payload.id}/verification`, {
        statusVerifikasi: payload.statusVerifikasi,
        catatanVerifikasi: payload.catatanVerifikasi ?? null,
        verifierName: "backoffice",
      });
      return res.json();
    },
    onSuccess: () => {
      invalidateObjekPajakQueries();
      toast({ title: "Berhasil", description: "Status verifikasi diperbarui" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const wpMap = new Map(wpList.map((wp) => [wp.id, wp]));

  const rejectOp = (id: number) => {
    const note = window.prompt("Masukkan catatan penolakan:");
    if (!note) return;
    verificationMutation.mutate({ id, statusVerifikasi: "rejected", catatanVerifikasi: note });
  };

  const moveToTopPage = () => {
    setPage(1);
    setCursorHistory([INITIAL_CURSOR]);
  };

  const openEdit = async (id: number) => {
    if (!canMutate) return;
    try {
      const response = await fetch(`/api/objek-pajak/${id}`, { credentials: "include" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: "Gagal memuat detail OP" }));
        throw new Error(typeof body?.message === "string" ? body.message : "Gagal memuat detail OP");
      }
      const body = (await response.json()) as ObjekPajak;
      setEditOp(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memuat detail OP";
      toast({ title: "Gagal", description: message, variant: "destructive" });
    }
  };

  return (
    <BackofficeLayout>
      <div className="p-4 md:p-6" data-testid="backoffice-op-page">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImportCSV}
          data-testid="input-import-op-file"
        />
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-black w-10 h-10 flex items-center justify-center border-[2px] border-[#FFFF00]">
              <Building2 className="w-5 h-5 text-[#FFFF00]" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-black text-black leading-none" data-testid="text-page-title">
                OBJEK PAJAK
              </h1>
              <p className="font-mono text-[10px] text-gray-500 tracking-widest uppercase">
                Kelola Data Objek Pajak Daerah
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="outline"
              className="rounded-none border-[3px] border-black bg-white text-black font-mono font-bold text-xs no-default-hover-elevate no-default-active-elevate"
              onClick={() => window.open("/api/objek-pajak/export", "_blank")}
              data-testid="button-export-op"
            >
              <Download className="w-4 h-4 mr-1" />
              EXPORT CSV
            </Button>
            {canMutate && <Button
              variant="outline"
              className="rounded-none border-[3px] border-black bg-white text-black font-mono font-bold text-xs no-default-hover-elevate no-default-active-elevate"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-import-op"
            >
              <Upload className="w-4 h-4 mr-1" />
              IMPORT CSV
            </Button>}
            {canMutate && <Button
              className="w-full rounded-none border-[3px] border-[#FFFF00] bg-black text-[#FFFF00] font-mono font-bold no-default-hover-elevate no-default-active-elevate sm:w-auto"
              onClick={() => setIsCreateOpen(true)}
              data-testid="button-add-op"
            >
              <Plus className="w-4 h-4 mr-2" />
              TAMBAH OP
            </Button>}
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <div className="relative w-full md:max-w-md md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama objek, NOPD, alamat..."
              className="pl-9 rounded-none border-[3px] border-black font-mono text-sm"
              data-testid="input-search-op"
            />
          </div>
          <Badge className="rounded-none border-[2px] border-black bg-black text-[#FFFF00] font-mono text-xs no-default-hover-elevate no-default-active-elevate">
            {opMeta.total} OP
          </Badge>
        </div>

        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[11px] text-gray-600">
            Halaman {page} dari {opMeta.totalPages}
            {isFetching ? " - memperbarui..." : ""}
          </p>
          <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
            <SelectTrigger className="w-full rounded-none border-[2px] border-black font-mono text-xs md:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="10">10 / halaman</SelectItem>
              <SelectItem value="25">25 / halaman</SelectItem>
              <SelectItem value="50">50 / halaman</SelectItem>
              <SelectItem value="100">100 / halaman</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="w-full rounded-none border-[2px] border-black font-mono text-xs md:w-[170px]" data-testid="select-filter-status-op">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={verificationFilter} onValueChange={(value) => setVerificationFilter(value as typeof verificationFilter)}>
            <SelectTrigger className="w-full rounded-none border-[2px] border-black font-mono text-xs md:w-[210px]" data-testid="select-filter-verification-op">
              <SelectValue placeholder="Filter verifikasi" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="all">Semua Verifikasi</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rekPajakFilterId} onValueChange={setRekPajakFilterId}>
            <SelectTrigger className="w-full rounded-none border-[2px] border-black font-mono text-xs md:w-[240px]">
              <SelectValue placeholder="Filter rekening" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="all">Semua Rekening</SelectItem>
              {rekeningList.map((rek) => (
                <SelectItem key={rek.id} value={String(rek.id)}>
                  {rek.kodeRekening} - {rek.namaRekening}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={kecamatanFilterId} onValueChange={setKecamatanFilterId}>
            <SelectTrigger className="w-full rounded-none border-[2px] border-black font-mono text-xs md:w-[220px]" data-testid="select-filter-kecamatan-op">
              <SelectValue placeholder="Filter kecamatan" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="all">Semua Kecamatan</SelectItem>
              {kecamatanList.map((kec) => (
                <SelectItem key={kec.cpmKecId} value={kec.cpmKecId}>
                  {kec.cpmKecamatan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(statusFilter !== "all" || verificationFilter !== "all" || kecamatanFilterId !== "all" || rekPajakFilterId !== "all") && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-none border-[2px] border-black font-mono text-xs"
              onClick={() => {
                setStatusFilter("all");
                setVerificationFilter("all");
                setKecamatanFilterId("all");
                setRekPajakFilterId("all");
              }}
              data-testid="button-reset-filter-op"
            >
              RESET FILTER
            </Button>
          )}
        </div>

        {canMutate && <OPFormDialog
          mode="create"
          wpList={wpList}
          rekeningList={rekeningList}
          kecamatanList={kecamatanList}
          kelurahanList={kelurahanList}
          isOpen={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSaved={moveToTopPage}
        />}

        {canMutate && <OPFormDialog
          mode="edit"
          editOp={editOp}
          wpList={wpList}
          rekeningList={rekeningList}
          kecamatanList={kecamatanList}
          kelurahanList={kelurahanList}
          isOpen={!!editOp}
          onOpenChange={(open) => { if (!open) setEditOp(null); }}
          onSaved={moveToTopPage}
        />}

        {isLoading ? (
          <div className="flex items-center justify-center h-64" data-testid="loading-op">
            <div className="bg-black border-[4px] border-[#FFFF00] p-6 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-[#FFFF00] border-t-transparent animate-spin" />
              <span className="font-mono text-sm font-bold text-[#FFFF00]">MEMUAT DATA...</span>
            </div>
          </div>
        ) : opList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-[4px] border-dashed border-black" data-testid="empty-op">
            <div className="bg-black w-20 h-20 flex items-center justify-center border-[4px] border-[#FFFF00] mb-4">
              <Building2 className="w-10 h-10 text-[#FFFF00]" />
            </div>
            <p className="font-serif text-xl font-black text-black">BELUM ADA DATA</p>
            <p className="font-mono text-xs text-gray-500 mt-1">Klik tombol TAMBAH OP untuk memulai</p>
          </div>
        ) : isMobile ? (
          <div className="space-y-3">
            {opList.map((op) => {
              const wp = op.wpId ? wpMap.get(op.wpId) : null;
              return (
                <MobileOpCard
                  key={op.id}
                  op={op}
                  wp={wp}
                  canMutate={canMutate}
                  onEdit={openEdit}
                  onAudit={setAuditTargetId}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onVerify={(id) => verificationMutation.mutate({ id, statusVerifikasi: "verified" })}
                  onReject={rejectOp}
                />
              );
            })}
          </div>
        ) : (
          <div className="border-[3px] border-black overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-black border-b-[2px] border-[#FFFF00]">
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">NOPD</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">NAMA OBJEK</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">JENIS PAJAK</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">WAJIB PAJAK</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">ALAMAT</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">PAJAK/BLN</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">STATUS</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">VERIFIKASI</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">DETAIL</TableHead>
                  <TableHead className="font-mono text-[10px] font-bold text-[#FFFF00] whitespace-nowrap">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opList.map((op) => {
                  const wp = op.wpId ? wpMap.get(op.wpId) : null;
                  const hasDetail = op.hasDetail;
                  return (
                    <TableRow
                      key={op.id}
                      className="border-b-[1px] border-gray-200 hover:bg-gray-50 transition-all duration-150 animate-in fade-in"
                      data-testid={`row-op-${op.id}`}
                    >
                      <TableCell className="font-mono text-xs text-black" data-testid={`text-nopd-${op.id}`}>
                        {op.nopd}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-black max-w-[200px] truncate" data-testid={`text-nama-objek-${op.id}`}>
                        {op.namaOp}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-none border-[2px] border-black font-mono text-[10px] no-default-hover-elevate no-default-active-elevate ${jenisPajakColor(op.jenisPajak)}`}
                          data-testid={`badge-jenis-${op.id}`}
                        >
                          {shortLabel(op.jenisPajak)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600 max-w-[150px] truncate" data-testid={`text-wp-${op.id}`}>
                        {wp ? wp.displayName : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600 max-w-[200px] truncate">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{op.alamatOp}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-black whitespace-nowrap">
                        {op.pajakBulanan ? (
                          <div className="flex items-center gap-1">
                            <span>Rp {Number(op.pajakBulanan).toLocaleString("id-ID")}</span>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-none border-[2px] border-black font-mono text-[10px] no-default-hover-elevate no-default-active-elevate ${
                            op.status === "active" ? "bg-[#FFFF00] text-black" : "bg-gray-200 text-gray-600"
                          }`}
                          data-testid={`badge-status-${op.id}`}
                        >
                          {op.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-none border-[2px] border-black font-mono text-[10px] no-default-hover-elevate no-default-active-elevate ${
                            op.statusVerifikasi === "verified"
                              ? "bg-green-100 text-green-800 border-green-700"
                              : op.statusVerifikasi === "rejected"
                                ? "bg-red-100 text-red-800 border-red-700"
                                : "bg-yellow-100 text-yellow-800 border-yellow-700"
                          }`}
                        >
                          {op.statusVerifikasi.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hasDetail ? (
                          <Badge className="rounded-none border-[2px] border-green-600 bg-green-100 text-green-800 font-mono text-[10px] no-default-hover-elevate no-default-active-elevate" data-testid={`badge-detail-ok-${op.id}`}>
                            LENGKAP
                          </Badge>
                        ) : (
                          <Badge className="rounded-none border-[2px] border-orange-500 bg-orange-100 text-orange-700 font-mono text-[10px] no-default-hover-elevate no-default-active-elevate" data-testid={`badge-detail-pending-${op.id}`}>
                            BELUM
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canMutate && <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-none border-[2px] border-black no-default-hover-elevate no-default-active-elevate"
                            onClick={() => openEdit(op.id)}
                            data-testid={`button-edit-op-${op.id}`}
                          >
                            <Edit className="w-3.5 h-3.5 text-black" />
                          </Button>}
                          {canMutate && <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-none border-[2px] border-green-700 no-default-hover-elevate no-default-active-elevate"
                            onClick={() => verificationMutation.mutate({ id: op.id, statusVerifikasi: "verified" })}
                            data-testid={`button-verify-op-${op.id}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
                          </Button>}
                          {canMutate && <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-none border-[2px] border-red-700 no-default-hover-elevate no-default-active-elevate"
                            onClick={() => rejectOp(op.id)}
                            data-testid={`button-reject-op-${op.id}`}
                          >
                            <XCircle className="w-3.5 h-3.5 text-red-700" />
                          </Button>}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-none border-[2px] border-black no-default-hover-elevate no-default-active-elevate"
                            onClick={() => setAuditTargetId(op.id)}
                            data-testid={`button-audit-op-${op.id}`}
                          >
                            <History className="w-3.5 h-3.5 text-black" />
                          </Button>
                          {canMutate && <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-none no-default-hover-elevate no-default-active-elevate"
                            onClick={() => deleteMutation.mutate(op.id)}
                            data-testid={`button-delete-op-${op.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-gray-600">
            Menampilkan {opList.length} dari {opMeta.total} data
          </p>
          <Pagination className="w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    if (cursorHistory.length > 1) {
                      setCursorHistory((prev) => prev.slice(0, -1));
                      setPage((prev) => Math.max(1, prev - 1));
                    }
                  }}
                  className={`rounded-none border-[2px] border-black font-mono text-xs ${cursorHistory.length > 1 ? "" : "pointer-events-none opacity-40"}`}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive className="rounded-none border-[2px] border-black font-mono text-xs">
                  {page}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    const nextCursor = opMeta.nextCursor;
                    if (typeof nextCursor === "number") {
                      setCursorHistory((prev) => [...prev, nextCursor]);
                      setPage((prev) => prev + 1);
                    }
                  }}
                  className={`rounded-none border-[2px] border-black font-mono text-xs ${opMeta.nextCursor ? "" : "pointer-events-none opacity-40"}`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
        <AuditHistoryDialog
          open={auditTargetId !== null}
          onOpenChange={(open) => !open && setAuditTargetId(null)}
          entityType="objek_pajak"
          entityId={auditTargetId}
          title="Riwayat Perubahan Objek Pajak"
        />
      </div>
    </BackofficeLayout>
  );
}




