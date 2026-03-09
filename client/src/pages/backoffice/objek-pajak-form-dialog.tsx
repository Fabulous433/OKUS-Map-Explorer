import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Crosshair, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ApiError, type ApiFieldError, apiRequest } from "@/lib/queryClient";
import { AttachmentPanel } from "@/components/attachments/attachment-panel";
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
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [qualityWarnings, setQualityWarnings] = useState<QualityWarning[]>([]);
  const [submitFieldErrors, setSubmitFieldErrors] = useState<ApiFieldError[]>([]);

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
    if (mode === "edit" && editOp) {
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
      form.reset();
    }
  }, [mode, editOp, form]);

  const createMutation = useMutation({
    mutationFn: async (payload: NormalizedOpPayload) => {
      const res = await apiRequest("POST", "/api/objek-pajak", payload);
      return res.json();
    },
    onSuccess: () => {
      invalidateObjekPajakQueries();
      onSaved?.();
      onOpenChange(false);
      form.reset();
      setQualityWarnings([]);
      setSubmitFieldErrors([]);
      toast({ title: "Berhasil", description: "Objek Pajak berhasil ditambahkan" });
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
  const selectedKecamatanId = form.watch("kecamatanId");
  const selectedKecamatanKode = kecamatanList.find((item) => item.cpmKecId === selectedKecamatanId)?.cpmKodeKec;
  const filteredKelurahanList = selectedKecamatanKode
    ? kelurahanList.filter((item) => item.cpmKodeKec === selectedKecamatanKode)
    : [];

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
    createMutation.mutate(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-[4px] border-black max-w-lg bg-white p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-4 border-b-[3px] border-[#FFFF00] bg-black">
          <DialogTitle className="font-serif text-xl font-black text-[#FFFF00]">
            {mode === "edit" ? "EDIT OBJEK PAJAK" : "TAMBAH OBJEK PAJAK"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-4 space-y-4">
            <FormField
              control={form.control}
              name="rekPajakId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs font-bold text-black">REKENING PAJAK</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(parseInt(value, 10));
                      form.setValue("detailPajak", null);
                    }}
                    value={field.value ? String(field.value) : ""}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-rekening-pajak-op">
                        <SelectValue placeholder="Pilih Rekening Pajak" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none border-[2px] border-black">
                      {rekeningList.map((rek) => (
                        <SelectItem key={rek.id} value={String(rek.id)}>
                          {rek.kodeRekening} - {rek.namaRekening}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {jenisPajak && <DetailFieldsByJenis jenisPajak={jenisPajak} form={form} />}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nopd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs font-bold text-black">NOPD</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-nopd" />
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
                      <Input {...field} placeholder="Nama RM, Hotel, dll" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-nama-objek" />
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
                  <Select
                    onValueChange={(val) => field.onChange(parseInt(val, 10))}
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-wp">
                        <SelectValue placeholder="Pilih Wajib Pajak" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none border-[2px] border-black">
                      {wpList.map((wp) => (
                        <SelectItem key={wp.id} value={wp.id.toString()}>
                          {wp.displayName} - {wp.npwpd || "-"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Input {...field} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-alamat-op" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
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
                        <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-kecamatan-op">
                          <SelectValue placeholder="Pilih Kecamatan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-none border-[2px] border-black">
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
                        <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-kelurahan-op">
                          <SelectValue placeholder={selectedKecamatanId ? "Pilih Kelurahan" : "Pilih Kecamatan dulu"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-none border-[2px] border-black">
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
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="omsetBulanan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs font-bold text-black">OMSET/BLN (Rp)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={formatMoneyInput(field.value)}
                        inputMode="numeric"
                        onChange={(e) => field.onChange(normalizeMoneyDigits(e.target.value))}
                        className="rounded-none border-[2px] border-black font-mono text-sm"
                        data-testid="input-omset"
                      />
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
                      <Input {...field} value={field.value || ""} type="number" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-tarif" />
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
                      <Input
                        {...field}
                        value={formatMoneyInput(field.value)}
                        inputMode="numeric"
                        onChange={(e) => field.onChange(normalizeMoneyDigits(e.target.value))}
                        className="rounded-none border-[2px] border-black font-mono text-sm"
                        data-testid="input-pajak-bulanan"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-black">LOKASI KOORDINAT</span>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-none border-[2px] border-black bg-[#FFFF00] text-black font-mono text-xs no-default-hover-elevate no-default-active-elevate"
                  onClick={() => setShowMapPicker(!showMapPicker)}
                  data-testid="button-toggle-map-picker"
                >
                  <Crosshair className="w-3 h-3 mr-1" />
                  {showMapPicker ? "SEMBUNYIKAN PETA" : "PILIH DI PETA"}
                </Button>
              </div>
              {showMapPicker && (
                <MapPickerEmbed
                  lat={form.getValues("latitude") || ""}
                  lng={form.getValues("longitude") || ""}
                  onSelect={(lat, lng) => {
                    form.setValue("latitude", lat.toFixed(7));
                    form.setValue("longitude", lng.toFixed(7));
                  }}
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-[10px] font-bold text-black">LATITUDE</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-latitude-op" />
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
                        <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-longitude-op" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-xs font-bold text-black">STATUS</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-status-op">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none border-[2px] border-black">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            {qualityWarnings.length > 0 && (
              <div className="border-[2px] border-orange-500 bg-orange-50 p-3 space-y-1">
                <p className="font-mono text-xs font-bold text-orange-900">Warning Data Quality</p>
                {qualityWarnings.map((item) => (
                  <p key={item.code} className="font-mono text-[11px] text-orange-800">
                    {item.message}
                  </p>
                ))}
              </div>
            )}
            {submitFieldErrors.length > 0 && (
              <div className="border-[2px] border-red-600 bg-red-50 p-3 space-y-1">
                <p className="font-mono text-xs font-bold text-red-900">Periksa Isian Form</p>
                {submitFieldErrors.map((item, index) => (
                  <p key={`${item.field}-${index}`} className="font-mono text-[11px] text-red-800">
                    {item.message}
                  </p>
                ))}
              </div>
            )}
            {mode === "edit" && editOp ? (
              <AttachmentPanel
                entityType="objek_pajak"
                entityId={editOp.id}
                title="Lampiran Objek Pajak"
                documentTypeOptions={[...OP_ATTACHMENT_OPTIONS]}
              />
            ) : (
              <div className="border-[2px] border-dashed border-black bg-[#fffaf0] p-3 font-mono text-[11px] text-gray-700">
                Upload foto usaha, foto lokasi, dan izin usaha aktif setelah data Objek Pajak berhasil dibuat.
              </div>
            )}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full rounded-none border-[3px] border-[#FFFF00] bg-black text-[#FFFF00] font-mono font-bold h-11 no-default-hover-elevate no-default-active-elevate"
              data-testid="button-submit-op"
            >
              {isPending ? "MENYIMPAN..." : mode === "edit" ? "PERBARUI OBJEK PAJAK" : "SIMPAN OBJEK PAJAK"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}





