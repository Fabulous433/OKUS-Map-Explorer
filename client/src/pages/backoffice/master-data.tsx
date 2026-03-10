import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import BackofficeLayout from "./layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MasterRekeningPajak } from "@shared/schema";
import { useState } from "react";

function invalidateMasterQueries() {
  queryClient.invalidateQueries({ queryKey: ["/api/master/rekening-pajak"] });
  queryClient.invalidateQueries({ queryKey: ["/api/master/rekening-pajak?includeInactive=true"] });
}

export default function BackofficeMasterData() {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const isMobile = useIsMobile();
  const isAdmin = hasRole(["admin"]);
  const [rekKode, setRekKode] = useState("");
  const [rekNama, setRekNama] = useState("");
  const [rekJenis, setRekJenis] = useState("");

  const { data: rekeningList = [] } = useQuery<MasterRekeningPajak[]>({
    queryKey: ["/api/master/rekening-pajak?includeInactive=true"],
  });

  const createRekening = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/master/rekening-pajak", {
        kodeRekening: rekKode,
        namaRekening: rekNama,
        jenisPajak: rekJenis,
        isActive: true,
      });
      return res.json();
    },
    onSuccess: () => {
      setRekKode("");
      setRekNama("");
      setRekJenis("");
      invalidateMasterQueries();
      toast({ title: "Berhasil", description: "Rekening pajak ditambahkan" });
    },
    onError: (error: Error) => toast({ title: "Gagal", description: error.message, variant: "destructive" }),
  });

  const deleteRekening = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/master/rekening-pajak/${id}`);
      invalidateMasterQueries();
      toast({ title: "Berhasil", description: "Rekening pajak dihapus" });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  const toggleRekening = async (rekening: MasterRekeningPajak) => {
    try {
      await apiRequest("PATCH", `/api/master/rekening-pajak/${rekening.id}`, {
        isActive: !rekening.isActive,
      });
      invalidateMasterQueries();
      toast({ title: "Berhasil", description: "Status rekening diperbarui" });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  if (!isAdmin) {
    return (
      <BackofficeLayout>
        <div className="p-4 md:p-6">
          <div className="border-[3px] border-black bg-white p-4">
            <h1 className="font-serif text-xl font-black">AKSES DITOLAK</h1>
            <p className="font-mono text-xs mt-1">
              Halaman Master Data hanya tersedia untuk role admin.
            </p>
          </div>
        </div>
      </BackofficeLayout>
    );
  }

  return (
    <BackofficeLayout>
      <div className="space-y-4 p-4 md:p-6" data-testid="backoffice-master-data-page">
        <div className="border-b-[3px] border-black pb-4">
          <h1 className="font-serif text-xl font-black md:text-2xl">MASTER DATA</h1>
          <p className="font-mono text-[10px] tracking-widest uppercase text-gray-500">Rekening pajak aktif untuk form operasional</p>
        </div>

        <div className="border-[2px] border-black bg-yellow-50 p-3">
          <p className="font-mono text-xs font-bold text-black">Referensi wilayah disembunyikan dari FE</p>
          <p className="font-mono text-[11px] text-gray-700 mt-1">
            Kecamatan dan kelurahan tetap dipakai sebagai dropdown di form WP/OP, tetapi pengelolaannya dilakukan lewat seed, import, atau admin script backend.
          </p>
        </div>

        <div className="space-y-3 mt-0">
          <div className="grid gap-2 md:grid-cols-4">
            <Input value={rekKode} onChange={(e) => setRekKode(e.target.value)} placeholder="Kode rekening" className="rounded-none border-[2px] border-black font-mono text-sm" />
            <Input value={rekNama} onChange={(e) => setRekNama(e.target.value)} placeholder="Nama rekening" className="rounded-none border-[2px] border-black font-mono text-sm" />
            <Input value={rekJenis} onChange={(e) => setRekJenis(e.target.value)} placeholder="Jenis pajak" className="rounded-none border-[2px] border-black font-mono text-sm" />
            <Button onClick={() => createRekening.mutate()} className="w-full rounded-none border-[2px] border-black font-mono text-xs md:w-auto">
              <Plus className="w-4 h-4 mr-1" />
              Tambah
            </Button>
          </div>
          {isMobile ? (
            <div className="space-y-3">
              {rekeningList.map((item) => (
                <article key={item.id} className="border-[2px] border-black bg-white p-3 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">{item.kodeRekening}</p>
                      <p className="mt-1 font-mono text-sm font-bold">{item.namaRekening}</p>
                    </div>
                    <span className={`inline-flex rounded-none border-[2px] px-2 py-1 font-mono text-[10px] font-bold ${item.isActive ? "border-green-700 bg-green-100 text-green-800" : "border-gray-400 bg-gray-100 text-gray-600"}`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Jenis Pajak</p>
                    <p className="mt-1 font-mono text-xs">{item.jenisPajak}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none border-[2px] border-black font-mono text-[11px] font-bold"
                      onClick={() => toggleRekening(item)}
                    >
                      <Save className="mr-2 h-3.5 w-3.5" />
                      Toggle
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none border-[2px] border-red-600 font-mono text-[11px] font-bold text-red-600"
                      onClick={() => deleteRekening(item.id)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Hapus
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border-[2px] border-black overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-black">
                    <TableHead className="text-[#FFFF00] font-mono text-xs">Kode</TableHead>
                    <TableHead className="text-[#FFFF00] font-mono text-xs">Nama</TableHead>
                    <TableHead className="text-[#FFFF00] font-mono text-xs">Jenis</TableHead>
                    <TableHead className="text-[#FFFF00] font-mono text-xs">Aktif</TableHead>
                    <TableHead className="text-[#FFFF00] font-mono text-xs text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rekeningList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.kodeRekening}</TableCell>
                      <TableCell className="font-mono text-xs">{item.namaRekening}</TableCell>
                      <TableCell className="font-mono text-xs">{item.jenisPajak}</TableCell>
                      <TableCell className="font-mono text-xs">{item.isActive ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="outline" className="rounded-none border-[2px] border-black" onClick={() => toggleRekening(item)}>
                            <Save className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="rounded-none text-red-600" onClick={() => deleteRekening(item.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>
    </BackofficeLayout>
  );
}
