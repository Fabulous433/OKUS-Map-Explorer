import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import BackofficeLayout from "./layout";
import type { ObjekPajak, WajibPajakWithBadanUsaha } from "@shared/schema";
import { JENIS_PAJAK_OPTIONS } from "@shared/schema";

const JENIS_PAJAK_COLORS: Record<string, string> = {
  "PBJT Makanan dan Minuman": "#FF6B00",
  "PBJT Jasa Perhotelan": "#2563EB",
  "PBJT Jasa Parkir": "#16A34A",
  "PBJT Jasa Kesenian dan Hiburan": "#DB2777",
  "PBJT Tenaga Listrik": "#EAB308",
  "Pajak Reklame": "#9333EA",
  "Pajak Air Tanah": "#0891B2",
  "Pajak Sarang Burung Walet": "#78716C",
  "Pajak MBLB": "#6B7280",
};

function getShortLabel(jenis: string): string {
  const map: Record<string, string> = {
    "PBJT Makanan dan Minuman": "MKN",
    "PBJT Jasa Perhotelan": "HTL",
    "PBJT Jasa Parkir": "PKR",
    "PBJT Jasa Kesenian dan Hiburan": "HBR",
    "PBJT Tenaga Listrik": "LTR",
    "Pajak Reklame": "RKL",
    "Pajak Air Tanah": "AIR",
    "Pajak Sarang Burung Walet": "WLT",
    "Pajak MBLB": "MBLB",
  };
  return map[jenis] || jenis.substring(0, 3).toUpperCase();
}

function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
}

export default function BackofficeDashboard() {
  const [expandedJenis, setExpandedJenis] = useState<string | null>(null);

  const { data: opList = [], isLoading: opLoading } = useQuery<ObjekPajak[]>({
    queryKey: ["/api/objek-pajak"],
  });

  const { data: wpList = [], isLoading: wpLoading } = useQuery<WajibPajakWithBadanUsaha[]>({
    queryKey: ["/api/wajib-pajak"],
  });

  const isLoading = opLoading || wpLoading;

  const wpMap = new Map<number, WajibPajakWithBadanUsaha>();
  wpList.forEach((wp) => wpMap.set(wp.id, wp));

  const jenisStats = JENIS_PAJAK_OPTIONS.map((jenis) => {
    const ops = opList.filter((op) => op.jenisPajak === jenis);
    const total = ops.length;
    const updated = ops.filter((op) => op.detailPajak !== null && op.detailPajak !== undefined).length;
    const pending = total - updated;
    const percentage = total > 0 ? Math.round((updated / total) * 100) : 0;
    return { jenis, ops, total, updated, pending, percentage };
  });

  const totalOP = opList.length;
  const totalUpdated = opList.filter((op) => op.detailPajak !== null && op.detailPajak !== undefined).length;
  const totalPending = totalOP - totalUpdated;
  const overallPercentage = totalOP > 0 ? Math.round((totalUpdated / totalOP) * 100) : 0;

  const toggleExpand = (jenis: string) => {
    setExpandedJenis(expandedJenis === jenis ? null : jenis);
  };

  return (
    <BackofficeLayout>
      <div className="p-6 space-y-6" data-testid="backoffice-dashboard">
        <div className="border-b-[3px] border-black pb-4">
          <h2 className="font-serif text-2xl font-black" data-testid="text-dashboard-title">
            DASHBOARD PENDATAAN
          </h2>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            Progress pendataan objek pajak per jenis pajak
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="summary-stats">
            <Card className="p-4 border-[2px] border-black">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide">Total OP</p>
              <p className="font-serif text-3xl font-black mt-1" data-testid="text-total-op">{totalOP}</p>
            </Card>
            <Card className="p-4 border-[2px] border-black">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide">Sudah Update</p>
              <p className="font-serif text-3xl font-black mt-1 text-green-700" data-testid="text-total-updated">{totalUpdated}</p>
            </Card>
            <Card className="p-4 border-[2px] border-black">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide">Belum Update</p>
              <p className="font-serif text-3xl font-black mt-1 text-orange-600" data-testid="text-total-pending">{totalPending}</p>
            </Card>
            <Card className="p-4 border-[2px] border-black">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide">Overall Progress</p>
              <p className="font-serif text-3xl font-black mt-1" data-testid="text-overall-percentage">{overallPercentage}%</p>
              <Progress value={overallPercentage} className="mt-2 h-2" />
            </Card>
          </div>
        )}

        <div className="space-y-3" data-testid="progress-table">
          <h3 className="font-serif text-lg font-black border-b-[2px] border-black pb-2">
            PROGRESS PER JENIS PAJAK
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            jenisStats.map(({ jenis, total, updated, pending, percentage, ops }) => (
              <div key={jenis} className="border-[2px] border-black rounded-md overflow-hidden" data-testid={`progress-row-${getShortLabel(jenis)}`}>
                <button
                  onClick={() => toggleExpand(jenis)}
                  className="w-full text-left p-4 flex items-center gap-4 bg-white hover:bg-gray-50 transition-colors"
                  data-testid={`button-expand-${getShortLabel(jenis)}`}
                >
                  <Badge
                    className="font-mono text-xs font-bold text-white border-0 no-default-hover-elevate no-default-active-elevate"
                    style={{ backgroundColor: JENIS_PAJAK_COLORS[jenis] || "#6B7280" }}
                  >
                    {getShortLabel(jenis)}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-bold truncate">{jenis}</p>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{total} total</span>
                      <span className="font-mono text-xs text-green-700">{updated} sudah update</span>
                      <span className="font-mono text-xs text-orange-600">{pending} belum update</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-32 hidden sm:block">
                      <Progress value={percentage} className="h-2" />
                    </div>
                    <span className="font-mono text-sm font-bold w-12 text-right">{percentage}%</span>
                    {expandedJenis === jenis ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expandedJenis === jenis && (
                  <div className="border-t-[2px] border-black overflow-x-auto" data-testid={`table-${getShortLabel(jenis)}`}>
                    {ops.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="font-mono text-sm text-muted-foreground">Belum ada objek pajak untuk jenis ini</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b-[2px] border-black">
                            <TableHead className="font-mono text-xs font-bold">NOPD</TableHead>
                            <TableHead className="font-mono text-xs font-bold">Nama Objek</TableHead>
                            <TableHead className="font-mono text-xs font-bold">Alamat</TableHead>
                            <TableHead className="font-mono text-xs font-bold">Kecamatan</TableHead>
                            <TableHead className="font-mono text-xs font-bold text-right">Tarif</TableHead>
                            <TableHead className="font-mono text-xs font-bold text-right">Pajak Bulanan</TableHead>
                            <TableHead className="font-mono text-xs font-bold text-center">Status</TableHead>
                            <TableHead className="font-mono text-xs font-bold text-center">Detail</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ops.map((op) => {
                            const hasDetail = op.detailPajak !== null && op.detailPajak !== undefined;
                            const wp = op.wpId ? wpMap.get(op.wpId) : null;
                            return (
                              <TableRow
                                key={op.id}
                                className={`border-b border-black/10 ${hasDetail ? "bg-green-50/50" : "bg-orange-50/50"}`}
                                data-testid={`row-op-${op.id}`}
                              >
                                <TableCell className="font-mono text-xs">{op.nopd}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-mono text-xs font-bold">{op.namaObjek}</p>
                                    {wp && (
                                      <p className="font-mono text-[10px] text-muted-foreground">WP: {wp.displayName}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs max-w-[200px] truncate">{op.alamat}</TableCell>
                                <TableCell className="font-mono text-xs">{op.kecamatan || "-"}</TableCell>
                                <TableCell className="font-mono text-xs text-right">{op.tarifPersen ? `${op.tarifPersen}%` : "-"}</TableCell>
                                <TableCell className="font-mono text-xs text-right">{formatCurrency(op.pajakBulanan)}</TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant={op.status === "active" ? "default" : "secondary"}
                                    className="font-mono text-[10px]"
                                  >
                                    {op.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasDetail ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" data-testid={`icon-updated-${op.id}`} />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-orange-500 mx-auto" data-testid={`icon-pending-${op.id}`} />
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}

