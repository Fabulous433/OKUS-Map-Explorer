import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import BackofficeLayout from "./layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MasterKecamatan, MasterKelurahan, MasterRekeningPajak } from "@shared/schema";

function invalidateMasterQueries() {
  queryClient.invalidateQueries({ queryKey: ["/api/master/kecamatan"] });
  queryClient.invalidateQueries({ queryKey: ["/api/master/kelurahan"] });
  queryClient.invalidateQueries({ queryKey: ["/api/master/rekening-pajak"] });
  queryClient.invalidateQueries({ queryKey: ["/api/master/rekening-pajak?includeInactive=true"] });
}

export default function BackofficeMasterData() {
  const { toast } = useToast();
  const [kecNama, setKecNama] = useState("");
  const [kecKode, setKecKode] = useState("");
  const [kelNama, setKelNama] = useState("");
  const [kelKode, setKelKode] = useState("");
  const [kelKodeKec, setKelKodeKec] = useState("");
  const [rekKode, setRekKode] = useState("");
  const [rekNama, setRekNama] = useState("");
  const [rekJenis, setRekJenis] = useState("");

  const { data: kecamatanList = [] } = useQuery<MasterKecamatan[]>({
    queryKey: ["/api/master/kecamatan"],
  });
  const { data: kelurahanList = [] } = useQuery<MasterKelurahan[]>({
    queryKey: ["/api/master/kelurahan"],
  });
  const { data: rekeningList = [] } = useQuery<MasterRekeningPajak[]>({
    queryKey: ["/api/master/rekening-pajak?includeInactive=true"],
  });

  const kecByKode = useMemo(
    () => new Map(kecamatanList.map((item) => [item.cpmKodeKec, item.cpmKecamatan])),
    [kecamatanList],
  );

  const createKecamatan = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/master/kecamatan", {
        cpmKecamatan: kecNama,
        cpmKodeKec: kecKode,
      });
      return res.json();
    },
    onSuccess: () => {
      setKecNama("");
      setKecKode("");
      invalidateMasterQueries();
      toast({ title: "Berhasil", description: "Kecamatan ditambahkan" });
    },
    onError: (error: Error) => toast({ title: "Gagal", description: error.message, variant: "destructive" }),
  });

  const createKelurahan = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/master/kelurahan", {
        cpmKelurahan: kelNama,
        cpmKodeKec: kelKodeKec,
        cpmKodeKel: kelKode,
      });
      return res.json();
    },
    onSuccess: () => {
      setKelNama("");
      setKelKode("");
      invalidateMasterQueries();
      toast({ title: "Berhasil", description: "Kelurahan ditambahkan" });
    },
    onError: (error: Error) => toast({ title: "Gagal", description: error.message, variant: "destructive" }),
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

  const deleteKecamatan = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/master/kecamatan/${id}`);
      invalidateMasterQueries();
      toast({ title: "Berhasil", description: "Kecamatan dihapus" });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

  const deleteKelurahan = async (id: string) => {
    try {
      await apiRequest("DELETE", `/api/master/kelurahan/${id}`);
      invalidateMasterQueries();
      toast({ title: "Berhasil", description: "Kelurahan dihapus" });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    }
  };

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

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-4" data-testid="backoffice-master-data-page">
        <div className="border-b-[3px] border-black pb-4">
          <h1 className="font-serif text-2xl font-black">MASTER DATA</h1>
          <p className="font-mono text-[10px] tracking-widest uppercase text-gray-500">Rekening, Kecamatan, Kelurahan</p>
        </div>

        <Tabs defaultValue="rekening" className="space-y-4">
          <TabsList className="rounded-none border-[2px] border-black bg-white h-auto p-1">
            <TabsTrigger value="rekening" className="rounded-none font-mono text-xs data-[state=active]:bg-black data-[state=active]:text-[#FFFF00]">REKENING</TabsTrigger>
            <TabsTrigger value="kecamatan" className="rounded-none font-mono text-xs data-[state=active]:bg-black data-[state=active]:text-[#FFFF00]">KECAMATAN</TabsTrigger>
            <TabsTrigger value="kelurahan" className="rounded-none font-mono text-xs data-[state=active]:bg-black data-[state=active]:text-[#FFFF00]">KELURAHAN</TabsTrigger>
          </TabsList>

          <TabsContent value="rekening" className="space-y-3 mt-0">
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
          </TabsContent>

          <TabsContent value="kecamatan" className="space-y-3 mt-0">
            <div className="grid md:grid-cols-3 gap-2">
              <Input value={kecKode} onChange={(e) => setKecKode(e.target.value)} placeholder="Kode kecamatan" className="rounded-none border-[2px] border-black font-mono text-sm" />
              <Input value={kecNama} onChange={(e) => setKecNama(e.target.value)} placeholder="Nama kecamatan" className="rounded-none border-[2px] border-black font-mono text-sm" />
              <Button onClick={() => createKecamatan.mutate()} className="rounded-none border-[2px] border-black font-mono text-xs">
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
                    <TableHead className="text-[#FFFF00] font-mono text-xs text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kecamatanList.map((item) => (
                    <TableRow key={item.cpmKecId}>
                      <TableCell className="font-mono text-xs">{item.cpmKodeKec}</TableCell>
                      <TableCell className="font-mono text-xs">{item.cpmKecamatan}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="rounded-none text-red-600" onClick={() => deleteKecamatan(item.cpmKecId)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="kelurahan" className="space-y-3 mt-0">
            <div className="grid md:grid-cols-4 gap-2">
              <Select value={kelKodeKec} onValueChange={setKelKodeKec}>
                <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-xs">
                  <SelectValue placeholder="Pilih kecamatan" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-[2px] border-black">
                  {kecamatanList.map((kec) => (
                    <SelectItem key={kec.cpmKecId} value={kec.cpmKodeKec}>
                      {kec.cpmKodeKec} - {kec.cpmKecamatan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={kelKode} onChange={(e) => setKelKode(e.target.value)} placeholder="Kode kelurahan" className="rounded-none border-[2px] border-black font-mono text-sm" />
              <Input value={kelNama} onChange={(e) => setKelNama(e.target.value)} placeholder="Nama kelurahan" className="rounded-none border-[2px] border-black font-mono text-sm" />
              <Button onClick={() => createKelurahan.mutate()} className="rounded-none border-[2px] border-black font-mono text-xs">
                <Plus className="w-4 h-4 mr-1" />
                Tambah
              </Button>
            </div>
            <div className="border-[2px] border-black overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-black">
                    <TableHead className="text-[#FFFF00] font-mono text-xs">Kode Kec</TableHead>
                    <TableHead className="text-[#FFFF00] font-mono text-xs">Kecamatan</TableHead>
                    <TableHead className="text-[#FFFF00] font-mono text-xs">Kode Kel</TableHead>
                    <TableHead className="text-[#FFFF00] font-mono text-xs">Nama Kelurahan</TableHead>
                    <TableHead className="text-[#FFFF00] font-mono text-xs text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kelurahanList.map((item) => (
                    <TableRow key={item.cpmKelId}>
                      <TableCell className="font-mono text-xs">{item.cpmKodeKec}</TableCell>
                      <TableCell className="font-mono text-xs">{kecByKode.get(item.cpmKodeKec) || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{item.cpmKodeKel}</TableCell>
                      <TableCell className="font-mono text-xs">{item.cpmKelurahan}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="rounded-none text-red-600" onClick={() => deleteKelurahan(item.cpmKelId)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </BackofficeLayout>
  );
}
