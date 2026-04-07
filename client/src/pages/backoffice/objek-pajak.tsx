import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import {
 Building2,
 CheckCircle2,
 ChevronLeft,
 ChevronRight,
 Edit,
 Eye,
 History,
 MapPin,
 MoreHorizontal,
 Plus,
 Search,
 Trash2,
 XCircle,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
 invalidateObjekPajakQueries,
 jenisPajakColor,
 shortLabel,
} from "./objek-pajak-shared";

function buildPageItems(page: number, totalPages: number) {
 const safeTotal = Math.max(1, totalPages);
 if (safeTotal <= 5) {
 return Array.from({ length: safeTotal }, (_, index) => index + 1);
 }

 if (page <= 3) {
 return [1, 2, 3, 4, safeTotal];
 }

 if (page >= safeTotal - 2) {
 return [1, safeTotal - 3, safeTotal - 2, safeTotal - 1, safeTotal];
 }

 return [1, page - 1, page, page + 1, safeTotal];
}

function formatPajakBulanan(value: string | null | undefined) {
 if (!value) return "-";
 const numeric = Number(value);
 if (!Number.isFinite(numeric)) return "-";
 return `Rp ${numeric.toLocaleString("id-ID")}`;
}

function verificationBadgeClass(statusVerifikasi: ObjekPajakListItem["statusVerifikasi"]) {
 if (statusVerifikasi === "verified") {
 return "bg-green-100 text-green-800 border-green-700";
 }

 if (statusVerifikasi === "rejected") {
 return "bg-red-100 text-red-800 border-red-700";
 }

 return "bg-yellow-100 text-yellow-800 border-yellow-700";
}
export default function BackofficeObjekPajak() {
 const { hasRole } = useAuth();
 const isMobile = useIsMobile();
 const [, setLocation] = useLocation();
 const search = useSearch();
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
 const debouncedSearch = useDebouncedValue(searchQuery, 300);

 useEffect(() => {
 setPage(1);
 }, [debouncedSearch, statusFilter, verificationFilter, kecamatanFilterId, rekPajakFilterId, limit]);

 useEffect(() => {
 if (!canMutate) return;
 if (new URLSearchParams(search).get("create") !== "1") return;
 setIsCreateOpen(true);
 setLocation("/backoffice/objek-pajak", { replace: true });
 }, [canMutate, search, setLocation]);

 const objekPajakQueryKey = useMemo(() => {
 const params = new URLSearchParams();
 params.set("page", String(page));
 params.set("limit", String(limit));
 params.set("includeUnverified", "true");
 if (debouncedSearch) params.set("q", debouncedSearch);
 if (statusFilter !== "all") params.set("status", statusFilter);
 if (verificationFilter !== "all") params.set("statusVerifikasi", verificationFilter);
 if (kecamatanFilterId !== "all") params.set("kecamatanId", kecamatanFilterId);
 if (rekPajakFilterId !== "all") params.set("rekPajakId", rekPajakFilterId);
 return `/api/objek-pajak?${params.toString()}`;
 }, [debouncedSearch, kecamatanFilterId, limit, page, rekPajakFilterId, statusFilter, verificationFilter]);

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
 mode: "offset" as const,
 cursor: null,
 nextCursor: null,
 };
 const pageItems = buildPageItems(page, opMeta.totalPages);

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
 const kecamatanMap = useMemo(() => new Map(kecamatanList.map((item) => [item.cpmKecId, item.cpmKecamatan])), [kecamatanList]);
 const kelurahanMap = useMemo(() => new Map(kelurahanList.map((item) => [item.cpmKelId, item.cpmKelurahan])), [kelurahanList]);

 const { toast } = useToast();

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

 const openView = (id: number) => {
 setLocation(`/backoffice/objek-pajak/${id}`);
 };

 const openLocation = (op: ObjekPajakListItem) => {
 if (!op.latitude || !op.longitude) return;

 const params = new URLSearchParams();
 params.set("focusOpId", String(op.id));
 params.set("focusLat", op.latitude);
 params.set("focusLng", op.longitude);
 window.open(`/?${params.toString()}`, "_blank", "noopener,noreferrer");
 };

 return (
 <BackofficeLayout>
 <div className="p-4 md:p-6" data-testid="backoffice-op-page">
 <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div className="flex items-center gap-3">
 <div className="bg-[#2d3436] w-10 h-10 flex items-center justify-center border border-primary/30">
 <Building2 className="w-5 h-5 text-white" />
 </div>
 <div>
 <h1 className="font-sans text-2xl font-black text-black leading-none" data-testid="text-page-title">
 OBJEK PAJAK
 </h1>
 <p className="font-mono text-[10px] text-gray-500 tracking-widest uppercase">
 Kelola Data Objek Pajak Daerah
 </p>
 </div>
 </div>
 <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
 {canMutate && !isMobile && <Tooltip><TooltipTrigger asChild><Button
 className="border border-primary/30 bg-[#2d3436] text-white font-mono font-bold sm:w-auto"
 onClick={() => setIsCreateOpen(true)}
 data-testid="button-add-op"
 aria-label="Tambah OP"
 >
 <Plus className="w-4 h-4 sm:mr-2" />
 <span className="hidden sm:inline">TAMBAH OP</span>
 </Button></TooltipTrigger><TooltipContent>Tambah OP</TooltipContent></Tooltip>}
 </div>
 </div>

 <div className="mb-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
 <div className="relative w-full md:max-w-md md:flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Cari nama objek, nama WP, NOPD, alamat..."
 className="pl-9 shadow-card font-mono text-sm"
 data-testid="input-search-op"
 />
 </div>
 <Badge className="bg-[#2d3436] text-white font-mono text-xs">
 {opMeta.total} OP
 </Badge>
 </div>

 <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
 <p className="font-mono text-[11px] text-gray-600">
 Halaman {page} dari {opMeta.totalPages}
 {isFetching ? " - memperbarui..." : ""}
 </p>
 <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
 <SelectTrigger className="w-full font-mono text-xs md:w-[130px]">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="border border-black">
 <SelectItem value="10">10 / halaman</SelectItem>
 <SelectItem value="25">25 / halaman</SelectItem>
 <SelectItem value="50">50 / halaman</SelectItem>
 <SelectItem value="100">100 / halaman</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {!isMobile && <div className="mb-4 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
 <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
 <SelectTrigger className="w-full font-mono text-xs md:w-[170px]" data-testid="select-filter-status-op">
 <SelectValue placeholder="Filter status" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 <SelectItem value="all">Semua Status</SelectItem>
 <SelectItem value="active">Active</SelectItem>
 <SelectItem value="inactive">Inactive</SelectItem>
 </SelectContent>
 </Select>
 <Select value={verificationFilter} onValueChange={(value) => setVerificationFilter(value as typeof verificationFilter)}>
 <SelectTrigger className="w-full font-mono text-xs md:w-[210px]" data-testid="select-filter-verification-op">
 <SelectValue placeholder="Filter verifikasi" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 <SelectItem value="all">Semua Verifikasi</SelectItem>
 <SelectItem value="draft">Draft</SelectItem>
 <SelectItem value="verified">Verified</SelectItem>
 <SelectItem value="rejected">Rejected</SelectItem>
 </SelectContent>
 </Select>
 <Select value={rekPajakFilterId} onValueChange={setRekPajakFilterId}>
 <SelectTrigger className="w-full font-mono text-xs md:w-[240px]">
 <SelectValue placeholder="Filter rekening" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 <SelectItem value="all">Semua Rekening</SelectItem>
 {rekeningList.map((rek) => (
 <SelectItem key={rek.id} value={String(rek.id)}>
 {rek.kodeRekening} - {rek.namaRekening}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select value={kecamatanFilterId} onValueChange={setKecamatanFilterId}>
 <SelectTrigger className="w-full font-mono text-xs md:w-[220px]" data-testid="select-filter-kecamatan-op">
 <SelectValue placeholder="Filter kecamatan" />
 </SelectTrigger>
 <SelectContent className="border border-black">
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
 className="font-mono text-xs"
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
 </div>}

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
 <div className="bg-[#2d3436] border-2 border-primary/30 p-6 flex flex-col items-center gap-3">
 <div className="w-8 h-8 border border-primary/30 border-t-transparent animate-spin" />
 <span className="font-mono text-sm font-bold text-white">MEMUAT DATA...</span>
 </div>
 </div>
 ) : opList.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border" data-testid="empty-op">
 <div className="bg-[#2d3436] w-20 h-20 flex items-center justify-center border-2 border-primary/30 mb-4">
 <Building2 className="w-10 h-10 text-white" />
 </div>
 <p className="font-sans text-xl font-black text-black">BELUM ADA DATA</p>
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
 onView={openView}
 onDelete={(id) => deleteMutation.mutate(id)}
 onVerify={(id) => verificationMutation.mutate({ id, statusVerifikasi: "verified" })}
 onReject={rejectOp}
 />
 );
 })}
 </div>
 ) : (
 <div className="overflow-hidden shadow-card">
 <Table className="table-fixed">
 <TableHeader>
 <TableRow className="bg-[#2d3436] border-b-[2px] border-primary/30">
 <TableHead className="w-[32%] font-mono text-[10px] font-bold text-white whitespace-nowrap">OBJEK</TableHead>
 <TableHead className="w-[28%] font-mono text-[10px] font-bold text-white whitespace-nowrap">LOKASI</TableHead>
 <TableHead className="w-[14%] font-mono text-[10px] font-bold text-white whitespace-nowrap">PAJAK/BLN</TableHead>
 <TableHead className="w-[15%] font-mono text-[10px] font-bold text-white whitespace-nowrap">STATE</TableHead>
 <TableHead className="w-[11%] text-right font-mono text-[10px] font-bold text-white whitespace-nowrap">AKSI</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {opList.map((op) => {
 const wp = op.wpId ? wpMap.get(op.wpId) : null;
 const hasDetail = op.hasDetail;
 const kecamatanName = kecamatanMap.get(op.kecamatanId) ?? "-";
 const kelurahanName = kelurahanMap.get(op.kelurahanId) ?? "-";
 const hasCoordinates = Boolean(op.latitude && op.longitude);
 return (
 <TableRow
 key={op.id}
 className="animate-in border-b border-gray-200 transition-all duration-150 hover:bg-gray-50/80 fade-in"
 data-testid={`row-op-${op.id}`}
 >
 <TableCell className="align-top">
 <div className="min-w-0 space-y-2 pr-3">
 <div className="flex min-w-0 items-start justify-between gap-3">
 <div className="min-w-0">
 <p className="truncate font-sans text-[15px] font-black leading-tight text-black" data-testid={`text-nama-objek-${op.id}`}>
 {op.namaOp}
 </p>
 <p className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-gray-500" data-testid={`text-nopd-${op.id}`}>
 {op.nopd}
 </p>
 </div>
 <Badge
 className={`shrink-0 font-mono text-[10px] ${jenisPajakColor(op.jenisPajak)}`}
 data-testid={`badge-jenis-${op.id}`}
 >
 {shortLabel(op.jenisPajak)}
 </Badge>
 </div>
 <div className="min-w-0 rounded-xl border border-black/10 bg-white/70 px-3 py-2 shadow-[inset_1px_1px_0_rgba(255,255,255,0.7)]">
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">Wajib Pajak</p>
 <p className="truncate font-sans text-sm font-medium text-slate-700" data-testid={`text-wp-${op.id}`}>
 {wp?.displayName || op.wpDisplayName || "-"}
 </p>
 </div>
 </div>
 </TableCell>
 <TableCell className="align-top">
 <div className="min-w-0 space-y-1.5 pr-4">
 <div className="flex min-w-0 gap-2 font-mono text-xs leading-snug text-slate-600">
 <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
 <span className="overflow-hidden text-ellipsis" title={op.alamatOp ?? ""}>
 {op.alamatOp || "-"}
 </span>
 </div>
 <p className="truncate font-mono text-[11px] tracking-[0.12em] text-slate-500" title={kecamatanName}>
 {kecamatanName}
 </p>
 <p className="truncate font-mono text-[11px] tracking-[0.12em] text-slate-500" title={kelurahanName}>
 {kelurahanName}
 </p>
 </div>
 </TableCell>
 <TableCell className="align-top">
 <div className="pr-3">
 <p className="font-mono text-sm font-bold leading-tight text-black whitespace-nowrap">
 {formatPajakBulanan(op.pajakBulanan)}
 </p>
 </div>
 </TableCell>
 <TableCell className="align-top">
 <div className="flex max-w-[220px] flex-wrap gap-1.5">
 <Badge
 className={`font-mono text-[10px] ${
 op.status === "active" ? "bg-primary text-black" : "bg-gray-200 text-gray-600"
 }`}
 data-testid={`badge-status-${op.id}`}
 >
 {op.status.toUpperCase()}
 </Badge>
 <Badge className={`border font-mono text-[10px] ${verificationBadgeClass(op.statusVerifikasi)}`}>
 {op.statusVerifikasi.toUpperCase()}
 </Badge>
 {hasDetail ? (
 <Badge className="border border-green-600 bg-green-100 font-mono text-[10px] text-green-800" data-testid={`badge-detail-ok-${op.id}`}>
 DETAIL OK
 </Badge>
 ) : (
 <Badge className="border border-orange-500 bg-orange-100 font-mono text-[10px] text-orange-700" data-testid={`badge-detail-pending-${op.id}`}>
 DETAIL BLM
 </Badge>
 )}
 </div>
 </TableCell>
 <TableCell className="align-top">
 <div className="flex items-center justify-end gap-1">
 <Tooltip><TooltipTrigger asChild><Button
 size="icon"
 variant="ghost"
 className="border border-black/15 bg-white/80"
 aria-label="Lihat lokasi"
 onClick={() => openLocation(op)}
 data-testid={`button-location-op-${op.id}`}
 disabled={!hasCoordinates}
 >
 <MapPin className="h-3.5 w-3.5 text-black" />
 </Button></TooltipTrigger><TooltipContent>{hasCoordinates ? "Lihat lokasi" : "Koordinat belum tersedia"}</TooltipContent></Tooltip>
 <Tooltip><TooltipTrigger asChild><Button
 size="icon"
 variant="ghost"
 className="border border-black/15 bg-white/80"
 aria-label="Lihat detail"
 onClick={() => openView(op.id)}
 data-testid={`button-view-op-${op.id}`}
 >
 <Eye className="h-3.5 w-3.5 text-black" />
 </Button></TooltipTrigger><TooltipContent>Lihat detail</TooltipContent></Tooltip>
 {canMutate && <Tooltip><TooltipTrigger asChild><Button
 size="icon"
 variant="ghost"
 className="border border-black/15 bg-white/80"
 aria-label="Edit"
 onClick={() => openEdit(op.id)}
 data-testid={`button-edit-op-${op.id}`}
 >
 <Edit className="h-3.5 w-3.5 text-black" />
 </Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 size="icon"
 variant="ghost"
 className="border border-black/15 bg-white/80"
 aria-label="Aksi lainnya"
 data-testid={`button-more-op-${op.id}`}
 >
 <MoreHorizontal className="h-3.5 w-3.5 text-black" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48 border border-black/10">
 <DropdownMenuItem onClick={() => setAuditTargetId(op.id)}>
 <History className="h-4 w-4" />
 Riwayat audit
 </DropdownMenuItem>
 {canMutate && (
 <DropdownMenuItem
 onClick={() => verificationMutation.mutate({ id: op.id, statusVerifikasi: "verified" })}
 >
 <CheckCircle2 className="h-4 w-4 text-green-700" />
 Tandai verified
 </DropdownMenuItem>
 )}
 {canMutate && (
 <DropdownMenuItem onClick={() => rejectOp(op.id)}>
 <XCircle className="h-4 w-4 text-red-700" />
 Tolak verifikasi
 </DropdownMenuItem>
 )}
 {canMutate && op.status !== "active" && (
 <><DropdownMenuSeparator /><DropdownMenuItem
 className="text-red-600 focus:text-red-700"
 onClick={() => deleteMutation.mutate(op.id)}
 data-testid={`button-delete-op-${op.id}`}
 >
 <Trash2 className="h-4 w-4 text-red-600" />
 Hapus objek
 </DropdownMenuItem></>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </div>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
 )}
 <div className={`mt-4 ${isMobile ? "space-y-3" : "flex items-center justify-between gap-3"}`}>
 <p className="font-mono text-[11px] text-gray-600">
 Menampilkan {opList.length} dari {opMeta.total} data
 </p>
 {isMobile ? (
 <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-[22px] bg-[#eef2f5] px-2.5 py-2 shadow-[inset_6px_6px_14px_rgba(148,163,184,0.12),inset_-6px_-6px_14px_rgba(255,255,255,0.95)]">
 <Button
 type="button"
 variant="ghost"
 className={`h-10 justify-start rounded-[16px] px-2 font-mono text-[11px] uppercase tracking-[0.14em] text-black/45 ${
 page > 1 ? "" : "pointer-events-none opacity-40"
 }`}
 onClick={() => {
 if (page > 1) {
 setPage((prev) => Math.max(1, prev - 1));
 }
 }}
 >
 <ChevronLeft className="mr-1.5 h-4 w-4 shrink-0" />
 <span className="truncate">Prev</span>
 </Button>
 <div className="flex h-10 min-w-[44px] items-center justify-center rounded-[16px] bg-white px-3 font-mono text-sm font-bold text-black shadow-[6px_6px_14px_rgba(148,163,184,0.18),-6px_-6px_14px_rgba(255,255,255,0.92)]">
 {page} / {opMeta.totalPages}
 </div>
 <Button
 type="button"
 variant="ghost"
 className={`h-10 justify-end rounded-[16px] px-2 font-mono text-[11px] uppercase tracking-[0.14em] text-black/45 ${
 opMeta.hasNext ? "" : "pointer-events-none opacity-40"
 }`}
 onClick={() => {
 if (page < opMeta.totalPages) {
 setPage((prev) => prev + 1);
 }
 }}
 >
 <span className="truncate">Next</span>
 <ChevronRight className="ml-1.5 h-4 w-4 shrink-0" />
 </Button>
 </div>
 ) : (
 <Pagination className="w-auto">
 <PaginationContent>
 <PaginationItem>
 <PaginationPrevious
 href="#"
 onClick={(event) => {
 event.preventDefault();
 if (page > 1) {
 setPage((prev) => Math.max(1, prev - 1));
 }
 }}
 className={`font-mono text-xs ${page > 1 ? "" : "pointer-events-none opacity-40"}`}
 />
 </PaginationItem>
 {pageItems.map((pageItem) => (
 <PaginationItem key={pageItem}>
 <PaginationLink
 href="#"
 isActive={pageItem === page}
 className="font-mono text-xs"
 onClick={(event) => {
 event.preventDefault();
 if (pageItem !== page) {
 setPage(pageItem);
 }
 }}
 >
 {pageItem}
 </PaginationLink>
 </PaginationItem>
 ))}
 <PaginationItem>
 <PaginationNext
 href="#"
 onClick={(event) => {
 event.preventDefault();
 if (page < opMeta.totalPages) {
 setPage((prev) => prev + 1);
 }
 }}
 className={`font-mono text-xs ${opMeta.hasNext ? "" : "pointer-events-none opacity-40"}`}
 />
 </PaginationItem>
 </PaginationContent>
 </Pagination>
 )}
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




