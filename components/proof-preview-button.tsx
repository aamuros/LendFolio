"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog";

export function ProofPreviewButton({
  buttonText = "Preview proof",
  className,
  fileName,
  fileSize,
  fileType,
  title,
  viewUrl,
}: {
  buttonText?: string;
  className?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  title: string;
  viewUrl: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setPreviewOpen(true)}
      >
        {buttonText}
      </Button>
      <DocumentPreviewDialog
        title={title}
        fileName={fileName}
        fileSize={fileSize}
        fileType={fileType}
        viewUrl={viewUrl}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}
