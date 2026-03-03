import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Building2, MapPin, Trash2, Search, Star, Navigation, DollarSign, Percent, Tag } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ObjekPajak, WajibPajak } from "@shared/schema";
import { JENIS_PAJAK_OPTIONS } from "@shared/schema";

const opFormSchema = z.object({
  nopd: z.string().min(1, "NOPD wajib diisi"),
  wpId: z.coerce.number().nullable().optional(),
  jenisPajak: z.string().min(1, "Jenis Pajak wajib diisi"),
  namaObjek: z.string().min(1, "Nama Objek wajib diisi"),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  kelurahan: z.string().nullable().optional(),
  kecamatan: z.string().nullable().optional(),
  omsetBulanan: z.string().nullable().optional(),
  tarifPersen: z.string().nullable().optional(),
  pajakBulanan: z.string().nullable().optional(),
  rating: z.string().nullable().optional(),
  reviewCount: z.coerce.number().nullable().optional(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  status: z.string().default("active"),
});

export default function ObjekPajakPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: opList = [], isLoading } = useQuery<ObjekPajak[]>({
    queryKey: ["/api/objek-pajak"],
  });

  const { data: wpList = [] } = useQuery<WajibPajak[]>({
    queryKey: ["/api/wajib-pajak"],
  });

  const form = useForm<z.infer<typeof opFormSchema>>({
    resolver: zodResolver(opFormSchema),
    defaultValues: {
      nopd: "",
      wpId: null,
      jenisPajak: "",
      namaObjek: "",
      alamat: "",
      kelurahan: "",
      kecamatan: "",
      omsetBulanan: "",
      tarifPersen: "",
      pajakBulanan: "",
      rating: "",
      reviewCount: null,
      latitude: "",
      longitude: "",
      status: "active",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof opFormSchema>) => {
      const res = await apiRequest("POST", "/api/objek-pajak", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objek-pajak"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Berhasil", description: "Objek Pajak berhasil ditambahkan" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/objek-pajak/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/objek-pajak"] });
      toast({ title: "Berhasil", description: "Objek Pajak berhasil dihapus" });
    },
  });

  const filtered = searchQuery
    ? opList.filter(
        (op) =>
          op.namaObjek.toLowerCase().includes(searchQuery.toLowerCase()) ||
          op.nopd.includes(searchQuery) ||
          op.jenisPajak.toLowerCase().includes(searchQuery.toLowerCase()) ||
          op.alamat.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : opList;

  const navigateToMap = (lat: string, lng: string) => {
    setLocation(`/?lat=${lat}&lng=${lng}&zoom=17`);
  };

  const jenisPajakColor = (jenis: string) => {
    if (jenis.includes("Makanan")) return "bg-[#FF6B00] text-white";
    if (jenis.includes("Perhotelan")) return "bg-blue-600 text-white";
    if (jenis.includes("Reklame")) return "bg-purple-600 text-white";
    if (jenis.includes("Parkir")) return "bg-green-600 text-white";
    return "bg-gray-600 text-white";
  };

  return (
    <div className="min-h-screen bg-white" data-testid="op-page">
      <header className="border-b-[4px] border-[#FFFF00] bg-black p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-none w-10 h-10 bg-[#FFFF00] border-[3px] border-[#FFFF00] text-black no-default-hover-elevate no-default-active-elevate"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-[#FFFF00] w-10 h-10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-black text-[#FFFF00] leading-none" data-testid="text-page-title">
                  OBJEK PAJAK DAERAH
                </h1>
                <p className="font-mono text-[10px] text-white/60 tracking-widest uppercase">
                  Data OP Pajak Daerah OKU Selatan
                </p>
              </div>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="rounded-none border-[3px] border-[#FFFF00] bg-[#FFFF00] text-black font-mono font-bold no-default-hover-elevate no-default-active-elevate"
                data-testid="button-add-op"
              >
                <Plus className="w-4 h-4 mr-2" />
                TAMBAH OP
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-none border-[4px] border-black max-w-lg bg-white p-0 max-h-[90vh] overflow-y-auto">
              <DialogHeader className="p-4 border-b-[3px] border-[#FFFF00] bg-black">
                <DialogTitle className="font-serif text-xl font-black text-[#FFFF00]">
                  TAMBAH OBJEK PAJAK
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
                  className="p-4 space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="jenisPajak"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs font-bold text-black">JENIS PAJAK DAERAH</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-jenis-pajak-op">
                              <SelectValue placeholder="Pilih Jenis Pajak" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-none border-[2px] border-black">
                            {JENIS_PAJAK_OPTIONS.map((jp) => (
                              <SelectItem key={jp} value={jp}>{jp}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                      name="namaObjek"
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
                          onValueChange={(val) => field.onChange(val ? parseInt(val) : null)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-wp">
                              <SelectValue placeholder="Pilih Wajib Pajak (opsional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-none border-[2px] border-black">
                            {wpList.map((wp) => (
                              <SelectItem key={wp.id} value={wp.id.toString()}>
                                {wp.nama} - {wp.npwpd}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alamat"
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
                      name="kelurahan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">KELURAHAN</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-kelurahan-op" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="kecamatan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">KECAMATAN</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-kecamatan-op" />
                          </FormControl>
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
                            <Input {...field} value={field.value || ""} type="number" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-omset" />
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
                            <Input {...field} value={field.value || ""} type="number" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-pajak-bulanan" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">LATITUDE</FormLabel>
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
                          <FormLabel className="font-mono text-xs font-bold text-black">LONGITUDE</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-longitude-op" />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="w-full rounded-none border-[3px] border-[#FFFF00] bg-black text-[#FFFF00] font-mono font-bold h-11 no-default-hover-elevate no-default-active-elevate"
                    data-testid="button-submit-op"
                  >
                    {createMutation.isPending ? "MENYIMPAN..." : "SIMPAN OBJEK PAJAK"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama objek, NOPD, jenis pajak..."
              className="pl-9 rounded-none border-[3px] border-black font-mono text-sm"
              data-testid="input-search-op"
            />
          </div>
          <Badge className="rounded-none border-[2px] border-black bg-black text-[#FFFF00] font-mono text-xs">
            {filtered.length} OP
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64" data-testid="loading-op">
            <div className="bg-black border-[4px] border-[#FFFF00] p-6 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-[#FFFF00] border-t-transparent animate-spin" />
              <span className="font-mono text-sm font-bold text-[#FFFF00]">MEMUAT DATA...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-[4px] border-dashed border-black" data-testid="empty-op">
            <div className="bg-black w-20 h-20 flex items-center justify-center border-[4px] border-[#FFFF00] mb-4">
              <Building2 className="w-10 h-10 text-[#FFFF00]" />
            </div>
            <p className="font-serif text-xl font-black text-black">BELUM ADA DATA</p>
            <p className="font-mono text-xs text-gray-500 mt-1">Klik tombol TAMBAH OP untuk memulai</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((op) => (
              <div
                key={op.id}
                className="border-[3px] border-black bg-white p-4 space-y-3 relative group cursor-pointer hover:border-[#FFFF00] hover:shadow-[4px_4px_0px_0px_#000] transition-all"
                data-testid={`card-op-${op.id}`}
                onClick={() => {
                  if (op.latitude && op.longitude) {
                    navigateToMap(op.latitude, op.longitude);
                  }
                }}
              >
                <div className="absolute top-2 right-2 flex gap-1">
                  {op.latitude && op.longitude && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 rounded-none bg-[#FFFF00] border-[2px] border-black no-default-hover-elevate no-default-active-elevate"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToMap(op.latitude!, op.longitude!);
                      }}
                      data-testid={`button-locate-op-${op.id}`}
                    >
                      <Navigation className="w-3.5 h-3.5 text-black" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 rounded-none opacity-0 group-hover:opacity-100 transition-opacity no-default-hover-elevate no-default-active-elevate"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(op.id);
                    }}
                    data-testid={`button-delete-op-${op.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-black w-10 h-10 flex items-center justify-center flex-shrink-0 border-[2px] border-[#FFFF00]">
                    <Building2 className="w-5 h-5 text-[#FFFF00]" />
                  </div>
                  <div className="min-w-0 pr-16">
                    <h3 className="font-serif font-black text-base text-black truncate" data-testid={`text-op-nama-${op.id}`}>
                      {op.namaObjek}
                    </h3>
                    <p className="font-mono text-xs text-gray-500">{op.nopd}</p>
                  </div>
                </div>
                {op.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#FFFF00] border-[2px] border-black px-2 py-0.5">
                      <Star className="w-3 h-3 text-black fill-black" />
                      <span className="font-mono text-xs font-bold text-black">{Number(op.rating).toFixed(1)}</span>
                    </div>
                    {op.reviewCount && (
                      <span className="font-mono text-xs text-gray-500">({op.reviewCount} ulasan)</span>
                    )}
                  </div>
                )}
                <div className="font-mono text-xs text-gray-600 space-y-1">
                  <div className="flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-black" />
                    <span>{op.alamat}</span>
                  </div>
                  {op.omsetBulanan && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 flex-shrink-0 text-black" />
                      <span>Omset: Rp {Number(op.omsetBulanan).toLocaleString("id-ID")}/bln</span>
                    </div>
                  )}
                  {op.pajakBulanan && (
                    <div className="flex items-center gap-1">
                      <Percent className="w-3 h-3 flex-shrink-0 text-black" />
                      <span className="font-bold">Pajak: Rp {Number(op.pajakBulanan).toLocaleString("id-ID")}/bln</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={`rounded-none border-[2px] border-black font-mono text-[10px] ${jenisPajakColor(op.jenisPajak)}`}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {op.jenisPajak}
                  </Badge>
                  <Badge
                    className={`rounded-none border-[2px] border-black font-mono text-[10px] ${
                      op.status === "active" ? "bg-[#FFFF00] text-black" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {op.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
