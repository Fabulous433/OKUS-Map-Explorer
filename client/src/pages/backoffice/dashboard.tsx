import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { BarChart3, Building2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useIsMobile } from "@/hooks/use-mobile";

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
    validWp: number;
    pendingWp: number;
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
  "PBJT Makanan dan Minuman": "#F2C400",
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

function formatGroupByLabel(groupBy: "day" | "week") {
  return groupBy === "week" ? "Mingguan" : "Harian";
}

function ThemeMobileProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2.5 rounded-full bg-[#dadde2]">
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

function ThemeMobileSummaryCard({
  icon: Icon,
  titleLines,
  value,
  metaLines,
  progressValue,
}: {
  icon: typeof Users;
  titleLines: [string, string];
  value: string;
  metaLines: string[];
  progressValue?: number;
}) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white px-3 py-3 shadow-card">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#f8edc8] text-black">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 flex min-h-[2.9rem] items-center justify-center">
        <p className="text-center font-sans text-[0.78rem] font-black uppercase leading-4 tracking-[0.03em] text-black">
          <span className="block">{titleLines[0]}</span>
          <span className="block">{titleLines[1]}</span>
        </p>
      </div>
      <div className="mt-3 flex min-h-[3.4rem] items-center justify-center">
        <p className="text-center font-sans text-[2rem] font-black leading-none text-black">{value}</p>
      </div>
      <div className={`mt-2 ${metaLines.length > 0 ? "min-h-[2.65rem]" : "min-h-[0.5rem]"}`}>
        {metaLines.map((line) => (
          <p key={line} className="text-center font-sans text-[0.88rem] leading-5 text-black/82">
            {line}
          </p>
        ))}
      </div>
      {typeof progressValue === "number" ? (
        <div className="mt-3 px-1">
          <ThemeMobileProgressBar value={progressValue} color="#f2c400" />
        </div>
      ) : null}
    </div>
  );
}

export default function BackofficeDashboard() {
  const isMobile = useIsMobile();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const today = new Date();
  const fromDefault = new Date(today);
  fromDefault.setDate(fromDefault.getDate() - 29);

  const params = new URLSearchParams(search);
  const [fromDate, setFromDateRaw] = useState(params.get("from") || toDateInputValue(fromDefault));
  const [toDate, setToDateRaw] = useState(params.get("to") || toDateInputValue(today));
  const [groupBy, setGroupByRaw] = useState<"day" | "week">(params.get("groupBy") === "week" ? "week" : "day");

  const syncUrl = useCallback(
    (from: string, to: string, group: "day" | "week") => {
      const query = new URLSearchParams({ from, to, groupBy: group });
      setLocation(`/backoffice?${query.toString()}`, { replace: true });
    },
    [setLocation],
  );

  const setFromDate = useCallback(
    (value: string) => {
      setFromDateRaw(value);
      syncUrl(value, toDate, groupBy);
    },
    [groupBy, syncUrl, toDate],
  );

  const setToDate = useCallback(
    (value: string) => {
      setToDateRaw(value);
      syncUrl(fromDate, value, groupBy);
    },
    [fromDate, groupBy, syncUrl],
  );

  const setGroupBy = useCallback(
    (value: "day" | "week") => {
      setGroupByRaw(value);
      syncUrl(fromDate, toDate, value);
    },
    [fromDate, syncUrl, toDate],
  );

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
    validWp: 0,
    pendingWp: 0,
    totalOp: 0,
    totalUpdated: 0,
    totalPending: 0,
    overallPercentage: 0,
  };
  const byJenis = data?.byJenis ?? [];
  const trend = data?.trend ?? [];

  return (
    <BackofficeLayout>
      <div
        className={isMobile ? "space-y-5 p-4" : "space-y-4 p-4 md:space-y-6 md:p-6"}
        data-testid="backoffice-dashboard"
      >
        {isMobile ? (
          <>
            <div className="space-y-1">
              <h2 className="font-sans text-[2rem] font-black leading-[0.95]" data-testid="text-dashboard-title">
                DASHBOARD PENDATAAN
              </h2>
            </div>

            <Card className="overflow-hidden border-black/10 p-0 shadow-card">
              <div className="h-2 w-full bg-primary" />
              <div className="space-y-4 p-4">
                <div>
                  <p className="font-sans text-lg font-black text-black">Periode Data</p>
                  <p className="mt-1 font-sans text-sm text-black/62">
                    {fromDate} sampai {toDate} · {formatGroupByLabel(groupBy)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="font-sans text-sm font-semibold text-black/82">Dari Tanggal:</span>
                    <input
                      type="date"
                      name="from-date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      className="h-11 rounded-[14px] border border-black/10 bg-background px-3 font-sans text-[0.95rem] text-black shadow-recessed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      data-testid="input-dashboard-from-date"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-sans text-sm font-semibold text-black/82">Sampai Tanggal:</span>
                    <input
                      type="date"
                      name="to-date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      className="h-11 rounded-[14px] border border-black/10 bg-background px-3 font-sans text-[0.95rem] text-black shadow-recessed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      data-testid="input-dashboard-to-date"
                    />
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className="font-sans text-sm font-semibold text-black/82">Group By:</span>
                  <select
                    name="group-by"
                    value={groupBy}
                    onChange={(event) => setGroupBy(event.target.value === "week" ? "week" : "day")}
                    className="h-11 rounded-[14px] border border-black/10 bg-background px-3 font-sans text-[0.95rem] text-black shadow-recessed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    data-testid="select-dashboard-group-by"
                  >
                    <option value="day">Harian</option>
                    <option value="week">Mingguan</option>
                  </select>
                </label>
              </div>
            </Card>

            {isLoading ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-44 w-full rounded-[24px]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3" data-testid="summary-stats">
                <ThemeMobileSummaryCard
                  icon={Users}
                  titleLines={["TOTAL", "WP"]}
                  value={String(summary.totalWp)}
                  metaLines={[`Valid: ${summary.validWp}`, `Invalid: ${summary.pendingWp}`]}
                />
                <ThemeMobileSummaryCard
                  icon={Building2}
                  titleLines={["TOTAL", "OP"]}
                  value={String(summary.totalOp)}
                  metaLines={[`Updated: ${summary.totalUpdated}`, `Pending: ${summary.totalPending}`]}
                />
                <ThemeMobileSummaryCard
                  icon={BarChart3}
                  titleLines={["OVERALL", "PROGRESS"]}
                  value={`${summary.overallPercentage}%`}
                  metaLines={[]}
                  progressValue={summary.overallPercentage}
                />
              </div>
            )}

            <section className="space-y-3" data-testid="progress-table">
              <h3 className="font-sans text-[1.6rem] font-black uppercase leading-none text-black">
                Progress per Jenis Pajak
              </h3>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-24 w-full rounded-[22px]" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {byJenis.map((row) => (
                    <Card key={row.jenisPajak} className="rounded-[22px] border-black/10 px-4 py-4 shadow-card">
                      <p className="font-sans text-[1.02rem] font-black leading-6 text-black">{row.jenisPajak}</p>
                      <div className="mt-3">
                        <ThemeMobileProgressBar
                          value={row.percentage}
                          color={JENIS_PAJAK_COLORS[row.jenisPajak] ?? "#f2c400"}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 font-sans text-[0.94rem] text-black/82">
                        <span>Progress: {row.percentage}%</span>
                        <span>Pending: {row.pending}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <div className="pb-3 md:pb-4">
              <h2 className="font-sans text-xl font-bold md:text-2xl" data-testid="text-dashboard-title">
                DASHBOARD PENDATAAN
              </h2>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground md:text-xs">
                Ringkasan + trend periodik langsung dari agregasi server.
              </p>
            </div>

            <Card className="p-3 md:p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="flex flex-col gap-1 font-mono text-xs">
                    Dari Tanggal
                    <input
                      type="date"
                      name="from-date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      className="h-11 rounded-lg border-none bg-background px-3 font-mono text-xs shadow-recessed focus-visible:outline-none focus-visible:shadow-[var(--shadow-recessed),0_0_0_2px_hsl(var(--accent))]"
                      data-testid="input-dashboard-from-date"
                    />
                  </label>
                  <label className="flex flex-col gap-1 font-mono text-xs">
                    Sampai Tanggal
                    <input
                      type="date"
                      name="to-date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      className="h-11 rounded-lg border-none bg-background px-3 font-mono text-xs shadow-recessed focus-visible:outline-none focus-visible:shadow-[var(--shadow-recessed),0_0_0_2px_hsl(var(--accent))]"
                      data-testid="input-dashboard-to-date"
                    />
                  </label>
                  <label className="flex flex-col gap-1 font-mono text-xs">
                    Group By
                    <select
                      name="group-by"
                      value={groupBy}
                      onChange={(event) => setGroupBy(event.target.value === "week" ? "week" : "day")}
                      className="h-11 rounded-lg border-none bg-background px-3 font-mono text-xs shadow-recessed focus-visible:outline-none focus-visible:shadow-[var(--shadow-recessed),0_0_0_2px_hsl(var(--accent))]"
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
                    className="w-full font-mono text-xs font-bold md:w-auto"
                    onClick={() => {
                      window.location.href = exportUrl;
                    }}
                    data-testid="button-dashboard-export-csv"
                  >
                    EXPORT CSV
                  </Button>
                </div>
              </div>
              <p className="mt-2 font-mono text-[11px] leading-5 text-muted-foreground">
                Window aktif: {data?.filters.trendWindow.from ?? fromDate} s/d {data?.filters.trendWindow.to ?? toDate} ({groupBy})
              </p>
            </Card>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <Skeleton key={item} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4" data-testid="summary-stats">
                <Card className="p-3 md:p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Total WP</p>
                  <p className="mt-2 font-sans text-2xl font-bold md:text-3xl" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {summary.totalWp}
                  </p>
                </Card>
                <Card className="p-3 md:p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Total OP</p>
                  <p className="mt-2 font-sans text-2xl font-bold md:text-3xl" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {summary.totalOp}
                  </p>
                </Card>
                <Card className="p-3 md:p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Sudah Update</p>
                  <p className="mt-2 font-sans text-2xl font-bold text-green-700 md:text-3xl" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {summary.totalUpdated}
                  </p>
                </Card>
                <Card className="p-3 md:p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Belum Update</p>
                  <p className="mt-2 font-sans text-2xl font-bold text-orange-600 md:text-3xl" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {summary.totalPending}
                  </p>
                </Card>
                <Card className="p-3 md:p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Overall Progress</p>
                  <p className="mt-2 font-sans text-2xl font-bold md:text-3xl" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {summary.overallPercentage}%
                  </p>
                  <Progress value={summary.overallPercentage} className="mt-2 h-2" />
                </Card>
              </div>
            )}

            <div className="space-y-3" data-testid="progress-table">
              <h3 className="pb-2 font-sans text-lg font-bold">PROGRESS PER JENIS PAJAK</h3>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border">
                        <TableHead>Jenis Pajak</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Updated</TableHead>
                        <TableHead className="text-right">Pending</TableHead>
                        <TableHead className="text-right">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byJenis.map((row) => (
                        <TableRow key={row.jenisPajak} className="border-b border-black/10">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge
                                className="border-0 font-mono text-xs font-bold text-white"
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
              <h3 className="pb-2 font-sans text-lg font-bold">TREND PERIODIK OP</h3>

              {isLoading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (
                <Card className="p-3 md:p-4">
                  <div className="relative overflow-hidden rounded-lg bg-[#1a1a2e] p-4 shadow-recessed">
                    <div
                      className="pointer-events-none absolute inset-0 z-10"
                      style={{
                        background: "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.15) 50%)",
                        backgroundSize: "100% 4px",
                      }}
                      aria-hidden="true"
                    />
                    <div className="relative z-0 h-[240px] w-full md:h-[300px]">
                      <ResponsiveContainer>
                        <LineChart data={trend}>
                          <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="periodStart" tick={{ fontSize: 11, fill: "#a8b2d1" }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#a8b2d1" }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="createdOp" name="OP Dibuat" stroke="#ff4757" strokeWidth={3} dot={false} />
                          <Line type="monotone" dataKey="verifiedOp" name="OP Terverifikasi" stroke="#22c55e" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </BackofficeLayout>
  );
}
