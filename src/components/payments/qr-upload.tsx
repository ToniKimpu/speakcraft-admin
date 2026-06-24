"use client";

import { useEffect, useRef, useState } from "react";
import { uploadPaymentQr, getPaymentQrUrl } from "@/lib/actions/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, QrCode, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface QrUploadProps {
  value: string | null | undefined;
  onChange: (fileName: string | null) => void;
}

export function QrUpload({ value, onChange }: QrUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      getPaymentQrUrl(value).then(setPreviewUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [value]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const fileName = await uploadPaymentQr(formData);
      onChange(fileName);
      toast.success("QR uploaded");
    } catch (err) {
      toast.error(
        `Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {previewUrl && value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="QR preview"
            className="h-32 w-32 rounded-lg border object-contain bg-white p-1"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon-xs"
            className="absolute -top-1.5 -right-1.5"
            onClick={() => onChange(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed bg-muted/30">
          <QrCode className="h-8 w-8 text-muted-foreground/50" />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="mr-2 h-3.5 w-3.5" />
          )}
          {value ? "Replace QR" : "Upload QR"}
        </Button>
      </div>
    </div>
  );
}
