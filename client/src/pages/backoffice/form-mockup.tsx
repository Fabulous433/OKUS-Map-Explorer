import {
 Building2,
 CheckCircle2,
 Gauge,
 MapPin,
 Sparkles,
 Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackofficeLayout from "./layout";

function MockupCard({
 title,
 subtitle,
 icon: Icon,
 accent,
 children,
}: {
 title: string;
 subtitle: string;
 icon: React.ComponentType<{ className?: string }>;
 accent: string;
 children: React.ReactNode;
}) {
 return (
 <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-card">
 <div className={`absolute inset-x-0 top-0 h-1.5 ${accent}`} />
 <div className="border-b border-black/10 bg-gradient-to-r from-white to-gray-50 p-5">
 <div className="flex items-center gap-3">
 <div className={`rounded-xl border-2 border-black p-2.5 ${accent}`}>
 <Icon className="h-5 w-5 text-white" />
 </div>
 <div>
 <h3 className="font-sans text-xl font-black text-black">{title}</h3>
 <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-600">{subtitle}</p>
 </div>
 </div>
 </div>
 <div className="p-5 md:p-6">{children}</div>
 </div>
 );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
 return (
 <label className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-gray-700">
 {children}
 </label>
 );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
 return (
 <div className="mb-3 flex items-center gap-2">
 <Icon className="h-4 w-4 text-gray-800" />
 <h4 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-gray-800">{title}</h4>
 </div>
 );
}

function WpFormMockup() {
 return (
 <MockupCard
 title="Form Wajib Pajak (WP)"
 subtitle="Identity + Contact + Geo"
 icon={Users}
 accent="bg-primary"
 >
 <div className="space-y-5">
 <section className="rounded-xl border border-black/10 bg-gray-50 p-4">
 <SectionTitle icon={Sparkles} title="Data Utama" />
 <div className="grid gap-3 md:grid-cols-2">
 <div>
 <FieldLabel>NPWPD</FieldLabel>
 <Input defaultValue="1678010004012" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Jenis Pajak</FieldLabel>
 <Input defaultValue="PBJT Makanan dan Minuman" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Nama Wajib Pajak</FieldLabel>
 <Input defaultValue="PT Kuliner Sriwijaya" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Nama Usaha</FieldLabel>
 <Input defaultValue="RM Pindang Sedap Rasa" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 </div>
 </section>

 <section className="rounded-xl border border-black/10 bg-gray-50 p-4">
 <SectionTitle icon={CheckCircle2} title="Kontak & Lokasi" />
 <div className="grid gap-3 md:grid-cols-2">
 <div>
 <FieldLabel>Telepon</FieldLabel>
 <Input defaultValue="0812-7000-8899" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Email</FieldLabel>
 <Input defaultValue="admin@kulinersriwijaya.id" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div className="md:col-span-2">
 <FieldLabel>Alamat</FieldLabel>
 <Input defaultValue="Jl. Muaradua No. 21, Kec. Muaradua, OKU Selatan" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Latitude</FieldLabel>
 <Input defaultValue="-4.871923" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Longitude</FieldLabel>
 <Input defaultValue="104.007811" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 </div>
 </section>

 <div className="flex flex-wrap items-center gap-2">
 <Badge className="rounded-full border border-black bg-primary/10 text-primary">
 Draft
 </Badge>
 <Button className="h-10 rounded-xl border-2 border-black bg-primary px-5 font-mono font-bold text-white">
 Simpan WP
 </Button>
 <Button variant="outline" className="h-10 rounded-xl border-2 border-black px-5 font-mono font-bold">
 Validasi Data
 </Button>
 </div>
 </div>
 </MockupCard>
 );
}

function OpFormMockup() {
 return (
 <MockupCard
 title="Form Objek Pajak (OP)"
 subtitle="Object + Tax Detail + Mapping"
 icon={Building2}
 accent="bg-[#2d3436]"
 >
 <div className="space-y-5">
 <section className="rounded-xl border border-black/10 bg-gray-50 p-4">
 <SectionTitle icon={Gauge} title="Data Objek & Pajak" />
 <div className="grid gap-3 md:grid-cols-2">
 <div>
 <FieldLabel>NOPD</FieldLabel>
 <Input defaultValue="1678010209001" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Wajib Pajak</FieldLabel>
 <Input defaultValue="PT Kuliner Sriwijaya" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Nama Objek</FieldLabel>
 <Input defaultValue="Cabang Muaradua Timur" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Jenis Pajak</FieldLabel>
 <Input defaultValue="PBJT Makanan dan Minuman" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Omzet Bulanan</FieldLabel>
 <Input defaultValue="120000000" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Pajak Bulanan</FieldLabel>
 <Input defaultValue="12000000" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 </div>
 </section>

 <section className="rounded-xl border border-black/10 bg-gray-50 p-4">
 <SectionTitle icon={MapPin} title="Geolokasi & Status" />
 <div className="grid gap-3 md:grid-cols-2">
 <div className="md:col-span-2">
 <FieldLabel>Alamat Objek</FieldLabel>
 <Input defaultValue="Jl. Veteran No. 12, Kec. Muaradua, OKU Selatan" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Latitude</FieldLabel>
 <Input defaultValue="-4.874321" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 <div>
 <FieldLabel>Longitude</FieldLabel>
 <Input defaultValue="104.011991" readOnly className="h-10 border-black/30 bg-white" />
 </div>
 </div>
 </section>

 <div className="flex flex-wrap items-center gap-2">
 <Badge className="rounded-full border border-black bg-primary text-black">
 Active
 </Badge>
 <Button className="h-10 rounded-xl border-2 border-primary/30 bg-[#2d3436] px-5 font-mono font-bold text-white">
 Simpan OP
 </Button>
 <Button variant="outline" className="h-10 rounded-xl border-2 border-black px-5 font-mono font-bold">
 Lihat Titik Peta
 </Button>
 </div>
 </div>
 </MockupCard>
 );
}

export default function BackofficeFormMockup() {
 return (
 <BackofficeLayout>
 <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_0%,#FFF2E8_0%,#F7F7F7_48%,#FFFFFF_100%)] p-4 md:p-8">
 <div className="pointer-events-none absolute -top-16 right-10 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
 <div className="pointer-events-none absolute bottom-0 left-0 h-52 w-52 rounded-full bg-yellow-300/20 blur-3xl" />

 <div className="mx-auto max-w-7xl space-y-6" data-testid="backoffice-form-mockup-page">
 <header className="rounded-2xl border-2 border-black bg-white p-5 shadow-card md:p-6">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-gray-500">UI Mockup Preview</p>
 <h1 className="font-sans text-2xl font-black text-black md:text-3xl">Form WP dan OP</h1>
 <p className="mt-1 max-w-2xl font-mono text-xs text-gray-600">
 Konsep layout modern untuk input data pajak daerah dengan fokus keterbacaan, grouping field, dan CTA yang jelas.
 </p>
 </div>
 <Badge className="rounded-full border-2 border-black bg-primary px-4 py-1 text-black">
 Mockup Only
 </Badge>
 </div>
 </header>

 <Tabs defaultValue="wp" className="space-y-4">
 <TabsList className="h-auto gap-2 rounded-xl border-2 border-black bg-white p-1.5">
 <TabsTrigger
 value="wp"
 className="rounded-lg border border-transparent px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] data-[state=active]:border-black data-[state=active]:bg-primary data-[state=active]:text-white"
 >
 Wajib Pajak
 </TabsTrigger>
 <TabsTrigger
 value="op"
 className="rounded-lg border border-transparent px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] data-[state=active]:border-black data-[state=active]:bg-[#2d3436] data-[state=active]:text-white"
 >
 Objek Pajak
 </TabsTrigger>
 </TabsList>

 <TabsContent value="wp" className="mt-0">
 <WpFormMockup />
 </TabsContent>
 <TabsContent value="op" className="mt-0">
 <OpFormMockup />
 </TabsContent>
 </Tabs>
 </div>
 </div>
 </BackofficeLayout>
 );
}
