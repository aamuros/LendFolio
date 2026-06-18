"use client";

import { useActionState, useRef, useState } from "react";
import {
  markLoanFundsReleased,
  type LoanFundsReleaseResult,
} from "@/app/lender/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: LoanFundsReleaseResult | null = null;
const releaseProofMaxFileSize = 5 * 1024 * 1024;
const releaseProofAllowedTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);
const releaseMethods = ["Bank transfer", "GCash", "Cash", "Maya", "Other"] as const;

export function LenderFundsReleaseForm({
  activeLoanId,
}: {
  activeLoanId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    markLoanFundsReleased,
    initialState,
  );
  const [method, setMethod] = useState("");
  const [customMethod, setCustomMethod] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [clientMethodError, setClientMethodError] = useState<string | null>(null);
  const [clientCustomMethodError, setClientCustomMethodError] = useState<
    string | null
  >(null);
  const [clientFileError, setClientFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const methodError = clientMethodError ?? fieldErrors?.method?.[0] ?? null;
  const customMethodError =
    clientCustomMethodError ?? fieldErrors?.customMethod?.[0] ?? null;
  const proofError = clientFileError ?? fieldErrors?.proofFile?.[0] ?? null;

  function clearSelectedFile() {
    setSelectedFileName("");
    setClientFileError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setClientFileError(null);

    if (!file) {
      setSelectedFileName("");
      return;
    }

    setSelectedFileName(file.name);

    if (!releaseProofAllowedTypes.has(file.type)) {
      setClientFileError("Upload a PNG, JPG, WEBP, or PDF file.");
      return;
    }

    if (file.size > releaseProofMaxFileSize) {
      setClientFileError("Release proof must be 5MB or smaller.");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    setClientMethodError(null);
    setClientCustomMethodError(null);
    setClientFileError(null);

    if (!method) {
      event.preventDefault();
      setClientMethodError("Choose a release method.");
      return;
    }

    if (method === "Other" && customMethod.trim().length === 0) {
      event.preventDefault();
      setClientCustomMethodError("Enter the release method.");
      return;
    }

    const proofFile = fileInputRef.current?.files?.[0];

    if (!proofFile) {
      return;
    }

    if (!releaseProofAllowedTypes.has(proofFile.type)) {
      event.preventDefault();
      setClientFileError("Upload a PNG, JPG, WEBP, or PDF file.");
      return;
    }

    if (proofFile.size > releaseProofMaxFileSize) {
      event.preventDefault();
      setClientFileError("Release proof must be 5MB or smaller.");
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="grid gap-3">
      <input type="hidden" name="activeLoanId" value={activeLoanId} />
      {state ? (
        <Alert variant={state.ok ? "default" : "destructive"} role="status">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`method-${activeLoanId}`}>Release method</Label>
          <Select
            name="method"
            value={method}
            onValueChange={(value) => {
              setMethod(value);
              setClientMethodError(null);

              if (value !== "Other") {
                setCustomMethod("");
                setClientCustomMethodError(null);
              }
            }}
            required
          >
            <SelectTrigger id={`method-${activeLoanId}`}>
              <SelectValue placeholder="Choose method" />
            </SelectTrigger>
            <SelectContent>
              {releaseMethods.map((releaseMethod) => (
                <SelectItem key={releaseMethod} value={releaseMethod}>
                  {releaseMethod}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {methodError ? (
            <p className="text-sm text-destructive">{methodError}</p>
          ) : null}
          {method === "Other" ? (
            <div className="grid gap-2">
              <Label htmlFor={`custom-method-${activeLoanId}`} className="sr-only">
                Custom release method
              </Label>
              <Input
                id={`custom-method-${activeLoanId}`}
                name="customMethod"
                value={customMethod}
                onChange={(event) => {
                  setCustomMethod(event.target.value);
                  setClientCustomMethodError(null);
                }}
                placeholder="Enter method"
                maxLength={80}
                required
              />
              {customMethodError ? (
                <p className="text-sm text-destructive">{customMethodError}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`reference-${activeLoanId}`}>Reference</Label>
          <Input
            id={`reference-${activeLoanId}`}
            name="reference"
            placeholder="Transaction reference"
            maxLength={120}
          />
          {fieldErrors?.reference ? (
            <p className="text-sm text-destructive">{fieldErrors.reference[0]}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`proof-${activeLoanId}`}>
          Upload release proof (optional)
        </Label>
        <Input
          ref={fileInputRef}
          id={`proof-${activeLoanId}`}
          name="proofFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={handleFileChange}
        />
        <p className="text-sm text-muted-foreground">
          Receipt, screenshot, or transfer confirmation. Max 5MB.
        </p>
        {selectedFileName ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-foreground">{selectedFileName}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelectedFile}
              className="h-8 px-2"
            >
              Clear
            </Button>
          </div>
        ) : null}
        {proofError ? (
          <p className="text-sm text-destructive">{proofError}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`notes-${activeLoanId}`}>Notes</Label>
        <Textarea
          id={`notes-${activeLoanId}`}
          name="notes"
          placeholder="Optional release notes"
          maxLength={500}
        />
        {fieldErrors?.notes ? (
          <p className="text-sm text-destructive">{fieldErrors.notes[0]}</p>
        ) : null}
      </div>
      <Button
        type="submit"
        disabled={isPending || state?.ok}
        className="h-10 w-fit rounded-full font-semibold"
      >
        {isPending ? "Marking released..." : "Mark funds released"}
      </Button>
    </form>
  );
}
