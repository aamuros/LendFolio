"use client";

import { useActionState, useState } from "react";
import {
  lenderOnboardingAction,
  type LenderOnboardingState,
} from "@/app/lender/onboarding/actions";
import type { LenderVerificationStatus } from "@/lib/supabase/types";
import { typicalRepaymentTermOptions } from "@/lib/lender-onboarding";
import type { LenderOnboardingAddressFields } from "@/lib/lender-onboarding";
import {
  AddressSelect,
  createEmptyAddressSelection,
  isAddressSelectionComplete,
} from "@/components/address/address-select";
import type { AddressSelectValue } from "@/components/address/address-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { LegalDialog } from "@/components/legal/legal-dialog";
import { lenderVerificationAuthorizationContent } from "@/components/legal/legal-content";

const initialState: LenderOnboardingState = {
  message: "",
  status: "idle",
};

type LenderOnboardingFormProps = {
  verificationStatus: LenderVerificationStatus;
  rejectionReason: string | null;
  managerReviewNotes: string | null;
  defaultValues: {
    organizationName: string;
    contactPerson: string;
    phoneNumber: string;
    businessAddress: string;
    operatingArea: string;
    businessRegistrationNumber: string;
    minLoanAmount: string;
    maxLoanAmount: string;
    typicalRepaymentTerms: string;
    lenderDescription: string;
  };
  defaultAddress?: AddressSelectValue | null;
};

export function LenderOnboardingForm({
  verificationStatus,
  rejectionReason,
  managerReviewNotes,
  defaultValues,
  defaultAddress,
}: LenderOnboardingFormProps) {
  const [state, formAction, isPending] = useActionState(
    lenderOnboardingAction,
    initialState,
  );
  const isSuccess = state.status === "success";
  const isRejected = verificationStatus === "rejected";
  const restoredValues = state.values;
  const formKey = restoredValues ? JSON.stringify(restoredValues) : "initial";
  const [repaymentTerms, setRepaymentTerms] = useState(
    restoredValues?.typicalRepaymentTerms ?? defaultValues.typicalRepaymentTerms,
  );
  const [addressSelection, setAddressSelection] = useState<AddressSelectValue>(
    defaultAddress ?? createEmptyAddressSelection(),
  );
  const [streetAddress, setStreetAddress] = useState(
    restoredValues?.streetAddress ?? defaultValues.businessAddress ?? "",
  );

  const addressErrors: Partial<Record<keyof AddressSelectValue, string>> = {};
  if (state.fieldErrors?.addressRegion) {
    addressErrors.regionCode = state.fieldErrors.addressRegion[0];
  }
  if (state.fieldErrors?.addressCity) {
    addressErrors.cityOrMunicipality = state.fieldErrors.addressCity[0];
  }
  if (state.fieldErrors?.addressBarangay) {
    addressErrors.barangay = state.fieldErrors.addressBarangay[0];
  }
  if (state.fieldErrors?.addressZipCode) {
    addressErrors.zipCode = state.fieldErrors.addressZipCode[0];
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          {isRejected ? "Update your lender profile" : "Complete your lender profile"}
        </CardTitle>
        <CardDescription>
          {isRejected
            ? "Review the manager notes, make changes, and resubmit for approval."
            : "Add your business details so a manager can review your lender access."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isRejected && (rejectionReason || managerReviewNotes) ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle />
            <AlertDescription>
              {rejectionReason ? (
                <>
                  <span className="font-medium">Rejection reason:</span>{" "}
                  {rejectionReason}
                </>
              ) : null}
              {rejectionReason && managerReviewNotes ? <br /> : null}
              {managerReviewNotes ? (
                <>
                  <span className="font-medium">Manager note:</span>{" "}
                  {managerReviewNotes}
                </>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <form key={formKey} action={formAction}>
          <FieldGroup className="gap-5">
            <fieldset className="grid gap-4">
              <legend className="text-sm font-semibold text-foreground">
                Organization details
              </legend>

              <Field>
                <FieldLabel htmlFor="organizationName">
                  Company / Organization name <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="organizationName"
                  name="organizationName"
                  defaultValue={restoredValues?.organizationName ?? defaultValues.organizationName}
                  placeholder="Acme Lending Corp"
                  className="h-12 rounded-xl bg-background"
                  required
                />
                <FieldErrorHelper
                  messages={state.fieldErrors?.organizationName}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="contactPerson">Contact person <span className="text-destructive">*</span></FieldLabel>
                <Input
                  id="contactPerson"
                  name="contactPerson"
                  defaultValue={restoredValues?.contactPerson ?? defaultValues.contactPerson}
                  placeholder="Juan dela Cruz"
                  autoComplete="name"
                  className="h-12 rounded-xl bg-background"
                  required
                />
                <FieldErrorHelper
                  messages={state.fieldErrors?.contactPerson}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="phoneNumber">Phone number <span className="text-destructive">*</span></FieldLabel>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    defaultValue={restoredValues?.phoneNumber ?? defaultValues.phoneNumber}
                    placeholder="+63 900 000 0000"
                    autoComplete="tel"
                    className="h-12 rounded-xl bg-background"
                    required
                  />
                  <FieldErrorHelper
                    messages={state.fieldErrors?.phoneNumber}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="businessRegistrationNumber">
                    Business registration number
                  </FieldLabel>
                  <Input
                    id="businessRegistrationNumber"
                    name="businessRegistrationNumber"
                    defaultValue={restoredValues?.businessRegistrationNumber ?? defaultValues.businessRegistrationNumber}
                    placeholder="Optional"
                    className="h-12 rounded-xl bg-background"
                  />
                  <FieldDescription>
                    SEC, DTI, or CDA registration number if applicable.
                  </FieldDescription>
                  <FieldErrorHelper
                    messages={state.fieldErrors?.businessRegistrationNumber}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel>
                  Business address <span className="text-destructive">*</span>
                </FieldLabel>
                <input
                  type="hidden"
                  name="addressRegionCode"
                  value={addressSelection.regionCode}
                />
                <input
                  type="hidden"
                  name="addressRegionName"
                  value={addressSelection.regionName}
                />
                <input
                  type="hidden"
                  name="addressCity"
                  value={addressSelection.cityOrMunicipality}
                />
                <input
                  type="hidden"
                  name="addressBarangay"
                  value={addressSelection.barangay}
                />
                <input
                  type="hidden"
                  name="addressZipCode"
                  value={addressSelection.zipCode}
                />
                <input
                  type="hidden"
                  name="streetAddress"
                  value={streetAddress}
                />
                <AddressSelect
                  value={addressSelection}
                  onChange={setAddressSelection}
                  idPrefix="lender-address"
                  required
                  errors={addressErrors}
                  streetAddress={streetAddress}
                  onStreetAddressChange={setStreetAddress}
                  streetAddressError={state.fieldErrors?.streetAddress?.[0]}
                  legacyAddress={
                    defaultAddress == null && defaultValues.businessAddress
                      ? defaultValues.businessAddress
                      : null
                  }
                />
              </Field>
            </fieldset>

            <fieldset className="grid gap-4">
              <legend className="text-sm font-semibold text-foreground">
                Lending details
              </legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="minLoanAmount">
                    Minimum loan amount (PHP) <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="minLoanAmount"
                    name="minLoanAmount"
                    type="number"
                    inputMode="decimal"
                    defaultValue={restoredValues?.minLoanAmount ?? defaultValues.minLoanAmount}
                    placeholder="5000"
                    min="1"
                    step="1"
                    className="h-12 rounded-xl bg-background"
                    required
                  />
                  <FieldErrorHelper
                    messages={state.fieldErrors?.minLoanAmount}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="maxLoanAmount">
                    Maximum loan amount (PHP) <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="maxLoanAmount"
                    name="maxLoanAmount"
                    type="number"
                    inputMode="decimal"
                    defaultValue={restoredValues?.maxLoanAmount ?? defaultValues.maxLoanAmount}
                    placeholder="50000"
                    min="1"
                    step="1"
                    className="h-12 rounded-xl bg-background"
                    required
                  />
                  <FieldErrorHelper
                    messages={state.fieldErrors?.maxLoanAmount}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="typicalRepaymentTerms">
                  Typical repayment terms <span className="text-destructive">*</span>
                </FieldLabel>
                <input
                  type="hidden"
                  name="typicalRepaymentTerms"
                  value={repaymentTerms}
                />
                <Select
                  value={repaymentTerms}
                  onValueChange={setRepaymentTerms}
                >
                  <SelectTrigger
                    id="typicalRepaymentTerms"
                    className="data-[size=default]:h-12 rounded-xl bg-background"
                  >
                    <SelectValue placeholder="Select typical repayment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {typicalRepaymentTermOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldErrorHelper
                  messages={state.fieldErrors?.typicalRepaymentTerms}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="lenderDescription">
                  Lender description <span className="text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Textarea
                  id="lenderDescription"
                  name="lenderDescription"
                  defaultValue={restoredValues?.lenderDescription ?? defaultValues.lenderDescription}
                  placeholder="Optional. Describe your lending organization, focus areas, and approach to micro-business lending."
                  rows={2}
                  className="min-h-20 rounded-xl bg-background"
                />
                <FieldDescription>
                  Optional. Helps managers understand your lending focus.
                </FieldDescription>
                <FieldErrorHelper
                  messages={state.fieldErrors?.lenderDescription}
                />
              </Field>
            </fieldset>

            {!state.fieldErrors && state.message ? (
              <Alert variant={isSuccess ? "default" : "destructive"}>
                {isSuccess ? <CheckCircle2 /> : <AlertCircle />}
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-foreground">
                Required disclosures
              </legend>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="lenderReviewConsentAccepted"
                  name="lenderReviewConsentAccepted"
                  className="mt-0.5"
                  defaultChecked={restoredValues?.lenderReviewConsentAccepted}
                />
                <div className="grid gap-1 text-sm leading-snug">
                  <div className="grid gap-1">
                    <p className="font-semibold text-foreground">
                      Authorization for Verification
                    </p>
                    <LegalDialog
                      trigger={
                        <button
                          type="button"
                          className="w-fit text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#33423C]"
                        >
                          View details
                        </button>
                      }
                      content={lenderVerificationAuthorizationContent}
                    />
                  </div>
                </div>
              </div>
              <FieldErrorHelper
                messages={state.fieldErrors?.lenderReviewConsentAccepted}
              />
            </fieldset>

            <Field>
              <Button
                type="submit"
                disabled={isPending}
                className="h-12 w-full rounded-xl"
              >
                {isPending
                  ? "Submitting..."
                  : isRejected
                    ? "Resubmit for review"
                    : "Submit for review"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function FieldErrorHelper({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return <FieldError>{messages[0]}</FieldError>;
}
