import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, ArrowRight, Download, History, Pencil, Plus, Search, Trash2, Upload, Users, X } from "lucide-react";
import BackofficeLayout from "./layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
            <Input {...field} value={field.value ?? ""} className="rounded-none border-[2px] border-black font-mono text-sm" />
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="jenisWp"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono text-xs font-bold text-black">JENIS WP</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent className="rounded-none border-[2px] border-black"><SelectItem value="orang_pribadi">Orang Pribadi</SelectItem><SelectItem value="badan_usaha">Badan Usaha</SelectItem></SelectContent>
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
                <FormControl><SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent className="rounded-none border-[2px] border-black"><SelectItem value="pemilik">Pemilik</SelectItem><SelectItem value="pengelola">Pengelola</SelectItem></SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>
      {mode === "edit" ? <FormFieldText form={form} name="npwpd" label="NPWPD (UPDATE ONLY)" /> : <div className="border-[2px] border-dashed border-black p-2 font-mono text-[11px]">NPWPD hanya dapat diisi saat update.</div>}
      <FormField
        control={form.control}
        name="statusAktif"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-mono text-xs font-bold text-black">STATUS</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm"><SelectValue /></SelectTrigger></FormControl>
              <SelectContent className="rounded-none border-[2px] border-black"><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
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
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canMutate) return;

    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/wajib-pajak/import", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) toast({ title: "Gagal", description: result.message, variant: "destructive" });
      else { toast({ title: "Import Selesai", description: `${result.success} berhasil, ${result.failed} gagal dari ${result.total} data` }); invalidateWajibPajakQueries(); }
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <BackofficeLayout>
      <div className="p-6" data-testid="backoffice-wp-page">
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3"><div className="bg-[#FF6B00] w-10 h-10 border-[3px] border-black flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div><div><h1 className="font-serif text-2xl font-black">WAJIB PAJAK</h1><p className="font-mono text-[10px] tracking-widest uppercase text-gray-500">Model Baru</p></div></div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="rounded-none border-[3px] border-black bg-white font-mono text-xs font-bold" onClick={() => window.open("/api/wajib-pajak/export", "_blank")}><Download className="w-4 h-4 mr-1" />EXPORT CSV</Button>
            {canMutate && <Button variant="outline" className="rounded-none border-[3px] border-black bg-white font-mono text-xs font-bold" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-1" />IMPORT CSV</Button>}
            {canMutate && <Button className="rounded-none border-[3px] border-black bg-[#FFFF00] text-black font-mono font-bold" onClick={() => { setQualityWarnings([]); setIsDuplicateDialogOpen(false); addForm.reset(defaults()); setOpenAdd(true); }}><Plus className="w-4 h-4 mr-2" />TAMBAH WP</Button>}
          </div>
        </div>
        <div className="mb-3 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama / NPWPD"
              className="pl-9 rounded-none border-[3px] border-black font-mono text-sm"
            />
          </div>
          <Select value={jenisWpFilter} onValueChange={(value) => setJenisWpFilter(value as typeof jenisWpFilter)}>
            <SelectTrigger className="w-[170px] rounded-none border-[3px] border-black font-mono text-xs">
              <SelectValue placeholder="Jenis WP" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="all">Semua Jenis</SelectItem>
              <SelectItem value="orang_pribadi">Orang Pribadi</SelectItem>
              <SelectItem value="badan_usaha">Badan Usaha</SelectItem>
            </SelectContent>
          </Select>
          <Select value={peranWpFilter} onValueChange={(value) => setPeranWpFilter(value as typeof peranWpFilter)}>
            <SelectTrigger className="w-[170px] rounded-none border-[3px] border-black font-mono text-xs">
              <SelectValue placeholder="Peran WP" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="all">Semua Peran</SelectItem>
              <SelectItem value="pemilik">Pemilik</SelectItem>
              <SelectItem value="pengelola">Pengelola</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusAktifFilter} onValueChange={(value) => setStatusAktifFilter(value as typeof statusAktifFilter)}>
            <SelectTrigger className="w-[150px] rounded-none border-[3px] border-black font-mono text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[2px] border-black">
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Badge className="rounded-none border-[2px] border-black bg-[#FF6B00] text-white font-mono text-xs">{meta.total} WP</Badge>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[11px] text-gray-600">
            Halaman {page} dari {meta.totalPages}
            {isFetching ? " - memperbarui..." : ""}
          </p>
          <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
            <SelectTrigger className="w-[130px] rounded-none border-[2px] border-black font-mono text-xs">
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

        {isLoading ? <div className="h-40 flex items-center justify-center font-mono">Memuat...</div> : (
          <div className="border-[3px] border-black overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="bg-black"><TableHead className="text-[#FFFF00] font-mono text-xs">NPWPD</TableHead><TableHead className="text-[#FFFF00] font-mono text-xs">DISPLAY NAME</TableHead><TableHead className="text-[#FFFF00] font-mono text-xs">JENIS</TableHead><TableHead className="text-[#FFFF00] font-mono text-xs">PERAN</TableHead><TableHead className="text-[#FFFF00] font-mono text-xs">STATUS</TableHead><TableHead className="text-[#FFFF00] font-mono text-xs text-right">AKSI</TableHead></TableRow></TableHeader>
              <TableBody>
                {wpList.map((wp) => (
                  <TableRow key={wp.id} className="border-b-[2px] border-black transition-all duration-150 hover:bg-[#FFF5EB] animate-in fade-in">
                    <TableCell className="font-mono text-xs">{wp.npwpd || "-"}</TableCell>
                    <TableCell className="font-mono text-sm font-bold">{wp.displayName}</TableCell>
                    <TableCell className="font-mono text-xs">{wp.jenisWp}</TableCell>
                    <TableCell className="font-mono text-xs">{wp.peranWp}</TableCell>
                    <TableCell className="font-mono text-xs">{wp.statusAktif}</TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-1">{canMutate && <Button size="icon" variant="ghost" className="rounded-none" onClick={() => openEdit(wp)}><Pencil className="w-4 h-4" /></Button>}<Button size="icon" variant="ghost" className="rounded-none" onClick={() => setAuditTarget(wp)}><History className="w-4 h-4" /></Button>{canMutate && <Button size="icon" variant="ghost" className="rounded-none text-red-600" onClick={() => deleteMutation.mutate(wp.id)}><Trash2 className="w-4 h-4" /></Button>}</div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-gray-600">
            Menampilkan {wpList.length} dari {meta.total} data
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
                    const nextCursor = meta.nextCursor;
                    if (typeof nextCursor === "number") {
                      setCursorHistory((prev) => [...prev, nextCursor]);
                      setPage((prev) => prev + 1);
                    }
                  }}
                  className={`rounded-none border-[2px] border-black font-mono text-xs ${meta.nextCursor ? "" : "pointer-events-none opacity-40"}`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {canMutate && <Dialog open={openAdd} onOpenChange={(open) => { setOpenAdd(open); if (!open) { setQualityWarnings([]); setIsDuplicateDialogOpen(false); } }}>
        <DialogContent className="rounded-none border-[4px] border-black max-w-2xl bg-white p-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-4 border-b-[3px] border-black bg-[#FF6B00]"><DialogTitle className="font-serif text-xl font-black text-white">TAMBAH WAJIB PAJAK</DialogTitle></DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(submitCreate)} className="p-4 space-y-4">
              <WpForm form={addForm} mode="create" />
              <Button type="submit" className="w-full rounded-none border-[3px] border-black bg-[#FF6B00] text-white font-mono font-bold">
                {createMutation.isPending ? "MENYIMPAN..." : "SIMPAN"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>}

      {canMutate && <Dialog open={!!edit} onOpenChange={(open) => { if (!open) { setEdit(null); setQualityWarnings([]); setIsDuplicateDialogOpen(false); } }}>
        <DialogContent className="rounded-none border-[4px] border-black max-w-2xl bg-white p-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-4 border-b-[3px] border-black bg-blue-600"><DialogTitle className="font-serif text-xl font-black text-white">EDIT WAJIB PAJAK</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="p-4 space-y-4">
              <WpForm form={editForm} mode="edit" />
              <Button type="submit" className="w-full rounded-none border-[3px] border-black bg-blue-600 text-white font-mono font-bold">
                {updateMutation.isPending ? "MEMPERBARUI..." : "PERBARUI"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="max-w-3xl overflow-hidden rounded-none border-[4px] border-black bg-[#fffaf2] p-0 shadow-[14px_14px_0_0_rgba(0,0,0,0.12)] duration-200 animate-in fade-in-0 zoom-in-95 [&>button]:hidden">
          <div className="border-b-[3px] border-black bg-[linear-gradient(135deg,#fff2cf_0%,#ffe08a_100%)] px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-black bg-[#ff6b00] text-white shadow-[4px_4px_0_0_rgba(0,0,0,0.18)]">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="font-serif text-2xl font-black uppercase tracking-[0.08em] text-black">Duplikasi Data Terdeteksi</DialogTitle>
                  <p className="max-w-2xl font-mono text-[12px] leading-6 text-black/75">
                    Periksa data yang bentrok di bawah ini sebelum melanjutkan perubahan.
                  </p>
                </DialogHeader>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-10 rounded-none border-[2px] border-black bg-white p-0 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-black hover:text-white"
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
                className={`rounded-none border-[3px] p-4 shadow-[8px_8px_0_0_rgba(0,0,0,0.08)] transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-2 ${warningLevelClass(warning.level)}`}
                style={{ animationDelay: `${warningIndex * 60}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="font-serif text-lg font-black uppercase tracking-[0.08em]">{warningFieldLabel(warning.code)}</p>
                    <p className="max-w-2xl font-mono text-[12px] leading-6">{warning.message}</p>
                  </div>
                  <Badge className="rounded-none border-[2px] border-current bg-white/80 font-mono text-[10px] uppercase tracking-[0.18em] text-inherit">
                    {warning.level === "critical" ? "Duplikat" : "Terdeteksi"}
                  </Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {(warning.duplicates ?? []).map((item) => (
                    <div key={`${warning.code}-${item.id}`} className="border-[2px] border-black/80 bg-white/90 px-4 py-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">{duplicateRegisteredLabel(item)}</p>
                          <p className="font-serif text-lg font-black text-black">{item.displayName}</p>
                          <p className="font-mono text-[12px] text-black/70">{warningValueSummary(item)}</p>
                        </div>
                        <Button
                          type="button"
                          className="rounded-none border-[3px] border-black bg-white font-mono text-xs font-bold text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-black hover:text-white"
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
                className="rounded-none border-[3px] border-black bg-white font-mono text-xs font-bold text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-black hover:text-white"
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
      />    </BackofficeLayout>
  );
}









