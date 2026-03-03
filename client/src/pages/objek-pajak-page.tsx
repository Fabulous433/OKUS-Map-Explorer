import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Building2, MapPin, Trash2, Search, Ruler, DollarSign } from "lucide-react";
import { Link } from "wouter";
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

const opFormSchema = z.object({
  nop: z.string().min(1, "NOP wajib diisi"),
  wpId: z.coerce.number().nullable().optional(),
  jenis: z.string().min(1, "Jenis wajib diisi"),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  kelurahan: z.string().nullable().optional(),
  kecamatan: z.string().nullable().optional(),
  luasTanah: z.string().nullable().optional(),
  luasBangunan: z.string().nullable().optional(),
  njop: z.string().nullable().optional(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  status: z.string().default("active"),
});

export default function ObjekPajakPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: opList = [], isLoading } = useQuery<ObjekPajak[]>({
    queryKey: ["/api/objek-pajak"],
  });

  const { data: wpList = [] } = useQuery<WajibPajak[]>({
    queryKey: ["/api/wajib-pajak"],
  });

  const form = useForm<z.infer<typeof opFormSchema>>({
    resolver: zodResolver(opFormSchema),
    defaultValues: {
      nop: "",
      wpId: null,
      jenis: "",
      alamat: "",
      kelurahan: "",
      kecamatan: "",
      luasTanah: "",
      luasBangunan: "",
      njop: "",
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
          op.jenis.toLowerCase().includes(searchQuery.toLowerCase()) ||
          op.nop.includes(searchQuery) ||
          op.alamat.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : opList;

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
                  OBJEK PAJAK
                </h1>
                <p className="font-mono text-[10px] text-white/60 tracking-widest uppercase">
                  Data Objek Pajak OKU Selatan
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
            <DialogContent className="rounded-none border-[4px] border-black max-w-lg bg-white p-0">
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
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="nop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">NOP</FormLabel>
                          <FormControl>
                            <Input {...field} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-nop" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jenis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">JENIS</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Tanah, Bangunan, dll" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-jenis" />
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
                                {wp.nama} - {wp.npwp}
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
                      name="luasTanah"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">LUAS TANAH (m²)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} type="number" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-luas-tanah" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="luasBangunan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">LUAS BANGUNAN (m²)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} type="number" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-luas-bangunan" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="njop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">NJOP (Rp)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} type="number" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-njop" />
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
              placeholder="Cari jenis, NOP, atau alamat..."
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
                className="border-[3px] border-black bg-white p-4 space-y-3 relative group"
                data-testid={`card-op-${op.id}`}
              >
                <div className="absolute top-2 right-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 rounded-none opacity-0 group-hover:opacity-100 transition-opacity no-default-hover-elevate no-default-active-elevate"
                    onClick={() => deleteMutation.mutate(op.id)}
                    data-testid={`button-delete-op-${op.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-black w-10 h-10 flex items-center justify-center flex-shrink-0 border-[2px] border-[#FFFF00]">
                    <Building2 className="w-5 h-5 text-[#FFFF00]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif font-black text-base text-black truncate" data-testid={`text-op-jenis-${op.id}`}>
                      {op.jenis}
                    </h3>
                    <p className="font-mono text-xs text-gray-500">{op.nop}</p>
                  </div>
                </div>
                <div className="font-mono text-xs text-gray-600 space-y-1">
                  <div className="flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-black" />
                    <span>{op.alamat}</span>
                  </div>
                  {(op.luasTanah || op.luasBangunan) && (
                    <div className="flex items-center gap-1">
                      <Ruler className="w-3 h-3 flex-shrink-0 text-black" />
                      <span>
                        {op.luasTanah && `Tanah: ${op.luasTanah}m²`}
                        {op.luasTanah && op.luasBangunan && " | "}
                        {op.luasBangunan && `Bangunan: ${op.luasBangunan}m²`}
                      </span>
                    </div>
                  )}
                  {op.njop && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 flex-shrink-0 text-black" />
                      <span className="font-bold">NJOP: Rp {Number(op.njop).toLocaleString("id-ID")}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={`rounded-none border-[2px] border-black font-mono text-[10px] ${
                      op.status === "active" ? "bg-[#FFFF00] text-black" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {op.status.toUpperCase()}
                  </Badge>
                  {op.kecamatan && (
                    <Badge className="rounded-none border-[2px] border-black bg-white text-black font-mono text-[10px]">
                      {op.kecamatan}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
