import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function AttachmentUploadDialog({
 open,
 onOpenChange,
 endpoint,
 title,
 documentTypeOptions,
 onUploaded,
}: {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 endpoint: string;
 title: string;
 documentTypeOptions: Array<{ value: string; label: string }>;
 onUploaded: () => void;
}) {
 const fileInputRef = useRef<HTMLInputElement>(null);
 const { toast } = useToast();
 const [documentType, setDocumentType] = useState(documentTypeOptions[0]?.value ?? "");
 const [notes, setNotes] = useState("");
 const [selectedFile, setSelectedFile] = useState<File | null>(null);

 const uploadMutation = useMutation({
 mutationFn: async () => {
 if (!selectedFile) {
 throw new Error("File wajib dipilih");
 }

 const formData = new FormData();
 formData.set("documentType", documentType);
 if (notes.trim()) {
 formData.set("notes", notes.trim());
 }
 formData.set("file", selectedFile);

 const response = await apiRequest("POST", endpoint, formData);
 return response.json();
 },
 onSuccess: () => {
 toast({ title: "Berhasil", description: "Attachment berhasil diunggah" });
 setNotes("");
 setSelectedFile(null);
 if (fileInputRef.current) {
 fileInputRef.current.value = "";
 }
 onUploaded();
 onOpenChange(false);
 },
 onError: (error: Error) => {
 toast({ title: "Gagal", description: error.message, variant: "destructive" });
 },
 });

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="shadow-floating max-w-lg bg-white p-0">
 <DialogHeader className="p-4 border-b border-border bg-primary">
 <DialogTitle className="font-sans text-xl font-black text-white uppercase">{title}</DialogTitle>
 <DialogDescription className="sr-only">
 Dialog upload attachment untuk memilih jenis dokumen, file, dan catatan opsional.
 </DialogDescription>
 </DialogHeader>
 <div className="p-4 space-y-4">
 <div className="space-y-2">
 <Label className="font-mono text-xs font-bold text-black">Jenis Dokumen</Label>
 <Select value={documentType} onValueChange={setDocumentType}>
 <SelectTrigger className="font-mono text-sm">
 <SelectValue placeholder="Pilih jenis dokumen" />
 </SelectTrigger>
 <SelectContent className="border border-black">
 {documentTypeOptions.map((option) => (
 <SelectItem key={option.value} value={option.value}>
 {option.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="font-mono text-xs font-bold text-black">File</Label>
 <Input
 ref={fileInputRef}
 type="file"
 accept=".pdf,image/jpeg,image/png,image/webp"
 className="font-mono text-sm"
 onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
 />
 <p className="font-mono text-[11px] text-gray-600">Format: PDF, JPG, PNG, WebP. Maksimal 5 MB.</p>
 </div>

 <div className="space-y-2">
 <Label className="font-mono text-xs font-bold text-black">Catatan (Opsional)</Label>
 <Textarea
 value={notes}
 onChange={(event) => setNotes(event.target.value)}
 className="font-mono text-sm min-h-[96px]"
 />
 </div>

 <Button
 type="button"
 disabled={uploadMutation.isPending}
 className="w-full shadow-card bg-primary text-white font-mono font-bold"
 onClick={() => uploadMutation.mutate()}
 >
 {uploadMutation.isPending ? "MENGUNGGAH..." : "UPLOAD ATTACHMENT"}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 );
}
