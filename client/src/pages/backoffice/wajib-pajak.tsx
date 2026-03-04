import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Trash2, Pencil, Users, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WajibPajak } from "@shared/schema";
import { JENIS_PAJAK_OPTIONS } from "@shared/schema";
import BackofficeLayout from "./layout";

const wpFormSchema = z.object({
  npwpd: z.string().min(1, "NPWPD wajib diisi"),
  nama: z.string().min(1, "Nama wajib diisi"),
  namaUsaha: z.string().nullable().optional(),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  kelurahan: z.string().nullable().optional(),
  kecamatan: z.string().nullable().optional(),
  telepon: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  jenisPajak: z.string().min(1, "Jenis Pajak wajib diisi"),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  status: z.string().default("active"),
});

type WpFormValues = z.infer<typeof wpFormSchema>;

const jenisPajakColor = (jenis: string) => {
  if (jenis.includes("Makanan")) return "bg-[#FF6B00] text-white";
  if (jenis.includes("Perhotelan")) return "bg-blue-600 text-white";
  if (jenis.includes("Reklame")) return "bg-purple-600 text-white";
  if (jenis.includes("Parkir")) return "bg-green-600 text-white";
  if (jenis.includes("Hiburan")) return "bg-pink-600 text-white";
  return "bg-gray-600 text-white";
};

function WpFormFields({ form }: { form: ReturnType<typeof useForm<WpFormValues>> }) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="jenisPajak"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-mono text-xs font-bold text-black">JENIS PAJAK DAERAH</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="select-jenis-pajak">
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
          name="npwpd"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono text-xs font-bold text-black">NPWPD</FormLabel>
              <FormControl>
                <Input {...field} className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-npwpd" />
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
        name="namaUsaha"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-mono text-xs font-bold text-black">NAMA USAHA</FormLabel>
            <FormControl>
              <Input {...field} value={field.value || ""} placeholder="Nama rumah makan, hotel, dll" className="rounded-none border-[2px] border-black font-mono text-sm" data-testid="input-nama-usaha" />
            </FormControl>
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
            <Select onValueChange={field.onChange} value={field.value}>
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
    </div>
  );
}

export default function BackofficeWajibPajak() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingWp, setEditingWp] = useState<WajibPajak | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: wpList = [], isLoading } = useQuery<WajibPajak[]>({
    queryKey: ["/api/wajib-pajak"],
  });

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/wajib-pajak/import", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal", description: result.message, variant: "destructive" });
      } else {
        toast({
          title: "Import Selesai",
          description: `${result.success} berhasil, ${result.failed} gagal dari ${result.total} data`,
        });
        if (result.errors?.length > 0) {
          console.log("Import errors:", result.errors);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/wajib-pajak"] });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addForm = useForm<WpFormValues>({
    resolver: zodResolver(wpFormSchema),
    defaultValues: {
      npwpd: "", nama: "", namaUsaha: "", alamat: "", kelurahan: "", kecamatan: "",
      telepon: "", email: "", jenisPajak: "", latitude: "", longitude: "", status: "active",
    },
  });

  const editForm = useForm<WpFormValues>({
    resolver: zodResolver(wpFormSchema),
    defaultValues: {
      npwpd: "", nama: "", namaUsaha: "", alamat: "", kelurahan: "", kecamatan: "",
      telepon: "", email: "", jenisPajak: "", latitude: "", longitude: "", status: "active",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WpFormValues) => {
      const res = await apiRequest("POST", "/api/wajib-pajak", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wajib-pajak"] });
      setIsAddOpen(false);
      addForm.reset();
      toast({ title: "Berhasil", description: "Wajib Pajak berhasil ditambahkan" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: WpFormValues }) => {
      const res = await apiRequest("PATCH", `/api/wajib-pajak/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wajib-pajak"] });
      setEditingWp(null);
      toast({ title: "Berhasil", description: "Wajib Pajak berhasil diperbarui" });
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

  const openEdit = (wp: WajibPajak) => {
    setEditingWp(wp);
    editForm.reset({
      npwpd: wp.npwpd,
      nama: wp.nama,
      namaUsaha: wp.namaUsaha || "",
      alamat: wp.alamat,
      kelurahan: wp.kelurahan || "",
      kecamatan: wp.kecamatan || "",
      telepon: wp.telepon || "",
      email: wp.email || "",
      jenisPajak: wp.jenisPajak,
      latitude: wp.latitude || "",
      longitude: wp.longitude || "",
      status: wp.status,
    });
  };

  const filtered = searchQuery
    ? wpList.filter(
        (wp) =>
          wp.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
          wp.npwpd.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (wp.namaUsaha && wp.namaUsaha.toLowerCase().includes(searchQuery.toLowerCase())) ||
          wp.jenisPajak.toLowerCase().includes(searchQuery.toLowerCase()) ||
          wp.alamat.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (wp.kecamatan && wp.kecamatan.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : wpList;

  return (
    <BackofficeLayout>
      <div className="p-6" data-testid="backoffice-wp-page">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleImportCSV}
          data-testid="input-import-wp-file"
        />
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-[#FF6B00] w-10 h-10 flex items-center justify-center border-[3px] border-black">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-black text-black leading-none" data-testid="text-page-title">
                WAJIB PAJAK
              </h1>
              <p className="font-mono text-[10px] text-gray-500 tracking-widest uppercase">
                Kelola Data Wajib Pajak Daerah
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="rounded-none border-[3px] border-black bg-white text-black font-mono font-bold text-xs no-default-hover-elevate no-default-active-elevate"
              onClick={() => window.open("/api/wajib-pajak/export", "_blank")}
              data-testid="button-export-wp"
            >
              <Download className="w-4 h-4 mr-1" />
              EXPORT CSV
            </Button>
            <Button
              variant="outline"
              className="rounded-none border-[3px] border-black bg-white text-black font-mono font-bold text-xs no-default-hover-elevate no-default-active-elevate"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-import-wp"
            >
              <Upload className="w-4 h-4 mr-1" />
              IMPORT CSV
            </Button>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="rounded-none border-[3px] border-black bg-[#FFFF00] text-black font-mono font-bold no-default-hover-elevate no-default-active-elevate"
              data-testid="button-add-wp"
            >
              <Plus className="w-4 h-4 mr-2" />
              TAMBAH WP
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NPWPD, usaha, jenis pajak, alamat..."
              className="pl-9 rounded-none border-[3px] border-black font-mono text-sm"
              data-testid="input-search-wp"
            />
          </div>
          <Badge className="rounded-none border-[2px] border-black bg-[#FF6B00] text-white font-mono text-xs no-default-hover-elevate no-default-active-elevate">
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
          <div className="border-[3px] border-black overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-black hover:bg-black">
                  <TableHead className="font-mono text-xs font-bold text-[#FFFF00] whitespace-nowrap">NPWPD</TableHead>
                  <TableHead className="font-mono text-xs font-bold text-[#FFFF00] whitespace-nowrap">NAMA</TableHead>
                  <TableHead className="font-mono text-xs font-bold text-[#FFFF00] whitespace-nowrap">NAMA USAHA</TableHead>
                  <TableHead className="font-mono text-xs font-bold text-[#FFFF00] whitespace-nowrap">JENIS PAJAK</TableHead>
                  <TableHead className="font-mono text-xs font-bold text-[#FFFF00] whitespace-nowrap">ALAMAT</TableHead>
                  <TableHead className="font-mono text-xs font-bold text-[#FFFF00] whitespace-nowrap">KECAMATAN</TableHead>
                  <TableHead className="font-mono text-xs font-bold text-[#FFFF00] whitespace-nowrap">STATUS</TableHead>
                  <TableHead className="font-mono text-xs font-bold text-[#FFFF00] whitespace-nowrap text-right">AKSI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((wp) => (
                  <TableRow key={wp.id} className="border-b-[2px] border-black hover:bg-gray-50" data-testid={`row-wp-${wp.id}`}>
                    <TableCell className="font-mono text-xs font-bold whitespace-nowrap" data-testid={`text-wp-npwpd-${wp.id}`}>{wp.npwpd}</TableCell>
                    <TableCell className="font-mono text-sm font-bold" data-testid={`text-wp-nama-${wp.id}`}>{wp.nama}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-600">{wp.namaUsaha || "-"}</TableCell>
                    <TableCell>
                      <Badge className={`rounded-none border-[2px] border-black font-mono text-[10px] whitespace-nowrap no-default-hover-elevate no-default-active-elevate ${jenisPajakColor(wp.jenisPajak)}`}>
                        {wp.jenisPajak}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-600 max-w-[200px] truncate">{wp.alamat}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-600">{wp.kecamatan || "-"}</TableCell>
                    <TableCell>
                      <Badge className={`rounded-none border-[2px] border-black font-mono text-[10px] no-default-hover-elevate no-default-active-elevate ${
                        wp.status === "active" ? "bg-[#FFFF00] text-black" : "bg-gray-200 text-gray-600"
                      }`}>
                        {wp.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(wp)}
                          className="rounded-none"
                          data-testid={`button-edit-wp-${wp.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(wp.id)}
                          className="rounded-none text-red-600"
                          data-testid={`button-delete-wp-${wp.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-none border-[4px] border-black max-w-lg bg-white p-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-4 border-b-[3px] border-black bg-[#FF6B00]">
            <DialogTitle className="font-serif text-xl font-black text-white">
              TAMBAH WAJIB PAJAK
            </DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form
              onSubmit={addForm.handleSubmit((data) => createMutation.mutate(data))}
              className="p-4 space-y-4"
            >
              <WpFormFields form={addForm} />
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full rounded-none border-[3px] border-black bg-[#FF6B00] text-white font-mono font-bold no-default-hover-elevate no-default-active-elevate"
                data-testid="button-submit-wp"
              >
                {createMutation.isPending ? "MENYIMPAN..." : "SIMPAN WAJIB PAJAK"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingWp} onOpenChange={(open) => { if (!open) setEditingWp(null); }}>
        <DialogContent className="rounded-none border-[4px] border-black max-w-lg bg-white p-0 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-4 border-b-[3px] border-black bg-blue-600">
            <DialogTitle className="font-serif text-xl font-black text-white">
              EDIT WAJIB PAJAK
            </DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) => {
                if (editingWp) updateMutation.mutate({ id: editingWp.id, data });
              })}
              className="p-4 space-y-4"
            >
              <WpFormFields form={editForm} />
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full rounded-none border-[3px] border-black bg-blue-600 text-white font-mono font-bold no-default-hover-elevate no-default-active-elevate"
                data-testid="button-update-wp"
              >
                {updateMutation.isPending ? "MEMPERBARUI..." : "PERBARUI WAJIB PAJAK"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </BackofficeLayout>
  );
}
