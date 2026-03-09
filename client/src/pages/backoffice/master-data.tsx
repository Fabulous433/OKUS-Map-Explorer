import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import BackofficeLayout from "./layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import type { MasterRekeningPajak } from "@shared/schema";
import { useState } from "react";

function invalidateMasterQueries() {
  queryClient.invalidateQueries({ queryKey: ["/api/master/rekening-pajak"] });
  queryClient.invalidateQueries({ queryKey: ["/api/master/rekening-pajak?includeInactive=true"] });
}

export default function BackofficeMasterData() {
  const { toast } = useToast();
  const { hasRole } = useAuth();
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
        <div className="p-6">
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
      <div className="p-6 space-y-4" data-testid="backoffice-master-data-page">
        <div className="border-b-[3px] border-black pb-4">
          <h1 className="font-serif text-2xl font-black">MASTER DATA</h1>
          <p className="font-mono text-[10px] tracking-widest uppercase text-gray-500">Rekening pajak aktif untuk form operasional</p>
        </div>

        <div className="border-[2px] border-black bg-yellow-50 p-3">
          <p className="font-mono text-xs font-bold text-black">Referensi wilayah disembunyikan dari FE</p>
          <p className="font-mono text-[11px] text-gray-700 mt-1">
            Kecamatan dan kelurahan tetap dipakai sebagai dropdown di form WP/OP, tetapi pengelolaannya dilakukan lewat seed, import, atau admin script backend.
          </p>
        </div>

        <div className="space-y-3 mt-0">
          <div className="grid md:grid-cols-4 gap-2">
            <Input value={rekKode} onChange={(e) => setRekKode(e.target.value)} placeholder="Kode rekening" className="rounded-none border-[2px] border-black font-mono text-sm" />
            <Input value={rekNama} onChange={(e) => setRekNama(e.target.value)} placeholder="Nama rekening" className="rounded-none border-[2px] border-black font-mono text-sm" />
            <Input value={rekJenis} onChange={(e) => setRekJenis(e.target.value)} placeholder="Jenis pajak" className="rounded-none border-[2px] border-black font-mono text-sm" />
            <Button onClick={() => createRekening.mutate()} className="rounded-none border-[2px] border-black font-mono text-xs">
              <Plus className="w-4 h-4 mr-1" />
              Tambah
            </Button>
          </div>
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
        </div>
      </div>
    </BackofficeLayout>
  );
}
