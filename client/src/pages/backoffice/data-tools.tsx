import { useRef } from "react";
import { Download, Upload, Users, Building2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import BackofficeLayout from "./layout";

export default function BackofficeDataTools() {
  const { hasRole } = useAuth();
  const canMutate = hasRole(["admin", "editor"]);
  const { toast } = useToast();
  const wpFileRef = useRef<HTMLInputElement>(null);
  const opFileRef = useRef<HTMLInputElement>(null);

  async function handleImport(entity: "wajib-pajak" | "objek-pajak", file: File) {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/${entity}/import`, { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Gagal", description: result.message, variant: "destructive" });
      } else {
        toast({
          title: "Import Selesai",
          description: `${result.success} berhasil, ${result.failed} gagal dari ${result.total} data`,
        });
        queryClient.invalidateQueries({ queryKey: [`/api/${entity}`] });
      }
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Terjadi kesalahan", variant: "destructive" });
    }
  }

  return (
    <BackofficeLayout>
      <div className="p-4 md:p-6" data-testid="backoffice-data-tools-page">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg shadow-card bg-[#2d3436]">
            <FileSpreadsheet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-sans text-xl font-black md:text-2xl">DATA TOOLS</h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Import &amp; Export CSV</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Wajib Pajak */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-wide">Wajib Pajak</h2>
            </div>
            <input ref={wpFileRef} type="file" accept=".csv" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport("wajib-pajak", file);
              if (wpFileRef.current) wpFileRef.current.value = "";
            }} />
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start font-mono text-xs font-bold"
                onClick={() => window.open("/api/wajib-pajak/export", "_blank")}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              {canMutate && (
                <Button
                  variant="outline"
                  className="w-full justify-start font-mono text-xs font-bold"
                  onClick={() => wpFileRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              )}
            </div>
          </Card>

          {/* Objek Pajak */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-mono text-sm font-bold uppercase tracking-wide">Objek Pajak</h2>
            </div>
            <input ref={opFileRef} type="file" accept=".csv" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport("objek-pajak", file);
              if (opFileRef.current) opFileRef.current.value = "";
            }} />
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start font-mono text-xs font-bold"
                onClick={() => window.open("/api/objek-pajak/export", "_blank")}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              {canMutate && (
                <Button
                  variant="outline"
                  className="w-full justify-start font-mono text-xs font-bold"
                  onClick={() => opFileRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </BackofficeLayout>
  );
}
