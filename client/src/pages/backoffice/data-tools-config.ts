import { Building2, Download, Upload, Users, type LucideIcon } from "lucide-react";

export type DataToolsEntity = "wajib-pajak" | "objek-pajak";
export type DataToolsActionKind = "export" | "import" | "preview" | "sample";
export type DataToolsGroupTone = "internal" | "sample";

export type DataToolsActionConfig = {
  kind: DataToolsActionKind;
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
};

export type DataToolsGroupConfig = {
  title: string;
  tone: DataToolsGroupTone;
  description: string;
  actions: DataToolsActionConfig[];
};

export type DataToolsEntityConfig = {
  entity: DataToolsEntity;
  title: string;
  icon: LucideIcon;
  sampleHref: string;
  groups: DataToolsGroupConfig[];
};

export const DATA_TOOLS_ENTITY_CONFIG: DataToolsEntityConfig[] = [
  {
    entity: "wajib-pajak",
    title: "Wajib Pajak",
    icon: Users,
    sampleHref: "/api/data-tools/samples/wp",
    groups: [
      {
        title: "Format Internal",
        tone: "internal",
        description: "Dipakai untuk export compact dan import roundtrip kontrak project saat ini.",
        actions: [
          {
            kind: "export",
            label: "Export XLSX Compact",
            description: "Subjek tunggal mengikuti peran WP + kolom lampiran.",
            icon: Download,
            href: "/api/wajib-pajak/export",
          },
          {
            kind: "import",
            label: "Pilih File Excel",
            description: "Pilih file Excel dulu, lihat preview sheet lokal, lalu lanjut preview validasi atau tambah/perbaiki data.",
            icon: Upload,
          },
        ],
      },
      {
        title: "Adaptasi SIMPATDA",
        tone: "sample",
        description: "Contoh subset kolom penting dari dump SIMPATDA yang sudah disesuaikan ke kontrak app.",
        actions: [
          {
            kind: "sample",
            label: "Download Sample Excel",
            description: "Download template Excel dulu kalau operator belum punya format file yang benar untuk diisi.",
            icon: Download,
            href: "/api/data-tools/samples/wp",
          },
        ],
      },
    ],
  },
  {
    entity: "objek-pajak",
    title: "Objek Pajak",
    icon: Building2,
    sampleHref: "/api/data-tools/samples/op",
    groups: [
      {
        title: "Format Internal",
        tone: "internal",
        description: "Pisahkan template import universal dan export operasional agar operator tidak salah pilih.",
        actions: [
          {
            kind: "export",
            label: "Export Template Import",
            description: "Template universal untuk import ulang data OP.",
            icon: Download,
            href: "/api/objek-pajak/export",
          },
          {
            kind: "export",
            label: "Export Operasional Per Jenis",
            description: "File operasional yang lebih ringkas sesuai jenis pajak.",
            icon: Download,
          },
          {
            kind: "import",
            label: "Pilih File Excel",
            description: "Pilih file Excel dulu, lihat preview sheet lokal, lalu lanjut preview validasi atau tambah/perbaiki data.",
            icon: Upload,
          },
        ],
      },
      {
        title: "Adaptasi SIMPATDA",
        tone: "sample",
        description: "Template import universal OP dengan kolom dasar + kolom detail lintas jenis pajak yang bisa dikosongkan bila tidak dipakai.",
        actions: [
          {
            kind: "sample",
            label: "Download Sample Excel OP",
            description: "Download template Excel universal OP dulu kalau operator belum punya format file yang benar untuk diisi.",
            icon: Download,
            href: "/api/data-tools/samples/op",
          },
        ],
      },
    ],
  },
];
