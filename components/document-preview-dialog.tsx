"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { ExternalLink, XIcon } from "lucide-react";

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
  const isImage =
    fileType === "image/jpeg" ||
    fileType === "image/png" ||
    fileType === "image/webp";
  const canRenderPreview = Boolean(viewUrl) && (isPdf || isImage);
  const [isLoading, setIsLoading] = useState(canRenderPreview);
  const [hasPreviewError, setHasPreviewError] = useState(false);

  const fallbackMessage = viewUrl
    ? "Preview is not available for this file."
    : "Invalid or missing file URL.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
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
          {hasPreviewError ? (
            <PreviewFallback
              message="Preview unavailable, download file instead."
              viewUrl={viewUrl}
            />
          ) : canRenderPreview ? (
            isPdf ? (
              <div className="relative">
                {isLoading ? <PreviewLoading /> : null}
                <iframe
                  src={viewUrl ?? ""}
                  title={`${title} preview`}
                  className="w-full h-[65vh] rounded-md border border-border/60"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasPreviewError(true);
                  }}
                />
              </div>
            ) : (
              <div className="relative">
                {isLoading ? <PreviewLoading /> : null}
                <img
                  src={viewUrl ?? ""}
                  alt={`${title} preview`}
                  className="max-h-[65vh] w-full rounded-md border border-border/60 object-contain"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setHasPreviewError(true);
                  }}
                />
              </div>
            )
          ) : (
            <PreviewFallback message={fallbackMessage} viewUrl={viewUrl} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewLoading() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80 text-sm text-muted-foreground">
      Loading preview...
    </div>
  );
}

function PreviewFallback({
  message,
  viewUrl,
}: {
  message: string;
  viewUrl: string | null;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border/70 px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {viewUrl ? (
        <Button asChild variant="outline" size="sm" className="gap-2">
          <a href={viewUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Open file
          </a>
        </Button>
      ) : null}
    </div>
  );
}
