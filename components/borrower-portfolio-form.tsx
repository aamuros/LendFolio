"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useWatch, Controller } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  loadBorrowerPortfolio,
  saveBorrowerPortfolio,
} from "@/app/borrower/actions";
import { CurrencyInput } from "@/components/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import {
  borrowerPortfolioSchema,
  businessTypeLabels,
  businessTypeOptions,
  type BorrowerPortfolioFormInput,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import { evaluateBorrowerReadiness } from "@/lib/borrower-readiness";
import { explainBorrowerCreditLimit } from "@/lib/credit-limit";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import { parseMoneyInput } from "@/lib/money-input";
import {
  AddressSelect,
  createEmptyAddressSelection,
} from "@/components/address/address-select";

const defaultValues: BorrowerPortfolioInput = {
  businessName: "",
  businessType: "sari_sari_store",
  location: "",
  address: createEmptyAddressSelection(),
  streetAddress: "",
  monthlyGrossRevenue: 0,
  monthlyExpenses: 0,
  existingLoanPayments: 0,
  yearsInOperation: 0,
  loanPurposeContext: "",
};

type LoadState = "loading" | "empty" | "ready" | "error";

type BorrowerPortfolioFormProps = {
  onCancel?: () => void;
  onSaved?: (portfolio: BorrowerPortfolioInput) => void;
};

export function BorrowerPortfolioForm({
  onCancel,
  onSaved,
}: BorrowerPortfolioFormProps = {}) {
  const [isPending, startTransition] = useTransition();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<BorrowerPortfolioFormInput, unknown, BorrowerPortfolioInput>({
    resolver: zodResolver(borrowerPortfolioSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const currentValues = useWatch({ control }) as BorrowerPortfolioInput;
  const readiness = evaluateBorrowerReadiness(currentValues);
  const credit = explainBorrowerCreditLimit(currentValues);

  useEffect(() => {
    let isActive = true;

    startTransition(() => {
      void loadBorrowerPortfolio().then((result) => {
        if (!isActive) {
          return;
        }

        if (result.ok && result.data) {
          reset(result.data);
          setLoadState("ready");
          setStatusMessage("");
          setSuccessMessage("");
          return;
        }

        setLoadState(result.ok ? "empty" : "error");
        setStatusMessage(result.message);
        setSuccessMessage("");
      });
    });

    return () => {
      isActive = false;
    };
  }, [reset, startTransition]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccessMessage(""), 3000);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  function onSubmit(values: BorrowerPortfolioInput) {
    setStatusMessage("Saving profile...");
    setSuccessMessage("");

    startTransition(async () => {
      const result = await saveBorrowerPortfolio(values);
      setLoadState(result.ok ? "ready" : "error");
      if (result.ok) {
        setStatusMessage("");
        setSuccessMessage(result.message);
        reset(values);
        onSaved?.(values);
        window.dispatchEvent(new Event(borrowerPortfolioSavedEvent));
      } else {
        setStatusMessage(result.message);
      }
    });
  }

  if (loadState === "loading") {
    return <BorrowerPortfolioFormSkeleton />;
  }

  return (
    <Card className="rounded-2xl">
    <CardContent className="p-5">
    <form
      onSubmit={handleSubmit(onSubmit)}
      onChange={() => {
        if (successMessage) {
          setSuccessMessage("");
        }
      }}
      className="grid gap-6"
      aria-describedby="portfolio-save-state"
    >
      {loadState === "error" ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      ) : null}



      <FormSection
        title="Business details"
        description="The basics lenders use to understand the business."
      >
        <Field label="Business name" error={errors.businessName?.message} id="businessName">
          <Input 
            id="businessName"
            aria-invalid={Boolean(errors.businessName)}
            aria-describedby={errors.businessName ? "businessName-error" : undefined}
            {...register("businessName")} 
          />
        </Field>
        <Field label="Business type" error={errors.businessType?.message} id="businessType">
          <Controller
            control={control}
            name="businessType"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="businessType" className="w-full" aria-invalid={Boolean(errors.businessType)} aria-describedby={errors.businessType ? "businessType-error" : undefined}>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {businessTypeLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <div className="sm:col-span-2">
          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <Field
                label="Business address"
                error={errors.address?.regionCode?.message || errors.address?.cityOrMunicipality?.message || errors.address?.barangay?.message || errors.address?.zipCode?.message}
                id="address"
              >
                <AddressSelect
                  value={field.value}
                  onChange={field.onChange}
                  idPrefix="borrower-address"
                  required
                  errors={{
                    regionCode: errors.address?.regionCode?.message,
                    cityOrMunicipality: errors.address?.cityOrMunicipality?.message,
                    barangay: errors.address?.barangay?.message,
                    zipCode: errors.address?.zipCode?.message,
                  }}
                  legacyAddress={
                    field.value.regionCode
                      ? null
                      : undefined
                  }
                />
              </Field>
            )}
          />
          <Controller
            control={control}
            name="streetAddress"
            render={({ field }) => (
              <div className="mt-4 grid gap-1.5">
                <Label htmlFor="streetAddress" className="text-foreground">
                  Street / Building / Unit{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="streetAddress"
                  aria-invalid={Boolean(errors.streetAddress)}
                  aria-describedby={errors.streetAddress ? "streetAddress-error" : undefined}
                  placeholder="e.g. 123 Main St, Unit 4B"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
                {errors.streetAddress?.message ? (
                  <span id="streetAddress-error" className="text-sm leading-5 text-destructive">{errors.streetAddress.message}</span>
                ) : null}
              </div>
            )}
          />
        </div>
        <Field
          label="Years in operation"
          error={errors.yearsInOperation?.message}
          id="yearsInOperation"
        >
          <Input
            id="yearsInOperation"
            aria-invalid={Boolean(errors.yearsInOperation)}
            aria-describedby={errors.yearsInOperation ? "yearsInOperation-error" : undefined}
            type="number"
            min="0"
            max="100"
            step="0.5"
            inputMode="decimal"
            {...register("yearsInOperation", { setValueAs: parseMoneyInput })}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Financials"
        description="Use a normal monthly estimate for the current business."
      >
        <Field
          label="Monthly gross revenue"
          error={errors.monthlyGrossRevenue?.message}
          id="monthlyGrossRevenue"
        >
          <CurrencyInput
            id="monthlyGrossRevenue"
            aria-invalid={Boolean(errors.monthlyGrossRevenue)}
            aria-describedby={errors.monthlyGrossRevenue ? "monthlyGrossRevenue-error" : undefined}
            registration={register("monthlyGrossRevenue", {
              setValueAs: parseMoneyInput,
            })}
          />
        </Field>

        <Field
          label="Monthly expenses"
          error={errors.monthlyExpenses?.message}
          id="monthlyExpenses"
        >
          <CurrencyInput
            id="monthlyExpenses"
            aria-invalid={Boolean(errors.monthlyExpenses)}
            aria-describedby={errors.monthlyExpenses ? "monthlyExpenses-error" : undefined}
            registration={register("monthlyExpenses", {
              setValueAs: parseMoneyInput,
            })}
          />
        </Field>

        <Field
          label="Existing monthly loan payments"
          error={errors.existingLoanPayments?.message}
          id="existingLoanPayments"
        >
          <CurrencyInput
            id="existingLoanPayments"
            aria-invalid={Boolean(errors.existingLoanPayments)}
            aria-describedby={errors.existingLoanPayments ? "existingLoanPayments-error" : undefined}
            registration={register("existingLoanPayments", {
              setValueAs: parseMoneyInput,
            })}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Loan use"
        description="Optional. Describe how the financing would support the business."
      >
        <div className="sm:col-span-2 grid gap-1.5">
          <Textarea
            id="loanPurposeContext"
            aria-invalid={Boolean(errors.loanPurposeContext)}
            aria-describedby={errors.loanPurposeContext ? "loanPurposeContext-error" : undefined}
            {...register("loanPurposeContext")}
            rows={3}
            placeholder="Optional. Describe the loan purpose, including what the funds will be used for and how it supports the business."
          />
          {errors.loanPurposeContext?.message ? (
            <span id="loanPurposeContext-error" className="text-sm leading-5 text-destructive">{errors.loanPurposeContext.message}</span>
          ) : null}
        </div>
      </FormSection>

      <FormSection title="Review">
        <div className="sm:col-span-2">
          <ReadinessPanel
            readiness={readiness}
            monthlyNetCashFlow={credit.monthlyNetCashFlow}
          />
        </div>
      </FormSection>

      <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="grid gap-2">
          <p
            id="portfolio-save-state"
            className="text-sm leading-6 text-muted-foreground"
            aria-live="polite"
          >
            {statusMessage}
          </p>
          {successMessage ? (
            <Alert role="status">
              <AlertDescription className="font-semibold">
                {successMessage}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-full h-11 font-semibold"
        >
          {isPending ? "Saving..." : "Save profile"}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-full h-11 font-semibold sm:order-first"
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
    </CardContent>
    </Card>
  );
}


function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ReadinessPanel({
  readiness,
  monthlyNetCashFlow,
}: {
  readiness: ReturnType<typeof evaluateBorrowerReadiness>;
  monthlyNetCashFlow: number;
}) {
  const hasVagueLoanPurpose = readiness.riskFlags.includes("vague_loan_purpose");
  const statusLabel =
    readiness.readinessStatus === "needs_review" && hasVagueLoanPurpose
      ? "Update needed"
      : readiness.readinessStatus.replaceAll("_", " ");

  return (
    <Card className="rounded-xl bg-muted/30">
      <CardContent className="grid gap-2 p-4 text-sm leading-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">Profile readiness</p>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
            {statusLabel}
          </span>
        </div>
        <p className="text-muted-foreground">
          Net monthly cash flow: PHP{" "}
          {new Intl.NumberFormat("en-PH", {
            maximumFractionDigits: 0,
          }).format(monthlyNetCashFlow)}
        </p>
        {readiness.missingFields.length ? (
          <p className="text-muted-foreground">
            Missing: {readiness.missingFields.slice(0, 4).join(", ")}
            {readiness.missingFields.length > 4 ? "..." : ""}
          </p>
        ) : null}
        {readiness.riskFlags.length ? (
          <p className="text-muted-foreground">
            Flags:{" "}
            {readiness.riskFlags
              .map((flag) => flag.replaceAll("_", " "))
              .join(", ")}
          </p>
        ) : null}
        {hasVagueLoanPurpose ? (
          <p className="font-medium">
            Add more detail to your loan purpose or clear the field.
          </p>
        ) : (
          <p className="font-medium">{readiness.nextActions[0]}</p>
        )}
      </CardContent>
    </Card>
  );
}

function BorrowerPortfolioFormSkeleton() {
  return (
    <section
      className="grid gap-4"
      aria-busy="true"
      aria-label="Loading business profile"
    >
      <Card className="rounded-2xl">
        <CardContent className="grid gap-3 p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-full max-w-sm" />
        </CardContent>
      </Card>

      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="rounded-2xl">
          <CardContent className="grid gap-4 p-5">
            <Skeleton className="h-4 w-36" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-11 w-full rounded-md" />
              <Skeleton className="h-11 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="rounded-2xl">
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-11 w-full sm:w-36 rounded-full" />
        </CardContent>
      </Card>
    </section>
  );
}


type FieldProps = {
  label: string;
  error?: string;
  id: string;
  children: ReactNode;
};

function Field({ label, error, id, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <span id={`${id}-error`} className="text-sm leading-5 text-destructive">{error}</span>
      ) : null}
    </div>
  );
}
