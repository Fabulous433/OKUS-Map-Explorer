import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Users, MapPin, Trash2, Search, Phone, Mail } from "lucide-react";
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
import type { WajibPajak, InsertWajibPajak } from "@shared/schema";

const wpFormSchema = z.object({
  npwp: z.string().min(1, "NPWP wajib diisi"),
  nama: z.string().min(1, "Nama wajib diisi"),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  kelurahan: z.string().nullable().optional(),
  kecamatan: z.string().nullable().optional(),
  telepon: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  status: z.string().default("active"),
});

export default function WajibPajakPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: wpList = [], isLoading } = useQuery<WajibPajak[]>({
    queryKey: ["/api/wajib-pajak"],
  });

  const form = useForm<z.infer<typeof wpFormSchema>>({
    resolver: zodResolver(wpFormSchema),
    defaultValues: {
      npwp: "",
      nama: "",
      alamat: "",
      kelurahan: "",
      kecamatan: "",
      telepon: "",
      email: "",
      latitude: "",
      longitude: "",
      status: "active",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof wpFormSchema>) => {
      const res = await apiRequest("POST", "/api/wajib-pajak", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wajib-pajak"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Berhasil", description: "Wajib Pajak berhasil ditambahkan" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/wajib-pajak/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wajib-pajak"] });
      toast({ title: "Berhasil", description: "Wajib Pajak berhasil dihapus" });
    },
  });

  const filtered = searchQuery
    ? wpList.filter(
        (wp) =>
          wp.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
          wp.npwp.includes(searchQuery)
      )
    : wpList;

  return (
    <div className="min-h-screen bg-white" data-testid="wp-page">
      <header className="border-b-[4px] border-black bg-[#FF6B00] p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                size="icon"
                variant="ghost"
                className="rounded-none w-10 h-10 bg-white border-[3px] border-black text-black no-default-hover-elevate no-default-active-elevate"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="bg-black w-10 h-10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-black text-white leading-none" data-testid="text-page-title">
                  WAJIB PAJAK
                </h1>
                <p className="font-mono text-[10px] text-black/70 tracking-widest uppercase">
                  Data Wajib Pajak OKU Selatan
                </p>
              </div>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="rounded-none border-[3px] border-black bg-[#FFFF00] text-black font-mono font-bold no-default-hover-elevate no-default-active-elevate"
                data-testid="button-add-wp"
              >
                <Plus className="w-4 h-4 mr-2" />
                TAMBAH WP
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-none border-[4px] border-black max-w-lg bg-white p-0">
              <DialogHeader className="p-4 border-b-[3px] border-black bg-[#FF6B00]">
                <DialogTitle className="font-serif text-xl font-black text-white">
                  TAMBAH WAJIB PAJAK
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
                      name="npwp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">NPWP</FormLabel>
                          <FormControl>
                            <Input {...field} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-npwp" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nama"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">NAMA</FormLabel>
                          <FormControl>
                            <Input {...field} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-nama" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="alamat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-xs font-bold text-black">ALAMAT</FormLabel>
                        <FormControl>
                          <Input {...field} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-alamat" />
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
                            <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-kelurahan" />
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
                            <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-kecamatan" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="telepon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">TELEPON</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-telepon" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-xs font-bold text-black">EMAIL</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-email" />
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
                            <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-latitude" />
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
                            <Input {...field} value={field.value || ""} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-longitude" />
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
                            <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-status">
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
                    className="w-full rounded-none border-[3px] border-black bg-[#FF6B00] text-white font-mono font-bold h-11 no-default-hover-elevate no-default-active-elevate"
                    data-testid="button-submit-wp"
                  >
                    {createMutation.isPending ? "MENYIMPAN..." : "SIMPAN WAJIB PAJAK"}
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
              placeholder="Cari nama atau NPWP..."
              className="pl-9 rounded-none border-[3px] border-black font-mono text-sm"
              data-testid="input-search-wp"
            />
          </div>
          <Badge className="rounded-none border-[2px] border-black bg-[#FF6B00] text-white font-mono text-xs">
            {filtered.length} WP
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64" data-testid="loading-wp">
            <div className="bg-[#FF6B00] border-[4px] border-black p-6 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-white border-t-transparent animate-spin" />
              <span className="font-mono text-sm font-bold text-white">MEMUAT DATA...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-[4px] border-dashed border-black" data-testid="empty-wp">
            <div className="bg-[#FF6B00] w-20 h-20 flex items-center justify-center border-[4px] border-black mb-4">
              <Users className="w-10 h-10 text-white" />
            </div>
            <p className="font-serif text-xl font-black text-black">BELUM ADA DATA</p>
            <p className="font-mono text-xs text-gray-500 mt-1">Klik tombol TAMBAH WP untuk memulai</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((wp) => (
              <div
                key={wp.id}
                className="border-[3px] border-black bg-white p-4 space-y-3 relative group"
                data-testid={`card-wp-${wp.id}`}
              >
                <div className="absolute top-2 right-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 rounded-none opacity-0 group-hover:opacity-100 transition-opacity no-default-hover-elevate no-default-active-elevate"
                    onClick={() => deleteMutation.mutate(wp.id)}
                    data-testid={`button-delete-wp-${wp.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-[#FF6B00] w-10 h-10 flex items-center justify-center flex-shrink-0 border-[2px] border-black">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-serif font-black text-base text-black truncate" data-testid={`text-wp-nama-${wp.id}`}>
                      {wp.nama}
                    </h3>
                    <p className="font-mono text-xs text-gray-500">{wp.npwp}</p>
                  </div>
                </div>
                <div className="font-mono text-xs text-gray-600 space-y-1">
                  <div className="flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-black" />
                    <span>{wp.alamat}</span>
                  </div>
                  {wp.telepon && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 flex-shrink-0 text-black" />
                      <span>{wp.telepon}</span>
                    </div>
                  )}
                  {wp.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 flex-shrink-0 text-black" />
                      <span>{wp.email}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    className={`rounded-none border-[2px] border-black font-mono text-[10px] ${
                      wp.status === "active" ? "bg-[#FFFF00] text-black" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {wp.status.toUpperCase()}
                  </Badge>
                  {wp.kecamatan && (
                    <Badge className="rounded-none border-[2px] border-black bg-white text-black font-mono text-[10px]">
                      {wp.kecamatan}
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
