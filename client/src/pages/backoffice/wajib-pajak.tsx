import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useSearch } from "wouter";
import {
 AlertTriangle,
 ArrowRight,
 ChevronLeft,
 ChevronRight,
 Eye,
 History,
 MapPin,
 MoreHorizontal,
 Pencil,
 Phone,
 Plus,
 Search,
 Trash2,
 Users,
 X,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import BackofficeLayout from "./layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
 Pagination,
 PaginationContent,
 PaginationItem,
 PaginationLink,
 PaginationNext,
 PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { PaginatedResult, WajibPajakListItem, WajibPajakWithBadanUsaha } from "@shared/schema";
import AuditHistoryDialog from "@/components/audit-history-dialog";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { MobileWpCard } from "@/components/backoffice/mobile-wp-card";
import { useIsMobile } from "@/hooks/use-mobile";

const ownerFields = [
 ["namaWp", "NAMA WP"],
 ["nikKtpWp", "NIK KTP WP"],
 ["alamatWp", "ALAMAT WP"],
 ["kecamatanWp", "KECAMATAN WP"],
 ["kelurahanWp", "KELURAHAN WP"],
 ["teleponWaWp", "TELEPON/WA WP"],
 ["emailWp", "EMAIL WP (OPSIONAL)"],
] as const;

const managerFields = [
 ["namaPengelola", "NAMA PENGELOLA"],
 ["nikPengelola", "NIK PENGELOLA"],
 ["alamatPengelola", "ALAMAT PENGELOLA"],
 ["kecamatanPengelola", "KECAMATAN PENGELOLA"],
 ["kelurahanPengelola", "KELURAHAN PENGELOLA"],
 ["teleponWaPengelola", "TELEPON/WA PENGELOLA"],
] as const;

const badanUsahaFields = [
 ["namaBadanUsaha", "NAMA BADAN USAHA"],
 ["npwpBadanUsaha", "NPWP BADAN USAHA"],
 ["alamatBadanUsaha", "ALAMAT BADAN USAHA"],
 ["kecamatanBadanUsaha", "KECAMATAN BADAN USAHA"],
 ["kelurahanBadanUsaha", "KELURAHAN BADAN USAHA"],
 ["teleponBadanUsaha", "TELEPON BADAN USAHA"],
 ["emailBadanUsaha", "EMAIL BADAN USAHA (OPSIONAL)"],
] as const;

const wpSchema = z
 .object({
 jenisWp: z.enum(["orang_pribadi", "badan_usaha"]),
 peranWp: z.enum(["pemilik", "pengelola"]),
 npwpd: z.string().optional(),
 statusAktif: z.enum(["active", "inactive"]),
 namaWp: z.string().optional(),
 nikKtpWp: z.string().optional(),
 alamatWp: z.string().optional(),
 kecamatanWp: z.string().optional(),
 kelurahanWp: z.string().optional(),
 teleponWaWp: z.string().optional(),
 emailWp: z.string().optional(),
 namaPengelola: z.string().optional(),
 nikPengelola: z.string().optional(),
 alamatPengelola: z.string().optional(),
 kecamatanPengelola: z.string().optional(),
 kelurahanPengelola: z.string().optional(),
 teleponWaPengelola: z.string().optional(),
 namaBadanUsaha: z.string().optional(),
 npwpBadanUsaha: z.string().optional(),
 alamatBadanUsaha: z.string().optional(),
 kecamatanBadanUsaha: z.string().optional(),
 kelurahanBadanUsaha: z.string().optional(),
 teleponBadanUsaha: z.string().optional(),
 emailBadanUsaha: z.string().optional(),
 })
 .superRefine((data, ctx) => {
 const require = (keys: readonly string[]) => {
 for (const key of keys) {
 if (!(data as any)[key]?.trim()) {
 ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: "Wajib diisi" });
 }
 }
 };

 if (data.peranWp === "pemilik") require(ownerFields.map(([key]) => key).filter((k) => k !== "emailWp"));
 if (data.peranWp === "pengelola") require(managerFields.map(([key]) => key));
 if (data.jenisWp === "badan_usaha" && data.peranWp === "pemilik") require(badanUsahaFields.map(([key]) => key).filter((k) => k !== "emailBadanUsaha"));
 });

type WpFormValues = z.infer<typeof wpSchema>;
type QualityWarningDuplicate = {
 id: number;
 displayName: string;
 npwpd?: string | null;
 nikKtpWp?: string | null;
 nikPengelola?: string | null;
 npwpBadanUsaha?: string | null;
 matchedField?: "npwpd" | "nikKtpWp" | "nikPengelola" | "npwpBadanUsaha";
};

type QualityWarning = {
 level: string;
 code: string;
 message: string;
 relatedIds: Array<string | number>;
 duplicates?: QualityWarningDuplicate[];
};
const INITIAL_CURSOR = 2147483647;
const WP_ATTACHMENT_OPTIONS = [
 { value: "ktp", label: "KTP/NIK" },
 { value: "npwp", label: "NPWP" },
 { value: "surat_kuasa", label: "Surat Kuasa" },
 { value: "dokumen_lain", label: "Dokumen Lain" },
] as const;

function warningFieldLabel(code: string) {
 switch (code) {
 case "DUPLICATE_NPWPD":
 return "NPWPD";
 case "DUPLICATE_NPWP_BADAN_USAHA":
 return "NPWP Badan Usaha";
 default:
 return "NIK";
 }
}

function warningLevelClass(level: string) {
 if (level === "critical") return "border-red-600 bg-red-50 text-red-900";
 if (level === "warning") return "border-amber-500 bg-amber-50 text-amber-900";
 return "border-sky-600 bg-sky-50 text-sky-900";
}

function warningValueSummary(item: QualityWarningDuplicate) {
 switch (item.matchedField) {
 case "nikKtpWp":
 return item.nikKtpWp || "-";
 case "nikPengelola":
 return item.nikPengelola || "-";
 case "npwpBadanUsaha":
 return item.npwpBadanUsaha || "-";
 case "npwpd":
 default:
 return item.npwpd || "-";
 }
}

function duplicateRegisteredLabel(item: QualityWarningDuplicate) {
 switch (item.matchedField) {
 case "nikKtpWp":
 return "Terdaftar sebagai Pemilik";
 case "nikPengelola":
 return "Terdaftar sebagai Pengelola";
 case "npwpBadanUsaha":
 return "NPWP Badan Usaha";
 case "npwpd":
 default:
 return "NPWPD";
 }
}

function normalize(value?: string) {
 const v = (value ?? "").trim();
 return v.length > 0 ? v : null;
}

function compactJenisWpLabel(jenisWp: string) {
 return jenisWp === "badan_usaha" ? "Badan Usaha" : "Orang Pribadi";
}

function compactPeranLabel(peranWp: string) {
 return peranWp === "pengelola" ? "Pengelola" : "Pemilik";
}

function compactStatusLabel(statusAktif: string) {
 return statusAktif === "inactive" ? "Inactive" : "Active";
}

function activeAddress(wp: WajibPajakListItem) {
 return wp.peranWp === "pengelola" ? wp.alamatPengelola : wp.alamatWp;
}

function activeKecamatan(wp: WajibPajakListItem) {
 return wp.peranWp === "pengelola" ? wp.kecamatanPengelola : wp.kecamatanWp;
}

function activeKelurahan(wp: WajibPajakListItem) {
 return wp.peranWp === "pengelola" ? wp.kelurahanPengelola : wp.kelurahanWp;
}

function activeNik(wp: WajibPajakListItem) {
 return wp.peranWp === "pengelola" ? wp.nikPengelola : wp.nikKtpWp;
}

function activeContact(wp: WajibPajakListItem) {
 return wp.peranWp === "pengelola" ? wp.teleponWaPengelola : wp.teleponWaWp;
}

function defaults(wp?: WajibPajakWithBadanUsaha | null): WpFormValues {
 return {
 jenisWp: (wp?.jenisWp as "orang_pribadi" | "badan_usaha") ?? "orang_pribadi",
 peranWp: (wp?.peranWp as "pemilik" | "pengelola") ?? "pemilik",
 npwpd: wp?.npwpd ?? "",
 statusAktif: (wp?.statusAktif as "active" | "inactive") ?? "active",
 namaWp: wp?.namaWp ?? "",
 nikKtpWp: wp?.nikKtpWp ?? "",
 alamatWp: wp?.alamatWp ?? "",
 kecamatanWp: wp?.kecamatanWp ?? "",
 kelurahanWp: wp?.kelurahanWp ?? "",
 teleponWaWp: wp?.teleponWaWp ?? "",
 emailWp: wp?.emailWp ?? "",
 namaPengelola: wp?.namaPengelola ?? "",
 nikPengelola: wp?.nikPengelola ?? "",
 alamatPengelola: wp?.alamatPengelola ?? "",
 kecamatanPengelola: wp?.kecamatanPengelola ?? "",
 kelurahanPengelola: wp?.kelurahanPengelola ?? "",
 teleponWaPengelola: wp?.teleponWaPengelola ?? "",
 namaBadanUsaha: wp?.badanUsaha?.namaBadanUsaha ?? "",
 npwpBadanUsaha: wp?.badanUsaha?.npwpBadanUsaha ?? "",
 alamatBadanUsaha: wp?.badanUsaha?.alamatBadanUsaha ?? "",
 kecamatanBadanUsaha: wp?.badanUsaha?.kecamatanBadanUsaha ?? "",
 kelurahanBadanUsaha: wp?.badanUsaha?.kelurahanBadanUsaha ?? "",
 teleponBadanUsaha: wp?.badanUsaha?.teleponBadanUsaha ?? "",
 emailBadanUsaha: wp?.badanUsaha?.emailBadanUsaha ?? "",
 };
}

function toPayload(data: WpFormValues, mode: "create" | "edit") {
 const payload: Record<string, unknown> = {
 jenisWp: data.jenisWp,
 peranWp: data.peranWp,
 statusAktif: data.statusAktif,
 namaWp: normalize(data.namaWp),
 nikKtpWp: normalize(data.nikKtpWp),
 alamatWp: normalize(data.alamatWp),
 kecamatanWp: normalize(data.kecamatanWp),
 kelurahanWp: normalize(data.kelurahanWp),
 teleponWaWp: normalize(data.teleponWaWp),
 emailWp: normalize(data.emailWp),
 namaPengelola: normalize(data.namaPengelola),
 nikPengelola: normalize(data.nikPengelola),
 alamatPengelola: normalize(data.alamatPengelola),
 kecamatanPengelola: normalize(data.kecamatanPengelola),
 kelurahanPengelola: normalize(data.kelurahanPengelola),
 teleponWaPengelola: normalize(data.teleponWaPengelola),
 badanUsaha:
 data.jenisWp === "badan_usaha"
 ? {
 namaBadanUsaha: normalize(data.namaBadanUsaha),
 npwpBadanUsaha: normalize(data.npwpBadanUsaha),
 alamatBadanUsaha: normalize(data.alamatBadanUsaha),
 kecamatanBadanUsaha: normalize(data.kecamatanBadanUsaha),
 kelurahanBadanUsaha: normalize(data.kelurahanBadanUsaha),
 teleponBadanUsaha: normalize(data.teleponBadanUsaha),
 emailBadanUsaha: normalize(data.emailBadanUsaha),
 }
 : null,
 };

 if (mode === "edit") payload.npwpd = normalize(data.npwpd);
 return payload;
}

function FormFieldText({ form, name, label }: { form: UseFormReturn<WpFormValues>; name: keyof WpFormValues; label: string }) {
 return (
 <FormField
 control={form.control}
 name={name}
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">{label}</FormLabel>
 <FormControl>
 <Input {...field} value={field.value ?? ""} className="h-10 px-3 font-mono text-sm md:h-11" />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 );
}

function WpForm({ form, mode }: { form: UseFormReturn<WpFormValues>; mode: "create" | "edit" }) {
 const jenisWp = form.watch("jenisWp");
 const peranWp = form.watch("peranWp");

 return (
 <div className="space-y-3 md:space-y-4">
 <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
 <FormField
 control={form.control}
 name="jenisWp"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">JENIS WP</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl><SelectTrigger className="h-10 px-3 font-mono text-sm md:h-11"><SelectValue /></SelectTrigger></FormControl>
 <SelectContent className="border border-black"><SelectItem value="orang_pribadi">Orang Pribadi</SelectItem><SelectItem value="badan_usaha">Badan Usaha</SelectItem></SelectContent>
 </Select>
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="peranWp"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">PERAN WP</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl><SelectTrigger className="h-10 px-3 font-mono text-sm md:h-11"><SelectValue /></SelectTrigger></FormControl>
 <SelectContent className="border border-black"><SelectItem value="pemilik">Pemilik</SelectItem><SelectItem value="pengelola">Pengelola</SelectItem></SelectContent>
 </Select>
 </FormItem>
 )}
 />
 </div>
 {mode === "edit" ? <FormFieldText form={form} name="npwpd" label="NPWPD (UPDATE ONLY)" /> : <div className="border border-dashed border-border p-2 font-mono text-[11px]">NPWPD hanya dapat diisi saat update.</div>}
 <FormField
 control={form.control}
 name="statusAktif"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">STATUS</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl><SelectTrigger className="h-10 px-3 font-mono text-sm md:h-11"><SelectValue /></SelectTrigger></FormControl>
 <SelectContent className="border border-black"><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
 </Select>
 </FormItem>
 )}
 />
 {peranWp === "pemilik" && ownerFields.map(([key, label]) => <FormFieldText key={key} form={form} name={key} label={label} />)}
 {peranWp === "pengelola" && managerFields.map(([key, label]) => <FormFieldText key={key} form={form} name={key} label={label} />)}
 {jenisWp === "badan_usaha" && badanUsahaFields.map(([key, label]) => <FormFieldText key={key} form={form} name={key} label={label} />)}
 </div>
 );
}

export default function BackofficeWajibPajak() {
 const { hasRole } = useAuth();
 const isMobile = useIsMobile();
 const [, setLocation] = useLocation();
 const search = useSearch();
 const canMutate = hasRole(["admin", "editor"]);
 const [q, setQ] = useState("");
 const [page, setPage] = useState(1);
 const [limit, setLimit] = useState(25);
 const [cursorHistory, setCursorHistory] = useState<number[]>([INITIAL_CURSOR]);
 const [jenisWpFilter, setJenisWpFilter] = useState<"all" | "orang_pribadi" | "badan_usaha">("all");
 const [peranWpFilter, setPeranWpFilter] = useState<"all" | "pemilik" | "pengelola">("all");
 const [statusAktifFilter, setStatusAktifFilter] = useState<"all" | "active" | "inactive">("all");
 const [openAdd, setOpenAdd] = useState(false);
 const [edit, setEdit] = useState<WajibPajakWithBadanUsaha | null>(null);
 const [auditTarget, setAuditTarget] = useState<WajibPajakWithBadanUsaha | null>(null);
 const [qualityWarnings, setQualityWarnings] = useState<QualityWarning[]>([]);
 const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
 const { toast } = useToast();
 const debouncedQ = useDebouncedValue(q, 300);
 const activeCursor = cursorHistory[cursorHistory.length - 1] ?? INITIAL_CURSOR;

 useEffect(() => {
 setPage(1);
 setCursorHistory([INITIAL_CURSOR]);
 }, [debouncedQ, jenisWpFilter, peranWpFilter, statusAktifFilter, limit]);

 const listQueryKey = useMemo(() => {
 const params = new URLSearchParams();
 params.set("page", String(page));
 params.set("limit", String(limit));
 if (activeCursor !== INITIAL_CURSOR) {
 params.set("cursor", String(activeCursor));
 }
 if (debouncedQ) params.set("q", debouncedQ);
 if (jenisWpFilter !== "all") params.set("jenisWp", jenisWpFilter);
 if (peranWpFilter !== "all") params.set("peranWp", peranWpFilter);
 if (statusAktifFilter !== "all") params.set("statusAktif", statusAktifFilter);
 return `/api/wajib-pajak?${params.toString()}`;
 }, [activeCursor, debouncedQ, jenisWpFilter, limit, page, peranWpFilter, statusAktifFilter]);

 const invalidateWajibPajakQueries = () => {
 queryClient.invalidateQueries({
 predicate: (query) => {
 const [first] = query.queryKey;
 return typeof first === "string" && first.startsWith("/api/wajib-pajak");
 },
 });
 };

 const { data: listResult, isLoading, isFetching } = useQuery<PaginatedResult<WajibPajakListItem>>({
 queryKey: [listQueryKey],
 placeholderData: keepPreviousData,
 });
 const wpList = listResult?.items ?? [];
 const meta = listResult?.meta ?? {
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
 const addForm = useForm<WpFormValues>({ resolver: zodResolver(wpSchema), defaultValues: defaults() });
 const editForm = useForm<WpFormValues>({ resolver: zodResolver(wpSchema), defaultValues: defaults() });

 useEffect(() => {
 if (!canMutate) return;
 if (new URLSearchParams(search).get("create") !== "1") return;
 setQualityWarnings([]);
 setIsDuplicateDialogOpen(false);
 addForm.reset(defaults());
 setOpenAdd(true);
 setLocation("/backoffice/wajib-pajak", { replace: true });
 }, [addForm, canMutate, search, setLocation]);

 const runQualityCheck = async (payload: Record<string, unknown>) => {
 const badanUsaha = payload.badanUsaha && typeof payload.badanUsaha === "object"
 ? (payload.badanUsaha as Record<string, unknown>)
 : null;
 const candidate = {
 npwpd: typeof payload.npwpd === "string" ? payload.npwpd : undefined,
 excludeWpId: edit?.id,
 nikKtpWp: typeof payload.nikKtpWp === "string" ? payload.nikKtpWp : undefined,
 nikPengelola: typeof payload.nikPengelola === "string" ? payload.nikPengelola : undefined,
 npwpBadanUsaha: typeof badanUsaha?.npwpBadanUsaha === "string" ? badanUsaha.npwpBadanUsaha : undefined,
 nama:
 (typeof payload.namaWp === "string" && payload.namaWp) ||
 (typeof payload.namaPengelola === "string" && payload.namaPengelola) ||
 (typeof badanUsaha?.namaBadanUsaha === "string" && badanUsaha.namaBadanUsaha) ||
 undefined,
 alamat:
 (typeof payload.alamatWp === "string" && payload.alamatWp) ||
 (typeof payload.alamatPengelola === "string" && payload.alamatPengelola) ||
 (typeof badanUsaha?.alamatBadanUsaha === "string" && badanUsaha.alamatBadanUsaha) ||
 undefined,
 };
 const res = await apiRequest("POST", "/api/quality/check", candidate);
 const body = (await res.json()) as { warnings?: QualityWarning[] };
 const warnings = body.warnings ?? [];
 setQualityWarnings(warnings);
 return warnings;
 };

 const createMutation = useMutation({
 mutationFn: async (payload: Record<string, unknown>) => (await apiRequest("POST", "/api/wajib-pajak", payload)).json(),
 onSuccess: () => { invalidateWajibPajakQueries(); setOpenAdd(false); addForm.reset(defaults()); setQualityWarnings([]); setIsDuplicateDialogOpen(false); toast({ title: "Berhasil", description: "Wajib Pajak berhasil ditambahkan" }); },
 onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
 });

 const updateMutation = useMutation({
 mutationFn: async (p: { id: number; payload: Record<string, unknown> }) => (await apiRequest("PATCH", `/api/wajib-pajak/${p.id}`, p.payload)).json(),
 onSuccess: () => { invalidateWajibPajakQueries(); setEdit(null); setQualityWarnings([]); setIsDuplicateDialogOpen(false); toast({ title: "Berhasil", description: "Wajib Pajak berhasil diperbarui" }); },
 onError: (err: Error) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
 });

 const deleteMutation = useMutation({
 mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/wajib-pajak/${id}`); },
 onSuccess: () => { invalidateWajibPajakQueries(); toast({ title: "Berhasil", description: "Wajib Pajak berhasil dihapus" }); },
 });

 const openEdit = (wp: WajibPajakWithBadanUsaha) => {
 if (!canMutate) return;
 setQualityWarnings([]);
 setIsDuplicateDialogOpen(false);
 setEdit(wp);
 editForm.reset(defaults(wp));
 };

 const openDuplicateRecord = async (id: number) => {
 try {
 const response = await apiRequest("GET", `/api/wajib-pajak/detail/${id}`);
 const wp = (await response.json()) as WajibPajakWithBadanUsaha;
 setOpenAdd(false);
 setQualityWarnings([]);
 setIsDuplicateDialogOpen(false);
 setEdit(wp);
 editForm.reset(defaults(wp));
 } catch (err) {
 toast({ title: "Gagal", description: "Data duplikasi tidak bisa dibuka saat ini. Silakan coba lagi.", variant: "destructive" });
 }
 };

 const submitCreate = async (data: WpFormValues) => {
 if (!canMutate) return;

 const payload = toPayload(data, "create");
 const warnings = await runQualityCheck(payload);
 if (warnings.length > 0) {
 setIsDuplicateDialogOpen(true);
 return;
 }
 createMutation.mutate(payload);
 };

 const submitEdit = async (data: WpFormValues) => {
 if (!canMutate) return;

 if (!edit) return;
 const payload = toPayload(data, "edit");
 const warnings = await runQualityCheck(payload);
 if (warnings.length > 0) {
 setIsDuplicateDialogOpen(true);
 return;
 }
 updateMutation.mutate({ id: edit.id, payload });
 };

 return (
 <BackofficeLayout>
 <div className="p-3 md:p-6" data-testid="backoffice-wp-page">
 <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center shadow-card bg-primary">
 <Users className="h-5 w-5 text-white" />
 </div>
 <div>
 <h1 className="font-sans text-xl font-black md:text-2xl">WAJIB PAJAK</h1>
 <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Model Baru</p>
 </div>
 </div>
 <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
 {canMutate && !isMobile && <Tooltip><TooltipTrigger asChild><Button className="shadow-card bg-primary font-mono font-bold text-black sm:w-auto" aria-label="Tambah WP" onClick={() => { setQualityWarnings([]); setIsDuplicateDialogOpen(false); addForm.reset(defaults()); setOpenAdd(true); }}><Plus className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">TAMBAH WP</span></Button></TooltipTrigger><TooltipContent>Tambah WP</TooltipContent></Tooltip>}
 </div>
 </div>
 <div className="mb-3 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
 <div className="relative w-full md:max-w-md md:flex-1">
 <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
 <Input
 value={q}
 onChange={(e) => setQ(e.target.value)}
 placeholder="Cari nama / NPWPD"
 className="pl-9 shadow-card font-mono text-sm"
 />
 </div>
 {!isMobile && <Select value={jenisWpFilter} onValueChange={(value) => setJenisWpFilter(value as typeof jenisWpFilter)}>
 <SelectTrigger className="w-full shadow-card font-mono text-xs md:w-[170px]">
 <SelectValue placeholder="Jenis WP" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 <SelectItem value="all">Semua Jenis</SelectItem>
 <SelectItem value="orang_pribadi">Orang Pribadi</SelectItem>
 <SelectItem value="badan_usaha">Badan Usaha</SelectItem>
 </SelectContent>
 </Select>}
 {!isMobile && <Select value={peranWpFilter} onValueChange={(value) => setPeranWpFilter(value as typeof peranWpFilter)}>
 <SelectTrigger className="w-full shadow-card font-mono text-xs md:w-[170px]">
 <SelectValue placeholder="Peran WP" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 <SelectItem value="all">Semua Peran</SelectItem>
 <SelectItem value="pemilik">Pemilik</SelectItem>
 <SelectItem value="pengelola">Pengelola</SelectItem>
 </SelectContent>
 </Select>}
 {!isMobile && <Select value={statusAktifFilter} onValueChange={(value) => setStatusAktifFilter(value as typeof statusAktifFilter)}>
 <SelectTrigger className="w-full shadow-card font-mono text-xs md:w-[150px]">
 <SelectValue placeholder="Status" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 <SelectItem value="all">Semua Status</SelectItem>
 <SelectItem value="active">Active</SelectItem>
 <SelectItem value="inactive">Inactive</SelectItem>
 </SelectContent>
 </Select>}
 <Badge className="w-fit bg-primary font-mono text-xs text-white">{meta.total} WP</Badge>
 </div>
 <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
 <p className="font-mono text-[11px] text-gray-600">
 Halaman {page} dari {meta.totalPages}
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
 {isLoading ? <div className="flex h-40 items-center justify-center font-mono">Memuat...</div> : isMobile ? (
 <div className="space-y-3">
 {wpList.map((wp) => (
 <MobileWpCard
 key={wp.id}
 wp={wp}
 canMutate={canMutate}
 onEdit={openEdit}
 onView={(selectedWp) => setLocation(`/backoffice/wajib-pajak/${selectedWp.id}`)}
 onDelete={(id) => deleteMutation.mutate(id)}
 />
 ))}
 </div>
 ) : (
 <div className="overflow-hidden shadow-card">
 <Table className="table-fixed">
 <TableHeader>
 <TableRow className="bg-[#2d3436] border-b-[2px] border-primary/30">
 <TableHead className="w-[40%] text-white font-mono text-[10px] whitespace-nowrap">IDENTITAS WP</TableHead>
 <TableHead className="w-[32%] text-white font-mono text-[10px] whitespace-nowrap">ALAMAT</TableHead>
 <TableHead className="w-[16%] text-white font-mono text-[10px] whitespace-nowrap">STATUS</TableHead>
 <TableHead className="w-[12%] text-right text-white font-mono text-[10px] whitespace-nowrap">AKSI</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {wpList.map((wp) => {
 const address = activeAddress(wp);
 const kecamatan = activeKecamatan(wp);
 const kelurahan = activeKelurahan(wp);
 const nik = activeNik(wp);
 const contact = activeContact(wp);

 return (
 <TableRow key={wp.id} className="animate-in border-b border-border transition-all duration-150 hover:bg-accent/50 fade-in">
 <TableCell className="align-top">
       <div className="min-w-0 space-y-1.5 pr-3">
       <div className="min-w-0 space-y-1">
       <p className="truncate font-sans text-[15px] font-black leading-tight text-black">{wp.displayName}</p>
       <p className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-black/55">
       NPWPD {wp.npwpd || "-"}
       </p>
       <p className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-black/55">
       NIK {nik || "-"}
       </p>
       </div>
       <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-black/55">
       <Phone className="h-3.5 w-3.5 shrink-0 text-black/45" />
       <span className="truncate">{contact || "-"}</span>
       </div>
       </div>
       </TableCell>
 <TableCell className="align-top">
       <div className="space-y-1.5 pr-3">
       <div className="flex min-w-0 gap-2 font-mono text-xs leading-snug text-slate-600">
       <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
       <span className="overflow-hidden text-ellipsis" title={address ?? ""}>
       {address || "-"}
       </span>
       </div>
       <p className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
       Kecamatan {kecamatan || "-"}
       </p>
       <p className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">
       Kelurahan {kelurahan || "-"}
       </p>
       </div>
       </TableCell>
 <TableCell className="align-top">
 <div className="flex max-w-[220px] flex-wrap gap-1.5">
 <Badge className="font-mono text-[10px] bg-slate-800 text-white">
 {compactJenisWpLabel(wp.jenisWp)}
 </Badge>
 <Badge className="font-mono text-[10px] border border-black/15 bg-white text-slate-700">
 {compactPeranLabel(wp.peranWp)}
 </Badge>
 <Badge
 className={`font-mono text-[10px] ${
 wp.statusAktif === "active"
 ? "bg-primary text-black"
 : "border border-slate-300 bg-slate-200 text-slate-600"
 }`}
 >
 {compactStatusLabel(wp.statusAktif)}
 </Badge>
 </div>
 </TableCell>
 <TableCell className="align-top">
 <div className="flex items-center justify-end gap-1">
 <Tooltip><TooltipTrigger asChild><Button
 size="icon"
 variant="ghost"
 className="border border-black/15 bg-white/80"
 aria-label="Lihat detail"
 onClick={() => setLocation(`/backoffice/wajib-pajak/${wp.id}`)}
 >
 <Eye className="h-4 w-4 text-black" />
 </Button></TooltipTrigger><TooltipContent>Lihat detail</TooltipContent></Tooltip>
 {canMutate && <Tooltip><TooltipTrigger asChild><Button
 size="icon"
 variant="ghost"
 className="border border-black/15 bg-white/80"
 aria-label="Edit"
 onClick={() => openEdit(wp)}
 >
 <Pencil className="h-4 w-4 text-black" />
 </Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>}
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 size="icon"
 variant="ghost"
 className="border border-black/15 bg-white/80"
 aria-label="Aksi lainnya"
 >
 <MoreHorizontal className="h-4 w-4 text-black" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-44 border border-black/10">
 <DropdownMenuItem onClick={() => setAuditTarget(wp)}>
 <History className="h-4 w-4" />
 Riwayat audit
 </DropdownMenuItem>
 {canMutate && wp.statusAktif !== "active" && (
 <>
 <DropdownMenuSeparator />
 <DropdownMenuItem
 className="text-red-600 focus:text-red-700"
 onClick={() => deleteMutation.mutate(wp.id)}
 >
 <Trash2 className="h-4 w-4 text-red-600" />
 Hapus WP
 </DropdownMenuItem>
 </>
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
 Menampilkan {wpList.length} dari {meta.total} data
 </p>
 {isMobile ? (
 <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-[22px] bg-[#eef2f5] px-2.5 py-2 shadow-[inset_6px_6px_14px_rgba(148,163,184,0.12),inset_-6px_-6px_14px_rgba(255,255,255,0.95)]">
 <Button
 type="button"
 variant="ghost"
 className={`h-10 justify-start rounded-[16px] px-2 font-mono text-[11px] uppercase tracking-[0.14em] text-black/45 ${
 cursorHistory.length > 1 ? "" : "pointer-events-none opacity-40"
 }`}
 onClick={() => {
 if (cursorHistory.length > 1) {
 setCursorHistory((prev) => prev.slice(0, -1));
 setPage((prev) => Math.max(1, prev - 1));
 }
 }}
 >
 <ChevronLeft className="mr-1.5 h-4 w-4 shrink-0" />
 <span className="truncate">Prev</span>
 </Button>
 <div className="flex h-10 min-w-[44px] items-center justify-center rounded-[16px] bg-white px-3 font-mono text-sm font-bold text-black shadow-[6px_6px_14px_rgba(148,163,184,0.18),-6px_-6px_14px_rgba(255,255,255,0.92)]">
 {page}
 </div>
 <Button
 type="button"
 variant="ghost"
 className={`h-10 justify-end rounded-[16px] px-2 font-mono text-[11px] uppercase tracking-[0.14em] text-black/45 ${
 meta.nextCursor ? "" : "pointer-events-none opacity-40"
 }`}
 onClick={() => {
 const nextCursor = meta.nextCursor;
 if (typeof nextCursor === "number") {
 setCursorHistory((prev) => [...prev, nextCursor]);
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
 if (cursorHistory.length > 1) {
 setCursorHistory((prev) => prev.slice(0, -1));
 setPage((prev) => Math.max(1, prev - 1));
 }
 }}
 className={`font-mono text-xs ${cursorHistory.length > 1 ? "" : "pointer-events-none opacity-40"}`}
 />
 </PaginationItem>
 <PaginationItem>
 <PaginationLink href="#" isActive className="font-mono text-xs">
 {page}
 </PaginationLink>
 </PaginationItem>
 <PaginationItem>
 <PaginationNext
 href="#"
 onClick={(event) => {
 event.preventDefault();
 const nextCursor = meta.nextCursor;
 if (typeof nextCursor === "number") {
 setCursorHistory((prev) => [...prev, nextCursor]);
 setPage((prev) => prev + 1);
 }
 }}
 className={`font-mono text-xs ${meta.nextCursor ? "" : "pointer-events-none opacity-40"}`}
 />
 </PaginationItem>
 </PaginationContent>
 </Pagination>
 )}
 </div>
 </div>

 {canMutate && <Dialog open={openAdd} onOpenChange={(open) => { setOpenAdd(open); if (!open) { setQualityWarnings([]); setIsDuplicateDialogOpen(false); } }}>
 <DialogContent className="shadow-floating w-[calc(100vw-12px)] sm:max-w-2xl overflow-x-hidden bg-white p-0 max-h-[90vh] overflow-y-auto">
 <DialogHeader className="border-b border-border bg-primary p-3 md:p-4"><DialogTitle className="font-sans text-xl font-black text-white">TAMBAH WAJIB PAJAK</DialogTitle><DialogDescription className="sr-only">Form tambah wajib pajak untuk mengisi identitas, peran, dan data badan usaha bila diperlukan.</DialogDescription></DialogHeader>
 <Form {...addForm}>
 <form onSubmit={addForm.handleSubmit(submitCreate)} className="space-y-3 overflow-x-hidden p-3 md:space-y-4 md:p-4 [&_button[role=combobox]]:h-10 [&_button[role=combobox]]:px-3 md:[&_button[role=combobox]]:h-11">
 <WpForm form={addForm} mode="create" />
 <div className="border border-dashed border-border bg-background p-2 font-mono text-[11px] text-gray-700 md:p-3">
 Attachment dokumen aktif setelah data Wajib Pajak berhasil dibuat.
 </div>
 <Button type="submit" className="w-full shadow-card bg-primary text-white font-mono font-bold">
 {createMutation.isPending ? "MENYIMPAN..." : "SIMPAN"}
 </Button>
 </form>
 </Form>
 </DialogContent>
 </Dialog>}

 {canMutate && <Dialog open={!!edit} onOpenChange={(open) => { if (!open) { setEdit(null); setQualityWarnings([]); setIsDuplicateDialogOpen(false); } }}>
 <DialogContent className="shadow-floating w-[calc(100vw-12px)] sm:max-w-2xl overflow-x-hidden bg-white p-0 max-h-[90vh] overflow-y-auto">
 <DialogHeader className="border-b border-border bg-blue-600 p-3 md:p-4"><DialogTitle className="font-sans text-xl font-black text-white">EDIT WAJIB PAJAK</DialogTitle><DialogDescription className="sr-only">Form edit wajib pajak untuk memperbarui identitas, status aktif, dan lampiran dokumen.</DialogDescription></DialogHeader>
 <Form {...editForm}>
 <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-3 overflow-x-hidden p-3 md:space-y-4 md:p-4 [&_button[role=combobox]]:h-10 [&_button[role=combobox]]:px-3 md:[&_button[role=combobox]]:h-11">
 <WpForm form={editForm} mode="edit" />
 {edit ? (
 <AttachmentPanel
 entityType="wajib_pajak"
 entityId={edit.id}
 title="Lampiran Wajib Pajak"
 documentTypeOptions={[...WP_ATTACHMENT_OPTIONS]}
 />
 ) : null}
 <Button type="submit" className="w-full shadow-card bg-blue-600 text-white font-mono font-bold">
 {updateMutation.isPending ? "MEMPERBARUI..." : "PERBARUI"}
 </Button>
 </form>
 </Form>
 </DialogContent>
 </Dialog>}
 <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
 <DialogContent className="max-w-3xl overflow-hidden shadow-floating bg-background p-0 shadow-card duration-200 animate-in fade-in-0 zoom-in-95 [&>button]:hidden">
 <div className="border-b border-border bg-[linear-gradient(135deg,#fff2cf_0%,#ffe08a_100%)] px-6 py-5">
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-start gap-4">
 <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center shadow-card bg-primary text-white">
 <AlertTriangle className="h-6 w-6" />
 </div>
 <DialogHeader className="space-y-2 text-left">
 <DialogTitle className="font-sans text-2xl font-black uppercase tracking-[0.08em] text-black">Duplikasi Data Terdeteksi</DialogTitle>
 <DialogDescription className="sr-only">
 Ringkasan data wajib pajak yang bentrok atau terdeteksi duplikasi agar pengguna dapat meninjau data existing.
 </DialogDescription>
 <p className="max-w-2xl font-mono text-[12px] leading-6 text-black/75">
 Periksa data yang bentrok di bawah ini sebelum melanjutkan perubahan.
 </p>
 </DialogHeader>
 </div>
 <Button
 type="button"
 variant="ghost"
 className="h-10 w-10 bg-white p-0 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#2d3436] hover:text-white"
 onClick={() => setIsDuplicateDialogOpen(false)}
 >
 <X className="h-4 w-4" />
 </Button>
 </div>
 </div>

 <div className="max-h-[65vh] space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(255,107,0,0.07),_transparent_42%),linear-gradient(180deg,#fffdf8_0%,#fff8e8_100%)] px-6 py-6">
 {qualityWarnings.map((warning, warningIndex) => (
 <div
 key={`${warning.code}-${warningIndex}`}
 className={`border p-4 shadow-card transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-2 ${warningLevelClass(warning.level)}`}
 style={{ animationDelay: `${warningIndex * 60}ms` }}
 >
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div className="space-y-2">
 <p className="font-sans text-lg font-black uppercase tracking-[0.08em]">{warningFieldLabel(warning.code)}</p>
 <p className="max-w-2xl font-mono text-[12px] leading-6">{warning.message}</p>
 </div>
 <Badge className="border border-current bg-white/80 font-mono text-[10px] uppercase tracking-[0.18em] text-inherit">
 {warning.level === "critical" ? "Duplikat" : "Terdeteksi"}
 </Badge>
 </div>

 <div className="mt-4 space-y-3">
 {(warning.duplicates ?? []).map((item) => (
 <div key={`${warning.code}-${item.id}`} className="border border-black/80 bg-white/90 px-4 py-3 shadow-card">
 <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
 <div className="space-y-1">
 <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">{duplicateRegisteredLabel(item)}</p>
 <p className="font-sans text-lg font-black text-black">{item.displayName}</p>
 <p className="font-mono text-[12px] text-black/70">{warningValueSummary(item)}</p>
 </div>
 <Button
 type="button"
 className="shadow-card bg-white font-mono text-xs font-bold text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#2d3436] hover:text-white"
 onClick={() => openDuplicateRecord(item.id)}
 >
 Lihat Data Duplikasi
 <ArrowRight className="ml-2 h-4 w-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>

 <div className="border-t-[3px] border-black bg-white px-6 py-4">
 <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
 <Button
 type="button"
 variant="outline"
 className="shadow-card bg-white font-mono text-xs font-bold text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#2d3436] hover:text-white"
 onClick={() => setIsDuplicateDialogOpen(false)}
 >
 Perbaiki
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>

 <AuditHistoryDialog
 open={!!auditTarget}
 onOpenChange={(open) => !open && setAuditTarget(null)}
 entityType="wajib_pajak"
 entityId={auditTarget?.id ?? null}
 title="Riwayat Perubahan Wajib Pajak"
 /> </BackofficeLayout>
 );
}









