"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DocumentPreviewDialog } from "@/components/document-preview-dialog";

export function ProofPreviewButton({
  fileName,
  fileSize,
  fileType,
  viewUrl,
}: {
  fileName: string;
  fileSize: number;
  fileType: string;
  viewUrl: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="h-10 w-full rounded-full font-semibold sm:w-fit"
        onClick={() => setPreviewOpen(true)}
      >
        Preview proof
      </Button>
      <DocumentPreviewDialog
        title="Repayment Proof Preview"
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
