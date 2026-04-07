import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, Crosshair, MapPin, Upload, X } from "lucide-react";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import {
 Form,
 FormControl,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ApiError, type ApiFieldError, apiRequest } from "@/lib/queryClient";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
import { useIsMobile } from "@/hooks/use-mobile";
import type {
 MasterKecamatan,
 MasterKelurahan,
 MasterRekeningPajak,
 ObjekPajak,
 WajibPajakListItem,
} from "@shared/schema";
import { DetailFieldsByJenis } from "./objek-pajak-detail-fields";
import { MapPickerEmbed } from "./objek-pajak-map-picker";
import {
 applyApiFieldErrors,
 formatMoneyInput,
 getDetailRecord,
 invalidateObjekPajakQueries,
 normalizeMoneyDigits,
 normalizeOpPayload,
 type NormalizedOpPayload,
 normalizeOptional,
 opFormSchema,
 OPFormValues,
 QualityWarning,
} from "./objek-pajak-shared";

const OP_ATTACHMENT_OPTIONS = [
 { value: "foto_usaha", label: "Foto Usaha" },
 { value: "foto_lokasi", label: "Foto Lokasi" },
 { value: "izin_usaha", label: "Izin Usaha" },
 { value: "dokumen_lain", label: "Dokumen Lain" },
] as const;

type DraftAttachment = {
 id: string;
 documentType: string;
 file: File;
 notes: string;
};

const CREATE_WIZARD_STEPS = [
 { id: "rekening", label: "Jenis Pajak" },
 { id: "detail", label: "Detail" },
 { id: "data", label: "Data OP" },
 { id: "lokasi", label: "Lokasi" },
 { id: "lampiran", label: "Lampiran" },
 { id: "review", label: "Review" },
] as const;

type CreateWizardStep = (typeof CREATE_WIZARD_STEPS)[number]["id"];
export function OPFormDialog({
 mode,
 editOp,
 wpList,
 rekeningList,
 kecamatanList,
 kelurahanList,
 isOpen,
 onOpenChange,
 onSaved,
}: {
 mode: "create" | "edit";
 editOp?: ObjekPajak | null;
 wpList: WajibPajakListItem[];
 rekeningList: MasterRekeningPajak[];
 kecamatanList: MasterKecamatan[];
 kelurahanList: MasterKelurahan[];
 isOpen: boolean;
 onOpenChange: (open: boolean) => void;
 onSaved?: () => void;
}) {
 const { toast } = useToast();
 const isMobile = useIsMobile();
 const isCreateWizard = mode === "create" && isMobile;
 const useJenisPajakSelector = isMobile;
 const draftFileInputRef = useRef<HTMLInputElement>(null);
 const [showMapPicker, setShowMapPicker] = useState(false);
 const [mapPickerFeedback, setMapPickerFeedback] = useState<string | null>(null);
 const [qualityWarnings, setQualityWarnings] = useState<QualityWarning[]>([]);
 const [submitFieldErrors, setSubmitFieldErrors] = useState<ApiFieldError[]>([]);
 const [wizardStep, setWizardStep] = useState<CreateWizardStep>("rekening");
 const [selectedJenisPajak, setSelectedJenisPajak] = useState("");
const [draftAttachments, setDraftAttachments] = useState<DraftAttachment[]>([]);
const [draftDocumentType, setDraftDocumentType] = useState<string>(OP_ATTACHMENT_OPTIONS[0]?.value ?? "");
const [draftNotes, setDraftNotes] = useState("");
const [draftFile, setDraftFile] = useState<File | null>(null);
 const [wpPickerOpen, setWpPickerOpen] = useState(false);
 const [wpSearch, setWpSearch] = useState("");

 const form = useForm<OPFormValues>({
 resolver: zodResolver(opFormSchema),
 defaultValues: {
 nopd: "",
 wpId: undefined,
 rekPajakId: undefined,
 namaOp: "",
 alamatOp: "",
 kecamatanId: "",
 kelurahanId: "",
 omsetBulanan: "",
 tarifPersen: "",
 pajakBulanan: "",
 detailPajak: null,
 latitude: "",
 longitude: "",
 status: "active",
 },
 });

 useEffect(() => {
 setQualityWarnings([]);
 setSubmitFieldErrors([]);
 setWizardStep("rekening");
 setDraftAttachments([]);
 setDraftDocumentType(OP_ATTACHMENT_OPTIONS[0]?.value ?? "");
 setDraftNotes("");
 setDraftFile(null);
 setShowMapPicker(false);
 setMapPickerFeedback(null);
 if (mode === "edit" && editOp) {
 setSelectedJenisPajak(editOp.jenisPajak);
 form.reset({
 nopd: editOp.nopd,
 wpId: editOp.wpId,
 rekPajakId: editOp.rekPajakId,
 namaOp: editOp.namaOp,
 alamatOp: editOp.alamatOp,
 kecamatanId: editOp.kecamatanId,
 kelurahanId: editOp.kelurahanId,
 omsetBulanan: editOp.omsetBulanan || "",
 tarifPersen: editOp.tarifPersen || "",
 pajakBulanan: editOp.pajakBulanan || "",
 detailPajak: editOp.detailPajak || null,
 latitude: editOp.latitude || "",
 longitude: editOp.longitude || "",
 status: editOp.status,
 });
 } else if (mode === "create") {
 setSelectedJenisPajak("");
 form.reset();
 }
 }, [mode, editOp, form]);

const createMutation = useMutation({
 mutationFn: async ({ payload, attachments }: { payload: NormalizedOpPayload; attachments: DraftAttachment[] }) => {
 const res = await apiRequest("POST", "/api/objek-pajak", payload);
 const created = await res.json();
 const failedUploads: string[] = [];

 for (const item of attachments) {
 try {
 const formData = new FormData();
 formData.set("documentType", item.documentType);
 if (item.notes.trim()) {
 formData.set("notes", item.notes.trim());
 }
 formData.set("file", item.file);
 await apiRequest("POST", `/api/objek-pajak/${created.id}/attachments`, formData);
 } catch {
 failedUploads.push(item.file.name);
 }
 }

 return { created, failedUploads };
 },
 onSuccess: ({ failedUploads }: { created: ObjekPajak; failedUploads: string[] }) => {
 invalidateObjekPajakQueries();
 onSaved?.();
 onOpenChange(false);
 form.reset();
 setQualityWarnings([]);
 setSubmitFieldErrors([]);
 setWizardStep("rekening");
 setSelectedJenisPajak("");
 setDraftAttachments([]);
 setDraftDocumentType(OP_ATTACHMENT_OPTIONS[0]?.value ?? "");
 setDraftNotes("");
 setDraftFile(null);
 setShowMapPicker(false);
 setMapPickerFeedback(null);
 if (draftFileInputRef.current) {
 draftFileInputRef.current.value = "";
 }
 toast({
 title: failedUploads.length > 0 ? "Berhasil Sebagian" : "Berhasil",
 description:
 failedUploads.length > 0
 ? `Objek Pajak berhasil ditambahkan, tetapi ${failedUploads.length} lampiran gagal diunggah.`
 : "Objek Pajak berhasil ditambahkan",
 variant: failedUploads.length > 0 ? "destructive" : "default",
 });
 },
 onError: (err: Error) => {
 if (err instanceof ApiError) {
 setSubmitFieldErrors(err.fieldErrors);
 applyApiFieldErrors(form, err.fieldErrors);
 }
 toast({ title: "Gagal", description: err.message, variant: "destructive" });
 },
});

 const updateMutation = useMutation({
 mutationFn: async (payload: NormalizedOpPayload) => {
 const res = await apiRequest("PATCH", `/api/objek-pajak/${editOp!.id}`, payload);
 return res.json();
 },
 onSuccess: () => {
 invalidateObjekPajakQueries();
 onSaved?.();
 onOpenChange(false);
 setQualityWarnings([]);
 setSubmitFieldErrors([]);
 setWizardStep("rekening");
 setDraftAttachments([]);
 setDraftDocumentType(OP_ATTACHMENT_OPTIONS[0]?.value ?? "");
 setDraftNotes("");
 setDraftFile(null);
 setShowMapPicker(false);
 setMapPickerFeedback(null);
 toast({ title: "Berhasil", description: "Objek Pajak berhasil diperbarui" });
 },
 onError: (err: Error) => {
 if (err instanceof ApiError) {
 setSubmitFieldErrors(err.fieldErrors);
 applyApiFieldErrors(form, err.fieldErrors);
 }
 toast({ title: "Gagal", description: err.message, variant: "destructive" });
 },
 });

 const isPending = createMutation.isPending || updateMutation.isPending;
 const selectedRekPajakId = form.watch("rekPajakId");
 const selectedRekening = rekeningList.find((item) => item.id === selectedRekPajakId);
 const jenisPajak = selectedRekening?.jenisPajak || "";
 const jenisPajakOptions = Array.from(new Set(rekeningList.map((item) => item.jenisPajak))).sort((a, b) =>
 a.localeCompare(b, "id-ID"),
 );
 const rekeningOptions = rekeningList;
 const selectedKecamatanId = form.watch("kecamatanId");
 const selectedWpId = form.watch("wpId");
 const selectedWp = wpList.find((item) => item.id === selectedWpId);
 const { data: selectedWpFallback } = useQuery<WajibPajakListItem | null>({
 queryKey: [`/api/wajib-pajak/detail/${selectedWpId}`],
 enabled: Boolean(selectedWpId && !selectedWp),
 queryFn: async () => {
 if (!selectedWpId) return null;
 const response = await fetch(`/api/wajib-pajak/detail/${selectedWpId}`, { credentials: "include" });
 if (!response.ok) {
 return null;
 }
 return (await response.json()) as WajibPajakListItem;
 },
 });
 const resolvedSelectedWp = selectedWp ?? selectedWpFallback ?? null;
 const selectedKecamatanKode = kecamatanList.find((item) => item.cpmKecId === selectedKecamatanId)?.cpmKodeKec;
 const filteredKelurahanList = selectedKecamatanKode
 ? kelurahanList.filter((item) => item.cpmKodeKec === selectedKecamatanKode)
 : [];
const currentValues = form.watch();
const currentStepIndex = CREATE_WIZARD_STEPS.findIndex((item) => item.id === wizardStep);
const draftDocumentLabelMap = Object.fromEntries(OP_ATTACHMENT_OPTIONS.map((item) => [item.value, item.label]));
const normalizedWpSearch = wpSearch.trim().toLocaleLowerCase("id-ID");
 const { data: searchedWpPage } = useQuery<{ items: WajibPajakListItem[] }>({
 queryKey: [`/api/wajib-pajak?page=1&limit=100&q=${encodeURIComponent(normalizedWpSearch)}`],
 enabled: normalizedWpSearch.length >= 3,
 queryFn: async () => {
 const response = await fetch(`/api/wajib-pajak?page=1&limit=100&q=${encodeURIComponent(normalizedWpSearch)}`, {
 credentials: "include",
 });
 if (!response.ok) {
 return { items: [] };
 }
 return (await response.json()) as { items: WajibPajakListItem[] };
 },
 });
 const filteredWpList = useMemo(() => {
 if (normalizedWpSearch.length < 3) return [];
 return Array.isArray(searchedWpPage?.items) ? searchedWpPage.items : [];
 }, [normalizedWpSearch, searchedWpPage]);

 const resetDraftAttachmentInput = () => {
 if (draftFileInputRef.current) {
 draftFileInputRef.current.value = "";
 }
 };

 const addDraftAttachment = () => {
 if (!draftFile) {
 toast({ title: "Gagal", description: "File lampiran wajib dipilih", variant: "destructive" });
 return;
 }

 setDraftAttachments((prev) => [
 ...prev,
 {
 id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
 documentType: draftDocumentType,
 file: draftFile,
 notes: draftNotes.trim(),
 },
 ]);
 setDraftNotes("");
 setDraftFile(null);
 setDraftDocumentType(OP_ATTACHMENT_OPTIONS[0]?.value ?? "");
 resetDraftAttachmentInput();
 };

 const removeDraftAttachment = (id: string) => {
 setDraftAttachments((prev) => prev.filter((item) => item.id !== id));
 };

 const handleWizardBack = () => {
 if (currentStepIndex <= 0) return;
 setWizardStep(CREATE_WIZARD_STEPS[currentStepIndex - 1].id);
 };

 const handleWizardNext = async () => {
 let fieldsToValidate: Array<keyof OPFormValues> = [];
 if (wizardStep === "rekening") fieldsToValidate = [];
 if (wizardStep === "data") fieldsToValidate = ["wpId", "namaOp", "alamatOp", "kecamatanId", "kelurahanId"];

 if (fieldsToValidate.length > 0) {
 const isValid = await form.trigger(fieldsToValidate);
 if (!isValid) return;
 }

 if (wizardStep === "rekening" && isCreateWizard && !selectedJenisPajak) {
 toast({ title: "Gagal", description: "Jenis pajak wajib dipilih", variant: "destructive" });
 return;
 }

 if (wizardStep === "detail" && !selectedRekening) {
 toast({ title: "Gagal", description: "Rekening pajak wajib dipilih", variant: "destructive" });
 return;
 }

 if (currentStepIndex < CREATE_WIZARD_STEPS.length - 1) {
 setWizardStep(CREATE_WIZARD_STEPS[currentStepIndex + 1].id);
 }
 };

 const runQualityCheck = async (payload: NormalizedOpPayload) => {
 const candidate = {
 nopd: payload.nopd,
 nama: payload.namaOp,
 alamat: payload.alamatOp,
 };
 const res = await apiRequest("POST", "/api/quality/check", candidate);
 const body = (await res.json()) as { warnings?: QualityWarning[] };
 const warnings = body.warnings ?? [];
 setQualityWarnings(warnings);
 return warnings;
 };

 const handleSubmit = async (data: OPFormValues) => {
 form.clearErrors();
 setSubmitFieldErrors([]);
 const payload = normalizeOpPayload(data, rekeningList);
 const warnings = await runQualityCheck(payload);
 if (warnings.length > 0) {
 const proceed = window.confirm(`Ditemukan ${warnings.length} warning data quality. Lanjutkan simpan?`);
 if (!proceed) return;
 }

 if (mode === "edit") {
 updateMutation.mutate(payload);
 return;
 }
 createMutation.mutate({ payload, attachments: draftAttachments });
 };
const showStep = (step: CreateWizardStep) => !isCreateWizard || wizardStep === step;
const isReviewStep = isCreateWizard && wizardStep === "review";
const currentJenisPajakLabel = selectedJenisPajak || selectedRekening?.jenisPajak || "Belum dipilih";
const reviewDetailEntries = (() => {
 const detail = (currentValues.detailPajak ?? {}) as Record<string, string | number | string[] | null | undefined>;
 const entries: Array<{ label: string; value: string }> = [];
 const push = (label: string, value: unknown) => {
 if (value === null || value === undefined || value === "") return;
 if (Array.isArray(value) && value.length === 0) return;
 if (Array.isArray(value)) {
 entries.push({ label, value: value.join(", ") });
 return;
 }
 entries.push({ label, value: String(value) });
 };

 if (jenisPajak.includes("Makanan")) {
 push("Jenis Usaha", detail.jenisUsaha);
 push("Klasifikasi", detail.klasifikasi);
 push("Kapasitas Tempat", detail.kapasitasTempat);
 push("Jumlah Karyawan", detail.jumlahKaryawan);
 push("Rata-rata Pengunjung", detail.rata2Pengunjung);
 push("Jam Buka", detail.jamBuka);
 push("Jam Tutup", detail.jamTutup);
 push("Harga Termurah", formatMoneyInput(detail.hargaTermurah));
 push("Harga Termahal", formatMoneyInput(detail.hargaTermahal));
 } else if (jenisPajak.includes("Perhotelan")) {
 push("Jenis Usaha", detail.jenisUsaha);
 push("Jumlah Kamar", detail.jumlahKamar);
 push("Klasifikasi", detail.klasifikasi);
 push("Fasilitas", detail.fasilitas);
 push("Rata-rata Pengunjung/Hari", detail.rata2PengunjungHarian);
 push("Harga Termurah", formatMoneyInput(detail.hargaTermurah));
 push("Harga Termahal", formatMoneyInput(detail.hargaTermahal));
 } else if (jenisPajak.includes("Parkir")) {
 push("Jenis Usaha", detail.jenisUsaha);
 push("Jenis Lokasi", detail.jenisLokasi);
 push("Kapasitas Kendaraan", detail.kapasitasKendaraan);
 push("Tarif Parkir", formatMoneyInput(detail.tarifParkir));
 push("Rata-rata per Hari", detail.rata2Pengunjung);
 } else if (jenisPajak.includes("Hiburan") || jenisPajak.includes("Kesenian")) {
 push("Jenis Hiburan", detail.jenisHiburan);
 push("Kapasitas", detail.kapasitas);
 push("Jam Operasional", detail.jamOperasional);
 push("Jumlah Karyawan", detail.jumlahKaryawan);
 } else if (jenisPajak.includes("Tenaga Listrik")) {
 push("Jenis Tenaga Listrik", detail.jenisTenagaListrik);
 push("Daya Listrik", detail.dayaListrik);
 push("Kapasitas", detail.kapasitas);
 } else if (jenisPajak.includes("Reklame")) {
 push("Jenis Reklame", detail.jenisReklame);
 push("Judul Reklame", detail.judulReklame);
 push("Masa Berlaku", detail.masaBerlaku);
 push("Status Reklame", detail.statusReklame);
 push("Ukuran Panjang", detail.ukuranPanjang);
 push("Ukuran Lebar", detail.ukuranLebar);
 push("Ukuran Tinggi", detail.ukuranTinggi);
 push("Nama Biro Jasa", detail.namaBiroJasa);
 } else if (jenisPajak.includes("Air Tanah")) {
 push("Jenis Air Tanah", detail.jenisAirTanah);
 push("Kriteria Air Tanah", detail.kriteriaAirTanah);
 push("Kelompok Usaha", detail.kelompokUsaha);
 push("Rata-rata Ukuran Pemakaian", detail.rata2UkuranPemakaian);
 } else if (jenisPajak.includes("Walet")) {
 push("Jenis Burung Walet", detail.jenisBurungWalet);
 push("Panen Per Tahun", detail.panenPerTahun);
 push("Rata-rata Berat Panen", detail.rata2BeratPanen);
 }

 return entries;
})();

 return (
 <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setWizardStep("rekening"); setDraftAttachments([]); setDraftDocumentType(OP_ATTACHMENT_OPTIONS[0]?.value ?? ""); setDraftNotes(""); setDraftFile(null); setWpPickerOpen(false); setWpSearch(""); resetDraftAttachmentInput(); setShowMapPicker(false); setMapPickerFeedback(null); } onOpenChange(open); }}>
 <DialogContent className="shadow-floating w-[calc(100vw-12px)] sm:max-w-lg overflow-x-hidden bg-white p-0 max-h-[90vh] overflow-y-auto">
 <DialogHeader className="border-b-[3px] border-primary/30 bg-[#2d3436] p-3 md:p-4">
 <DialogTitle className="font-sans text-xl font-black text-white">
 {mode === "edit" ? "EDIT OBJEK PAJAK" : "TAMBAH OBJEK PAJAK"}
 </DialogTitle>
 <DialogDescription className="sr-only">
 Form objek pajak untuk mengisi rekening, detail usaha, lokasi, dan data operasional.
 </DialogDescription>
 </DialogHeader>
 {isCreateWizard ? (
 <div className="border-b border-black/10 bg-[#f4f6fb] px-3 py-3 md:px-4">
 <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-black/55">
 <span>Step {currentStepIndex + 1} / {CREATE_WIZARD_STEPS.length}</span>
 <span>{CREATE_WIZARD_STEPS[currentStepIndex]?.label}</span>
 </div>
 <div className="grid grid-cols-6 gap-2">
 {CREATE_WIZARD_STEPS.map((step, index) => (
 <div key={step.id} className={`h-2 rounded-full ${index <= currentStepIndex ? "bg-primary" : "bg-black/10"}`} />
 ))}
 </div>
 </div>
 ) : null}
 <Form {...form}>
 <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 overflow-x-hidden p-3 pb-24 md:space-y-4 md:p-4 md:pb-4 [&_input]:h-10 [&_input]:px-3 [&_textarea]:px-3 [&_textarea]:py-2 [&_button[role=combobox]]:h-10 [&_button[role=combobox]]:px-3 md:[&_input]:h-11 md:[&_button[role=combobox]]:h-11">
{showStep("rekening") && (
<div className="space-y-4">
 {useJenisPajakSelector ? (
 <div className="space-y-2">
 <FormLabel className="font-mono text-xs font-bold text-black">JENIS PAJAK</FormLabel>
 <Select
 onValueChange={(value) => {
 setSelectedJenisPajak(value);
 const firstMatchingRekening = rekeningList.find((item) => item.jenisPajak === value);
 form.setValue("rekPajakId", firstMatchingRekening?.id as unknown as number);
 form.setValue("detailPajak", null);
 }}
 value={selectedJenisPajak}
 >
 <SelectTrigger className="font-mono text-sm" data-testid="select-jenis-pajak-op">
 <SelectValue placeholder="Pilih Jenis Pajak" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 {jenisPajakOptions.map((item) => (
 <SelectItem key={item} value={item}>
 {item}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 ) : null}
 {!useJenisPajakSelector ? <FormField
 control={form.control}
 name="rekPajakId"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">
 {isCreateWizard ? "REKENING PAJAK" : "REKENING PAJAK"}
 </FormLabel>
 <Select
 onValueChange={(value) => {
 field.onChange(parseInt(value, 10));
 if (useJenisPajakSelector) {
 setSelectedJenisPajak(rekeningList.find((item) => item.id === parseInt(value, 10))?.jenisPajak ?? "");
 }
 form.setValue("detailPajak", null);
 }}
 value={field.value ? String(field.value) : ""}
 >
 <FormControl>
 <SelectTrigger className="font-mono text-sm" data-testid="select-rekening-pajak-op">
 <SelectValue placeholder="Pilih Rekening Pajak" />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="border border-black">
 {rekeningOptions.map((rek) => (
 <SelectItem key={rek.id} value={String(rek.id)}>
 {rek.kodeRekening} - {rek.namaRekening}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 /> : null}
 {isCreateWizard ? (
 <div className="flex justify-end">
 <Button type="button" className="h-10 bg-[#2d3436] px-4 font-mono text-[11px] font-bold text-white md:h-11 md:text-xs" onClick={handleWizardNext}>
 Lanjut ke Detail
 <ChevronRight className="ml-2 h-4 w-4" />
 </Button>
 </div>
 ) : null}
 </div>
 )}

 {showStep("detail") && jenisPajak && (
 <div className="space-y-3 md:space-y-4">
 <DetailFieldsByJenis jenisPajak={jenisPajak} form={form} />
 {isCreateWizard ? (
 <div className="flex items-center justify-between gap-2">
 <Button type="button" variant="outline" className="h-10 min-w-0 flex-1 px-3 font-mono text-[11px] font-bold md:h-11 md:text-xs" onClick={handleWizardBack}>
 <ChevronLeft className="mr-2 h-4 w-4" />
 Kembali
 </Button>
 <Button type="button" className="h-10 min-w-0 flex-1 bg-[#2d3436] px-3 font-mono text-[11px] font-bold text-white md:h-11 md:text-xs" onClick={handleWizardNext}>
 Lanjut
 <ChevronRight className="ml-2 h-4 w-4" />
 </Button>
 </div>
 ) : null}
 </div>
 )}

 {showStep("data") && (
 <div className="space-y-3 md:space-y-4">
 <div className="grid grid-cols-2 gap-2 md:gap-3">
 <FormField
 control={form.control}
 name="nopd"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">NOPD</FormLabel>
 <FormControl>
 <Input {...field} className="font-mono text-sm" data-testid="input-nopd" />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="namaOp"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">NAMA OBJEK</FormLabel>
 <FormControl>
 <Input {...field} placeholder="Nama RM, Hotel, dll" className="font-mono text-sm" data-testid="input-nama-objek" />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 </div>
 <FormField
 control={form.control}
 name="wpId"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">WAJIB PAJAK</FormLabel>
 <Popover open={wpPickerOpen} onOpenChange={setWpPickerOpen}>
 <PopoverTrigger asChild>
 <FormControl>
 <Button
 type="button"
 variant="outline"
 role="combobox"
 aria-expanded={wpPickerOpen}
 className="h-10 w-full justify-between px-3 font-mono text-sm md:h-11"
 data-testid="select-wp"
 >
 <span className="truncate text-left">
 {resolvedSelectedWp ? `${resolvedSelectedWp.displayName} - ${resolvedSelectedWp.npwpd || "-"}` : "Cari nama WP"}
 </span>
 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
 </Button>
 </FormControl>
 </PopoverTrigger>
 <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-0 border border-black p-0">
 <Command shouldFilter={false}>
 <CommandInput
 value={wpSearch}
 onValueChange={setWpSearch}
 placeholder="Ketik nama WP..."
 className="font-mono text-sm"
 />
 <CommandList>
 {normalizedWpSearch.length < 3 ? (
 <CommandEmpty>Ketik minimal 3 huruf nama WP.</CommandEmpty>
 ) : filteredWpList.length === 0 ? (
 <CommandEmpty>Data WP tidak ditemukan.</CommandEmpty>
 ) : (
 filteredWpList.map((wp) => (
 <CommandItem
 key={wp.id}
 value={`${wp.displayName} ${wp.npwpd ?? ""}`}
 onSelect={() => {
 field.onChange(wp.id);
 setWpPickerOpen(false);
 setWpSearch("");
 }}
 className="font-mono text-sm"
 >
 <Check className={`mr-2 h-4 w-4 ${field.value === wp.id ? "opacity-100" : "opacity-0"}`} />
 <span className="truncate">{wp.displayName} - {wp.npwpd || "-"}</span>
 </CommandItem>
 ))
 )}
 </CommandList>
 </Command>
 </PopoverContent>
 </Popover>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="alamatOp"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">ALAMAT</FormLabel>
 <FormControl>
 <Input {...field} className="font-mono text-sm" data-testid="input-alamat-op" />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <div className="grid grid-cols-2 gap-2 md:gap-3">
 <FormField
 control={form.control}
 name="kecamatanId"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">KECAMATAN</FormLabel>
 <Select
 onValueChange={(value) => {
 field.onChange(value);
 form.setValue("kelurahanId", "");
 }}
 value={field.value || ""}
 >
 <FormControl>
 <SelectTrigger className="font-mono text-sm" data-testid="select-kecamatan-op">
 <SelectValue placeholder="Pilih Kecamatan" />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="border border-black">
 {kecamatanList.map((kec) => (
 <SelectItem key={kec.cpmKecId} value={kec.cpmKecId}>
 {kec.cpmKecamatan}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="kelurahanId"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">KELURAHAN</FormLabel>
 <Select onValueChange={field.onChange} value={field.value || ""}>
 <FormControl>
 <SelectTrigger className="font-mono text-sm" data-testid="select-kelurahan-op">
 <SelectValue placeholder={selectedKecamatanId ? "Pilih Kelurahan" : "Pilih Kecamatan dulu"} />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="border border-black">
 {filteredKelurahanList.map((kel) => (
 <SelectItem key={kel.cpmKelId} value={kel.cpmKelId}>
 {kel.cpmKelurahan}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage />
 </FormItem>
 )}
 />
 </div>
 <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-3">
 <FormField
 control={form.control}
 name="omsetBulanan"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">OMSET/BLN (Rp)</FormLabel>
 <FormControl>
 <Input {...field} value={formatMoneyInput(field.value)} inputMode="numeric" onChange={(e) => field.onChange(normalizeMoneyDigits(e.target.value))} className="h-11 px-3 font-mono text-sm md:h-10" data-testid="input-omset" />
 </FormControl>
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="tarifPersen"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">TARIF (%)</FormLabel>
 <FormControl>
 <Input {...field} value={field.value || ""} type="number" className="h-11 px-3 font-mono text-sm md:h-10" data-testid="input-tarif" />
 </FormControl>
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="pajakBulanan"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">PAJAK/BLN (Rp)</FormLabel>
 <FormControl>
 <Input {...field} value={formatMoneyInput(field.value)} inputMode="numeric" onChange={(e) => field.onChange(normalizeMoneyDigits(e.target.value))} className="h-11 px-3 font-mono text-sm md:h-10" data-testid="input-pajak-bulanan" />
 </FormControl>
 </FormItem>
 )}
 />
 </div>
 <FormField
 control={form.control}
 name="status"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-xs font-bold text-black">STATUS</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="font-mono text-sm" data-testid="select-status-op">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="border border-black">
 <SelectItem value="active">Active</SelectItem>
 <SelectItem value="inactive">Inactive</SelectItem>
 </SelectContent>
 </Select>
 </FormItem>
 )}
 />
 {isCreateWizard ? (
 <div className="flex items-center justify-between gap-2">
 <Button type="button" variant="outline" className="h-10 min-w-0 flex-1 px-3 font-mono text-[11px] font-bold md:h-11 md:text-xs" onClick={handleWizardBack}>
 <ChevronLeft className="mr-2 h-4 w-4" />
 Kembali
 </Button>
 <Button type="button" className="h-10 min-w-0 flex-1 bg-[#2d3436] px-3 font-mono text-[11px] font-bold text-white md:h-11 md:text-xs" onClick={handleWizardNext}>
 Lanjut
 <ChevronRight className="ml-2 h-4 w-4" />
 </Button>
 </div>
 ) : null}
 </div>
 )}

 {showStep("lokasi") && (
 <div className="space-y-3 md:space-y-4">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="font-mono text-xs font-bold text-black">LOKASI KOORDINAT</span>
 <Button type="button" size="sm" className="bg-primary text-black font-mono text-xs" onClick={() => { setMapPickerFeedback(null); setShowMapPicker(!showMapPicker); }} data-testid="button-toggle-map-picker">
 <Crosshair className="mr-1 h-3 w-3" />
 {showMapPicker ? "SEMBUNYIKAN PETA" : "PILIH DI PETA"}
 </Button>
 </div>
 {showMapPicker && (
 <MapPickerEmbed
 lat={form.getValues("latitude") || ""}
 lng={form.getValues("longitude") || ""}
 onSelect={(lat, lng) => {
 form.clearErrors(["latitude", "longitude"]);
 setMapPickerFeedback(null);
 form.setValue("latitude", lat.toFixed(7));
 form.setValue("longitude", lng.toFixed(7));
 }}
 onInvalidSelection={setMapPickerFeedback}
 />
 )}
 {mapPickerFeedback ? (
 <div className="rounded-md border border-amber-500 bg-amber-50 p-2 font-mono text-[11px] text-amber-900">
 {mapPickerFeedback}
 </div>
 ) : null}
 <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
 <FormField
 control={form.control}
 name="latitude"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-[10px] font-bold text-black">LATITUDE</FormLabel>
 <FormControl>
 <Input {...field} value={field.value || ""} className="font-mono text-sm" data-testid="input-latitude-op" />
 </FormControl>
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="longitude"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="font-mono text-[10px] font-bold text-black">LONGITUDE</FormLabel>
 <FormControl>
 <Input {...field} value={field.value || ""} className="font-mono text-sm" data-testid="input-longitude-op" />
 </FormControl>
 </FormItem>
 )}
 />
 </div>
 </div>
 {isCreateWizard ? (
 <div className="flex items-center justify-between gap-2">
 <Button type="button" variant="outline" className="h-10 min-w-0 flex-1 px-3 font-mono text-[11px] font-bold md:h-11 md:text-xs" onClick={handleWizardBack}>
 <ChevronLeft className="mr-2 h-4 w-4" />
 Kembali
 </Button>
 <Button type="button" className="h-10 min-w-0 flex-1 bg-[#2d3436] px-3 font-mono text-[11px] font-bold text-white md:h-11 md:text-xs" onClick={handleWizardNext}>
 Lanjut
 <ChevronRight className="ml-2 h-4 w-4" />
 </Button>
 </div>
 ) : null}
 </div>
 )}

 {showStep("lampiran") && (
 <div className="space-y-3 md:space-y-4">
 {mode === "edit" && editOp ? (
 <AttachmentPanel entityType="objek_pajak" entityId={editOp.id} title="Lampiran Objek Pajak" documentTypeOptions={[...OP_ATTACHMENT_OPTIONS]} />
 ) : isCreateWizard ? (
 <div className="space-y-3 border border-dashed border-border bg-background p-2 md:p-3">
 <div className="space-y-1">
 <p className="font-mono text-xs font-bold text-black">LAMPIRAN DRAFT</p>
 <p className="font-mono text-[11px] text-gray-700">Lampiran akan diunggah otomatis setelah data OP berhasil dibuat.</p>
 </div>
 <div className="space-y-3">
 <div className="space-y-2">
 <FormLabel className="font-mono text-xs font-bold text-black">Jenis Dokumen</FormLabel>
 <Select value={draftDocumentType} onValueChange={setDraftDocumentType}>
 <SelectTrigger className="font-mono text-sm">
 <SelectValue placeholder="Pilih jenis dokumen" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 {OP_ATTACHMENT_OPTIONS.map((option) => (
 <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <FormLabel className="font-mono text-xs font-bold text-black">File</FormLabel>
 <Input ref={draftFileInputRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="font-mono text-sm" onChange={(event) => setDraftFile(event.target.files?.[0] ?? null)} />
 </div>
 <div className="space-y-2">
 <FormLabel className="font-mono text-xs font-bold text-black">Catatan (Opsional)</FormLabel>
 <Textarea value={draftNotes} onChange={(event) => setDraftNotes(event.target.value)} className="min-h-[88px] font-mono text-sm" />
 </div>
 <Button type="button" className="h-10 w-full bg-primary px-4 font-mono text-[11px] font-bold text-black md:h-11 md:text-xs" onClick={addDraftAttachment}>
 <Upload className="mr-2 h-4 w-4" />
 Tambahkan ke Draft
 </Button>
 </div>
 {draftAttachments.length > 0 ? (
 <div className="space-y-2">
 {draftAttachments.map((item) => (
 <div key={item.id} className="border border-black/20 bg-white p-3 shadow-card">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0 space-y-1">
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/55">{draftDocumentLabelMap[item.documentType] || item.documentType}</p>
 <p className="truncate font-mono text-sm font-bold text-black">{item.file.name}</p>
 <p className="font-mono text-[11px] text-black/70">{Math.round(item.file.size / 1024)} KB</p>
 {item.notes ? <p className="font-mono text-[11px] text-black/70">{item.notes}</p> : null}
 </div>
 <Button type="button" variant="outline" className="h-10 w-10 p-0 text-red-600" onClick={() => removeDraftAttachment(item.id)}>
 <X className="h-4 w-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 ) : null}
 <div className="flex items-center justify-between gap-2">
 <Button type="button" variant="outline" className="h-10 min-w-0 flex-1 px-3 font-mono text-[11px] font-bold md:h-11 md:text-xs" onClick={handleWizardBack}>
 <ChevronLeft className="mr-2 h-4 w-4" />
 Kembali
 </Button>
 <Button type="button" className="h-10 min-w-0 flex-1 bg-[#2d3436] px-3 font-mono text-[11px] font-bold text-white md:h-11 md:text-xs" onClick={handleWizardNext}>
 Lanjut
 <ChevronRight className="ml-2 h-4 w-4" />
 </Button>
 </div>
 </div>
 ) : (
 <div className="border border-dashed border-border bg-background p-3 font-mono text-[11px] text-gray-700">
 Upload foto usaha, foto lokasi, dan izin usaha aktif setelah data Objek Pajak berhasil dibuat.
 </div>
 )}
 </div>
 )}

 {isReviewStep ? (
 <div className="space-y-3 border border-black/15 bg-[#f7f8fb] p-3 shadow-card md:space-y-4 md:p-4">
 <div className="space-y-1">
 <p className="font-sans text-lg font-black uppercase text-black">Review Objek Pajak</p>
 <p className="font-mono text-[11px] text-gray-700">Periksa data sebelum menyimpan.</p>
 </div>
 <div className="space-y-3 font-mono text-xs text-black">
 <div className="border border-black/10 bg-white p-2 md:p-3">
 <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-black/55">Jenis Pajak</p>
 <p className="font-bold">{currentJenisPajakLabel}</p>
</div>
 <div className="border border-black/10 bg-white p-2 md:p-3">
 <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-black/55">Data OP</p>
 <p>Nama Objek: <span className="font-bold">{currentValues.namaOp || "-"}</span></p>
 <p>Wajib Pajak: <span className="font-bold">{resolvedSelectedWp?.displayName || "-"}</span></p>
 <p>Alamat: <span className="font-bold">{currentValues.alamatOp || "-"}</span></p>
 <p>NOPD: <span className="font-bold">{currentValues.nopd || "(otomatis)"}</span></p>
 </div>
 <div className="border border-black/10 bg-white p-2 md:p-3">
 <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-black/55">Detail Usaha</p>
 {reviewDetailEntries.length > 0 ? (
 <div className="space-y-1">
 {reviewDetailEntries.map((entry) => (
 <p key={entry.label}>
 {entry.label}: <span className="font-bold">{entry.value}</span>
 </p>
 ))}
 </div>
 ) : (
 <p className="font-bold">Belum ada detail</p>
 )}
 </div>
 <div className="border border-black/10 bg-white p-2 md:p-3">
 <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-black/55">Lokasi</p>
 <p>Latitude: <span className="font-bold">{currentValues.latitude || "-"}</span></p>
 <p>Longitude: <span className="font-bold">{currentValues.longitude || "-"}</span></p>
 </div>
 <div className="border border-black/10 bg-white p-2 md:p-3">
 <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-black/55">Lampiran Draft</p>
 <p className="font-bold">{draftAttachments.length} file</p>
 </div>
 </div>
 {qualityWarnings.length > 0 && (
 <div className="border border-orange-500 bg-orange-50 p-3 space-y-1">
 <p className="font-mono text-xs font-bold text-orange-900">Warning Data Quality</p>
 {qualityWarnings.map((item) => (
 <p key={item.code} className="font-mono text-[11px] text-orange-800">{item.message}</p>
 ))}
 </div>
 )}
 {submitFieldErrors.length > 0 && (
 <div className="border border-red-600 bg-red-50 p-3 space-y-1">
 <p className="font-mono text-xs font-bold text-red-900">Periksa Isian Form</p>
 {submitFieldErrors.map((item, index) => (
 <p key={`${item.field}-${index}`} className="font-mono text-[11px] text-red-800">{item.message}</p>
 ))}
 </div>
 )}
 <div className="flex items-center justify-between gap-2">
 <Button type="button" variant="outline" className="h-10 min-w-0 flex-1 px-3 font-mono text-[11px] font-bold md:h-11 md:text-xs" onClick={handleWizardBack}>
 <ChevronLeft className="mr-2 h-4 w-4" />
 Kembali
 </Button>
 <Button type="submit" disabled={isPending} className="h-10 min-w-0 flex-1 border border-primary/30 bg-[#2d3436] px-3 font-mono text-[11px] font-bold text-white md:h-11 md:text-xs" data-testid="button-submit-op">
 {isPending ? "MENYIMPAN..." : "SIMPAN OP"}
 </Button>
 </div>
 </div>
 ) : null}

 {!isCreateWizard && qualityWarnings.length > 0 && (
 <div className="border border-orange-500 bg-orange-50 p-3 space-y-1">
 <p className="font-mono text-xs font-bold text-orange-900">Warning Data Quality</p>
 {qualityWarnings.map((item) => (
 <p key={item.code} className="font-mono text-[11px] text-orange-800">{item.message}</p>
 ))}
 </div>
 )}
 {!isCreateWizard && submitFieldErrors.length > 0 && (
 <div className="border border-red-600 bg-red-50 p-3 space-y-1">
 <p className="font-mono text-xs font-bold text-red-900">Periksa Isian Form</p>
 {submitFieldErrors.map((item, index) => (
 <p key={`${item.field}-${index}`} className="font-mono text-[11px] text-red-800">{item.message}</p>
 ))}
 </div>
 )}
 {!isCreateWizard && (
 <Button type="submit" disabled={isPending} className="w-full border border-primary/30 bg-[#2d3436] text-white font-mono font-bold h-11" data-testid="button-submit-op">
 {isPending ? "MENYIMPAN..." : mode === "edit" ? "PERBARUI OBJEK PAJAK" : "SIMPAN OBJEK PAJAK"}
 </Button>
 )}
 </form>
 </Form>
 </DialogContent>
 </Dialog>
 );
}



















