"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function DocumentPreviewDialog({
  title,
  fileName,
  fileSize,
  fileType,
  viewUrl,
  open,
  onOpenChange,
}: {
  title: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  viewUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isPdf = fileType === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-4 pb-0 pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-xs">
            <span className="truncate">{fileName}</span>
            <span className="shrink-0 text-muted-foreground">
              {formatFileSize(fileSize)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogPrimitive.Close asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-3 right-3"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        </DialogPrimitive.Close>

        <div className="flex-1 min-h-0 overflow-auto px-5 pb-5">
          {viewUrl ? (
            isPdf ? (
              <iframe
                src={viewUrl}
                title={`${title} preview`}
                className="w-full h-[60vh] rounded-md border border-border/60"
              />
            ) : (
              <img
                src={viewUrl}
                alt={`${title} preview`}
                className="max-h-[60vh] w-full rounded-md border border-border/60 object-contain"
              />
            )
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
              Preview not available.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
