import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Building2, Users, MapPin, DollarSign, TrendingUp, PieChart, Tag, Star, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ObjekPajak, WajibPajak } from "@shared/schema";

export default function DashboardPage() {
  const { data: opList = [], isLoading: opLoading } = useQuery<ObjekPajak[]>({
    queryKey: ["/api/objek-pajak"],
  });

  const { data: wpList = [], isLoading: wpLoading } = useQuery<WajibPajak[]>({
    queryKey: ["/api/wajib-pajak"],
  });

  const isLoading = opLoading || wpLoading;

  const totalPajakBulanan = opList.reduce((sum, op) => sum + (op.pajakBulanan ? Number(op.pajakBulanan) : 0), 0);
  const totalOmsetBulanan = opList.reduce((sum, op) => sum + (op.omsetBulanan ? Number(op.omsetBulanan) : 0), 0);
  const activeOP = opList.filter((op) => op.status === "active").length;
  const activeWP = wpList.filter((wp) => wp.status === "active").length;

  const byJenisPajak = opList.reduce((acc, op) => {
    const key = op.jenisPajak;
    if (!acc[key]) {
      acc[key] = { count: 0, pajak: 0, omset: 0 };
    }
    acc[key].count++;
    acc[key].pajak += op.pajakBulanan ? Number(op.pajakBulanan) : 0;
    acc[key].omset += op.omsetBulanan ? Number(op.omsetBulanan) : 0;
    return acc;
  }, {} as Record<string, { count: number; pajak: number; omset: number }>);

  const byKecamatan = opList.reduce((acc, op) => {
    const key = op.kecamatan || "Tidak Diketahui";
    if (!acc[key]) {
      acc[key] = { count: 0, pajak: 0 };
    }
    acc[key].count++;
    acc[key].pajak += op.pajakBulanan ? Number(op.pajakBulanan) : 0;
    return acc;
  }, {} as Record<string, { count: number; pajak: number }>);

  const topOPByPajak = [...opList]
    .filter((op) => op.pajakBulanan)
    .sort((a, b) => Number(b.pajakBulanan) - Number(a.pajakBulanan))
    .slice(0, 5);

  const topOPByRating = [...opList]
    .filter((op) => op.rating)
    .sort((a, b) => Number(b.rating!) - Number(a.rating!))
    .slice(0, 5);

  const jenisPajakColor = (jenis: string) => {
    if (jenis.includes("Makanan")) return "bg-[#FF6B00]";
    if (jenis.includes("Perhotelan")) return "bg-blue-600";
    if (jenis.includes("Reklame")) return "bg-purple-600";
    if (jenis.includes("Parkir")) return "bg-green-600";
    if (jenis.includes("Hiburan")) return "bg-pink-600";
    return "bg-gray-600";
  };

  const maxPajakByJenis = Math.max(...Object.values(byJenisPajak).map((v) => v.pajak), 1);

  return (
    <div className="min-h-screen bg-white" data-testid="dashboard-page">
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
                <BarChart3 className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-black text-[#FFFF00] leading-none" data-testid="text-page-title">
                  DASHBOARD
                </h1>
                <p className="font-mono text-[10px] text-white/60 tracking-widest uppercase">
                  Ringkasan Pajak Daerah OKU Selatan
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/objek-pajak">
              <Button className="rounded-none border-[3px] border-[#FFFF00] bg-[#FFFF00] text-black font-mono font-bold text-xs no-default-hover-elevate no-default-active-elevate" data-testid="link-op">
                <Building2 className="w-4 h-4 mr-1" /> OBJEK PAJAK
              </Button>
            </Link>
            <Link href="/wajib-pajak">
              <Button className="rounded-none border-[3px] border-[#FF6B00] bg-[#FF6B00] text-white font-mono font-bold text-xs no-default-hover-elevate no-default-active-elevate" data-testid="link-wp">
                <Users className="w-4 h-4 mr-1" /> WAJIB PAJAK
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64" data-testid="loading-dashboard">
            <div className="bg-black border-[4px] border-[#FFFF00] p-6 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-[3px] border-[#FFFF00] border-t-transparent animate-spin" />
              <span className="font-mono text-sm font-bold text-[#FFFF00]">MEMUAT DATA...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-summary">
              <div className="border-[3px] border-black bg-black p-4" data-testid="stat-total-op">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-[#FFFF00]" />
                  <span className="font-mono text-xs text-white/60">TOTAL OP</span>
                </div>
                <div className="font-serif text-3xl font-black text-[#FFFF00]">{opList.length}</div>
                <div className="font-mono text-xs text-white/40">{activeOP} aktif</div>
              </div>
              <div className="border-[3px] border-black bg-[#FF6B00] p-4" data-testid="stat-total-wp">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-white" />
                  <span className="font-mono text-xs text-white/80">TOTAL WP</span>
                </div>
                <div className="font-serif text-3xl font-black text-white">{wpList.length}</div>
                <div className="font-mono text-xs text-white/60">{activeWP} aktif</div>
              </div>
              <div className="border-[3px] border-black bg-[#FFFF00] p-4" data-testid="stat-pajak-bulanan">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-black" />
                  <span className="font-mono text-xs text-black/60">PAJAK/BLN</span>
                </div>
                <div className="font-serif text-2xl font-black text-black">
                  Rp {totalPajakBulanan.toLocaleString("id-ID")}
                </div>
                <div className="font-mono text-xs text-black/50">potensi pajak bulanan</div>
              </div>
              <div className="border-[3px] border-black bg-white p-4" data-testid="stat-omset-bulanan">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-black" />
                  <span className="font-mono text-xs text-black/60">OMSET/BLN</span>
                </div>
                <div className="font-serif text-2xl font-black text-black">
                  Rp {totalOmsetBulanan.toLocaleString("id-ID")}
                </div>
                <div className="font-mono text-xs text-gray-400">total omset bulanan</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border-[3px] border-black" data-testid="chart-by-jenis">
                <div className="bg-black p-3 border-b-[3px] border-[#FFFF00] flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[#FFFF00]" />
                  <h2 className="font-serif text-lg font-black text-[#FFFF00]">PER JENIS PAJAK</h2>
                </div>
                <div className="p-4 space-y-3">
                  {Object.entries(byJenisPajak).map(([jenis, data]) => (
                    <div key={jenis} className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={`rounded-none border-[2px] border-black font-mono text-[10px] text-white ${jenisPajakColor(jenis)}`}>
                          <Tag className="w-3 h-3 mr-1" />
                          {jenis}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-black">{data.count} OP</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-6 bg-gray-100 border-[2px] border-black relative">
                          <div
                            className={`h-full ${jenisPajakColor(jenis)} flex items-center justify-end pr-2`}
                            style={{ width: `${(data.pajak / maxPajakByJenis) * 100}%` }}
                          >
                            {data.pajak > 0 && (
                              <span className="font-mono text-[10px] font-bold text-white whitespace-nowrap">
                                Rp {data.pajak.toLocaleString("id-ID")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-[3px] border-black" data-testid="chart-by-kecamatan">
                <div className="bg-black p-3 border-b-[3px] border-[#FFFF00] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#FFFF00]" />
                  <h2 className="font-serif text-lg font-black text-[#FFFF00]">PER KECAMATAN</h2>
                </div>
                <div className="p-4 space-y-3">
                  {Object.entries(byKecamatan).map(([kec, data]) => (
                    <div key={kec} className="flex items-center justify-between border-[2px] border-black p-3">
                      <div>
                        <div className="font-serif font-black text-sm text-black">{kec}</div>
                        <div className="font-mono text-xs text-gray-500">{data.count} Objek Pajak</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-black">
                          Rp {data.pajak.toLocaleString("id-ID")}
                        </div>
                        <div className="font-mono text-[10px] text-gray-400">/bulan</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border-[3px] border-black" data-testid="top-pajak">
                <div className="bg-[#FF6B00] p-3 border-b-[3px] border-black flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-white" />
                  <h2 className="font-serif text-lg font-black text-white">TOP 5 PAJAK TERTINGGI</h2>
                </div>
                <div className="divide-y-[2px] divide-black">
                  {topOPByPajak.map((op, idx) => (
                    <div key={op.id} className="p-3 flex items-center gap-3" data-testid={`top-pajak-${idx}`}>
                      <div className="w-8 h-8 bg-black border-[2px] border-[#FFFF00] flex items-center justify-center flex-shrink-0">
                        <span className="font-mono text-xs font-bold text-[#FFFF00]">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-serif font-black text-sm text-black truncate">{op.namaObjek}</div>
                        <div className="font-mono text-[10px] text-gray-500">{op.jenisPajak}</div>
                      </div>
                      <div className="font-mono text-sm font-bold text-black whitespace-nowrap">
                        Rp {Number(op.pajakBulanan).toLocaleString("id-ID")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-[3px] border-black" data-testid="top-rating">
                <div className="bg-[#FFFF00] p-3 border-b-[3px] border-black flex items-center gap-2">
                  <Star className="w-5 h-5 text-black fill-black" />
                  <h2 className="font-serif text-lg font-black text-black">TOP 5 RATING TERTINGGI</h2>
                </div>
                <div className="divide-y-[2px] divide-black">
                  {topOPByRating.map((op, idx) => (
                    <div key={op.id} className="p-3 flex items-center gap-3" data-testid={`top-rating-${idx}`}>
                      <div className="w-8 h-8 bg-[#FFFF00] border-[2px] border-black flex items-center justify-center flex-shrink-0">
                        <span className="font-mono text-xs font-bold text-black">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-serif font-black text-sm text-black truncate">{op.namaObjek}</div>
                        <div className="font-mono text-[10px] text-gray-500">{op.jenisPajak}</div>
                      </div>
                      <div className="flex items-center gap-1 bg-[#FFFF00] border-[2px] border-black px-2 py-0.5">
                        <Star className="w-3 h-3 text-black fill-black" />
                        <span className="font-mono text-xs font-bold">{Number(op.rating).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
