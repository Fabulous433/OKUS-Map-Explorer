import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BackofficeLayout from "./layout";

type DashboardJenisRow = {
  jenisPajak: string;
  total: number;
  updated: number;
  pending: number;
  percentage: number;
};

type DashboardSummary = {
  generatedAt: string;
  includeUnverified: boolean;
  filters: {
    summaryWindow: { from: string | null; to: string | null };
    trendWindow: { from: string; to: string; groupBy: "day" | "week" };
  };
  totals: {
    totalWp: number;
    totalOp: number;
    totalUpdated: number;
    totalPending: number;
    overallPercentage: number;
  };
  byJenis: DashboardJenisRow[];
  trend: Array<{
    periodStart: string;
    periodEnd: string;
    createdOp: number;
    verifiedOp: number;
  }>;
};

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

function getShortLabel(jenis: string) {
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
  return map[jenis] ?? jenis.slice(0, 3).toUpperCase();
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BackofficeDashboard() {
  const today = new Date();
  const fromDefault = new Date(today);
  fromDefault.setDate(fromDefault.getDate() - 29);

  const [fromDate, setFromDate] = useState(toDateInputValue(fromDefault));
  const [toDate, setToDate] = useState(toDateInputValue(today));
  const [groupBy, setGroupBy] = useState<"day" | "week">("day");

  const summaryUrl = useMemo(() => {
    const query = new URLSearchParams({
      includeUnverified: "true",
      from: fromDate,
      to: toDate,
      groupBy,
    });
    return `/api/dashboard/summary?${query.toString()}`;
  }, [fromDate, toDate, groupBy]);

  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: [summaryUrl],
  });

  const exportUrl = useMemo(() => {
    const query = new URLSearchParams({
      includeUnverified: "true",
      from: fromDate,
      to: toDate,
      groupBy,
    });
    return `/api/dashboard/summary/export?${query.toString()}`;
  }, [fromDate, toDate, groupBy]);

  const summary = data?.totals ?? {
    totalWp: 0,
    totalOp: 0,
    totalUpdated: 0,
    totalPending: 0,
    overallPercentage: 0,
  };
  const byJenis = data?.byJenis ?? [];
  const trend = data?.trend ?? [];

  return (
    <BackofficeLayout>
      <div className="space-y-6 p-6" data-testid="backoffice-dashboard">
        <div className="border-b-[3px] border-black pb-4">
          <h2 className="font-serif text-2xl font-black" data-testid="text-dashboard-title">
            DASHBOARD PENDATAAN
          </h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Ringkasan + trend periodik langsung dari agregasi server.
          </p>
        </div>

        <Card className="border-[2px] border-black p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1 font-mono text-xs">
                Dari Tanggal
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="h-9 border-[2px] border-black px-2 font-mono text-xs"
                  data-testid="input-dashboard-from-date"
                />
              </label>
              <label className="flex flex-col gap-1 font-mono text-xs">
                Sampai Tanggal
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="h-9 border-[2px] border-black px-2 font-mono text-xs"
                  data-testid="input-dashboard-to-date"
                />
              </label>
              <label className="flex flex-col gap-1 font-mono text-xs">
                Group By
                <select
                  value={groupBy}
                  onChange={(event) => setGroupBy(event.target.value === "week" ? "week" : "day")}
                  className="h-9 border-[2px] border-black px-2 font-mono text-xs"
                  data-testid="select-dashboard-group-by"
                >
                  <option value="day">Harian</option>
                  <option value="week">Mingguan</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-none border-[2px] border-black font-mono text-xs font-bold"
                onClick={() => {
                  window.location.href = exportUrl;
                }}
                data-testid="button-dashboard-export-csv"
              >
                EXPORT CSV
              </Button>
            </div>
          </div>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            Window aktif: {data?.filters.trendWindow.from ?? fromDate} s/d {data?.filters.trendWindow.to ?? toDate} ({groupBy})
          </p>
        </Card>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5" data-testid="summary-stats">
            <Card className="border-[2px] border-black p-4">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Total WP</p>
              <p className="mt-1 font-serif text-3xl font-black">{summary.totalWp}</p>
            </Card>
            <Card className="border-[2px] border-black p-4">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Total OP</p>
              <p className="mt-1 font-serif text-3xl font-black">{summary.totalOp}</p>
            </Card>
            <Card className="border-[2px] border-black p-4">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Sudah Update</p>
              <p className="mt-1 font-serif text-3xl font-black text-green-700">{summary.totalUpdated}</p>
            </Card>
            <Card className="border-[2px] border-black p-4">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Belum Update</p>
              <p className="mt-1 font-serif text-3xl font-black text-orange-600">{summary.totalPending}</p>
            </Card>
            <Card className="border-[2px] border-black p-4">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Overall Progress</p>
              <p className="mt-1 font-serif text-3xl font-black">{summary.overallPercentage}%</p>
              <Progress value={summary.overallPercentage} className="mt-2 h-2" />
            </Card>
          </div>
        )}

        <div className="space-y-3" data-testid="progress-table">
          <h3 className="border-b-[2px] border-black pb-2 font-serif text-lg font-black">PROGRESS PER JENIS PAJAK</h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border-[2px] border-black">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-[2px] border-black">
                    <TableHead className="font-mono text-xs font-bold">Jenis Pajak</TableHead>
                    <TableHead className="font-mono text-xs font-bold text-right">Total</TableHead>
                    <TableHead className="font-mono text-xs font-bold text-right">Updated</TableHead>
                    <TableHead className="font-mono text-xs font-bold text-right">Pending</TableHead>
                    <TableHead className="font-mono text-xs font-bold text-right">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byJenis.map((row) => (
                    <TableRow key={row.jenisPajak} className="border-b border-black/10">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            className="border-0 font-mono text-xs font-bold text-white no-default-hover-elevate no-default-active-elevate"
                            style={{ backgroundColor: JENIS_PAJAK_COLORS[row.jenisPajak] ?? "#111827" }}
                          >
                            {getShortLabel(row.jenisPajak)}
                          </Badge>
                          <span className="font-mono text-xs">{row.jenisPajak}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{row.total}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-green-700">{row.updated}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-orange-600">{row.pending}</TableCell>
                      <TableCell className="w-[180px]">
                        <div className="flex items-center gap-3">
                          <Progress value={row.percentage} className="h-2 flex-1" />
                          <span className="w-10 text-right font-mono text-xs font-bold">{row.percentage}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="space-y-3" data-testid="trend-chart">
          <h3 className="border-b-[2px] border-black pb-2 font-serif text-lg font-black">TREND PERIODIK OP</h3>

          {isLoading ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <Card className="border-[2px] border-black p-4">
              <div className="h-[300px] w-full">
                <ResponsiveContainer>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="2 2" stroke="#11111133" />
                    <XAxis dataKey="periodStart" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="createdOp" name="OP Dibuat" stroke="#FF6B00" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="verifiedOp" name="OP Terverifikasi" stroke="#16A34A" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      </div>
    </BackofficeLayout>
  );
}
