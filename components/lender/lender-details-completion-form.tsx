"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  saveLenderDetailsAction,
  type LenderDetailsSaveState,
} from "@/app/lender/actions";
import {
  createEmptyAddressSelection,
  AddressSelect,
} from "@/components/address/address-select";
import type { AddressSelectValue } from "@/components/address/address-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { typicalRepaymentTermOptions } from "@/lib/lender-onboarding";

export type LenderDetailsStep = "organization" | "lending" | "review";

type LenderDetailsProfile = {
  organization_name: string | null;
  contact_person: string | null;
  phone_number: string | null;
  business_address: string | null;
  operating_area: string | null;
  business_registration_number: string | null;
  address_region?: string | null;
  address_city_or_municipality?: string | null;
  address_barangay?: string | null;
  address_zip_code?: string | null;
  min_loan_amount: number | null;
  max_loan_amount: number | null;
  typical_repayment_terms: string | null;
  lender_description: string | null;
};

type LenderDetailsDraft = {
  organizationName: string;
  contactPerson: string;
  phoneNumber: string;
  businessRegistrationNumber: string;
  address: AddressSelectValue;
  streetAddress: string;
  minLoanAmount: string;
  maxLoanAmount: string;
  typicalRepaymentTerms: string;
  lenderDescription: string;
};

type DraftErrors = Partial<
  Record<
    | keyof Omit<LenderDetailsDraft, "address">
    | "addressRegion"
    | "addressCity"
    | "addressBarangay"
    | "addressZipCode",
    string
  >
>;

const draftStorageKey = "lendfolio:lender-edit-profile:draft";
const draftChangedEvent = "lendfolio:lender-edit-profile:draft-changed";
let cachedDraftRaw: string | null = null;
let cachedDraftValue: Partial<LenderDetailsDraft> | null = null;
let cachedSnapshotKey: string | null = null;
let cachedSnapshotValue: LenderDetailsDraft | null = null;

const initialState: LenderDetailsSaveState = {
  status: "idle",
  message: "",
};

export function LenderDetailsCompletionForm({
  lenderProfile,
  step,
}: {
  lenderProfile: LenderDetailsProfile;
  step: LenderDetailsStep;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveLenderDetailsAction,
    initialState,
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const baseDraft = getInitialDraft(lenderProfile, state.values);
  const draft = useSyncExternalStore(
    subscribeToDraft,
    () => getDraftSnapshot(baseDraft),
    () => baseDraft,
  );
  const displayErrors = { ...getServerErrors(state), ...errors };

  useEffect(() => {
    if (state.status === "success") {
      clearDraft();
      router.push("/lender?tab=profile&message=lender-details-saved");
      router.refresh();
    }
  }, [router, state.status]);

  const setDraftField = <Key extends keyof LenderDetailsDraft>(
    key: Key,
    value: LenderDetailsDraft[Key],
  ) => {
    writeDraft({ ...draft, [key]: value });
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const addressErrors: Partial<Record<keyof AddressSelectValue, string>> = {
    regionCode: displayErrors.addressRegion,
    cityOrMunicipality: displayErrors.addressCity,
    barangay: displayErrors.addressBarangay,
    zipCode: displayErrors.addressZipCode,
  };

  function continueTo(nextStep: LenderDetailsStep) {
    const stepErrors =
      step === "organization"
        ? validateOrganizationStep(draft)
        : validateLendingStep(draft);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    writeDraft(draft);
    router.push(`/lender/edit-profile/${nextStep}`);
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-fit gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <Link href="/lender?tab=profile">
          <ChevronLeft className="size-4" />
          Profile
        </Link>
      </Button>

      {step === "organization" ? (
        <OrganizationStep
          draft={draft}
          errors={displayErrors}
          addressErrors={addressErrors}
          onChange={setDraftField}
          onContinue={() => continueTo("lending")}
        />
      ) : null}

      {step === "lending" ? (
        <LendingStep
          draft={draft}
          errors={displayErrors}
          onChange={setDraftField}
          onBack={() => {
            writeDraft(draft);
            router.push("/lender/edit-profile/organization");
          }}
          onContinue={() => continueTo("review")}
        />
      ) : null}

      {step === "review" ? (
        <ReviewStep
          draft={draft}
          formAction={formAction}
          pending={pending}
          state={state}
          onBack={() => {
            writeDraft(draft);
            router.push("/lender/edit-profile/lending");
          }}
        />
      ) : null}
    </div>
  );
}

function OrganizationStep({
  draft,
  errors,
  addressErrors,
  onChange,
  onContinue,
}: {
  draft: LenderDetailsDraft;
  errors: DraftErrors;
  addressErrors: Partial<Record<keyof AddressSelectValue, string>>;
  onChange: <Key extends keyof LenderDetailsDraft>(
    key: Key,
    value: LenderDetailsDraft[Key],
  ) => void;
  onContinue: () => void;
}) {
  return (
    <StepCard
      stepLabel="Part 1 of 3"
      title="Organization Details"
      description="Add the identity and contact details managers use for review."
    >
      <FieldGroup className="gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="organizationName">Organization name</FieldLabel>
            <Input
              id="organizationName"
              value={draft.organizationName}
              onChange={(event) =>
                onChange("organizationName", event.target.value)
              }
              className="h-12 rounded-xl bg-background"
              required
            />
            <FieldErrorHelper message={errors.organizationName} />
          </Field>
          <Field>
            <FieldLabel htmlFor="contactPerson">Contact person</FieldLabel>
            <Input
              id="contactPerson"
              value={draft.contactPerson}
              onChange={(event) => onChange("contactPerson", event.target.value)}
              className="h-12 rounded-xl bg-background"
              required
            />
            <FieldErrorHelper message={errors.contactPerson} />
          </Field>
          <Field>
            <FieldLabel htmlFor="phoneNumber">Phone number</FieldLabel>
            <Input
              id="phoneNumber"
              type="tel"
              value={draft.phoneNumber}
              onChange={(event) => onChange("phoneNumber", event.target.value)}
              className="h-12 rounded-xl bg-background"
              required
            />
            <FieldErrorHelper message={errors.phoneNumber} />
          </Field>
          <Field>
            <FieldLabel htmlFor="businessRegistrationNumber">
              Business registration
            </FieldLabel>
            <Input
              id="businessRegistrationNumber"
              value={draft.businessRegistrationNumber}
              onChange={(event) =>
                onChange("businessRegistrationNumber", event.target.value)
              }
              className="h-12 rounded-xl bg-background"
            />
            <FieldDescription>SEC, DTI, or CDA number if applicable.</FieldDescription>
            <FieldErrorHelper message={errors.businessRegistrationNumber} />
          </Field>
        </div>

        <Field>
          <FieldLabel>Business address</FieldLabel>
          <AddressSelect
            value={draft.address}
            onChange={(value) => onChange("address", value)}
            idPrefix="lender-edit-address"
            required
            errors={addressErrors}
            streetAddress={draft.streetAddress}
            onStreetAddressChange={(value) => onChange("streetAddress", value)}
            streetAddressError={errors.streetAddress}
          />
        </Field>

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-between">
          <Button
            asChild
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
          >
            <Link href="/lender?tab=profile">Back to Profile</Link>
          </Button>
          <Button
            type="button"
            className="h-11 rounded-xl font-semibold"
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      </FieldGroup>
    </StepCard>
  );
}

function LendingStep({
  draft,
  errors,
  onChange,
  onBack,
  onContinue,
}: {
  draft: LenderDetailsDraft;
  errors: DraftErrors;
  onChange: <Key extends keyof LenderDetailsDraft>(
    key: Key,
    value: LenderDetailsDraft[Key],
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <StepCard
      stepLabel="Part 2 of 3"
      title="Lending Details"
      description="Set the loan range, repayment terms, and lending focus shown during review."
    >
      <FieldGroup className="gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="minLoanAmount">Minimum loan amount</FieldLabel>
            <Input
              id="minLoanAmount"
              type="number"
              inputMode="decimal"
              value={draft.minLoanAmount}
              min="1"
              step="1"
              onChange={(event) => onChange("minLoanAmount", event.target.value)}
              className="h-12 rounded-xl bg-background"
              required
            />
            <FieldErrorHelper message={errors.minLoanAmount} />
          </Field>
          <Field>
            <FieldLabel htmlFor="maxLoanAmount">Maximum loan amount</FieldLabel>
            <Input
              id="maxLoanAmount"
              type="number"
              inputMode="decimal"
              value={draft.maxLoanAmount}
              min="1"
              step="1"
              onChange={(event) => onChange("maxLoanAmount", event.target.value)}
              className="h-12 rounded-xl bg-background"
              required
            />
            <FieldErrorHelper message={errors.maxLoanAmount} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="typicalRepaymentTerms">
            Typical repayment terms
          </FieldLabel>
          <Select
            value={draft.typicalRepaymentTerms}
            onValueChange={(value) => onChange("typicalRepaymentTerms", value)}
          >
            <SelectTrigger
              id="typicalRepaymentTerms"
              className="data-[size=default]:h-12 rounded-xl bg-background"
            >
              <SelectValue placeholder="Select repayment terms" />
            </SelectTrigger>
            <SelectContent>
              {typicalRepaymentTermOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldErrorHelper message={errors.typicalRepaymentTerms} />
        </Field>

        <Field>
          <FieldLabel htmlFor="lenderDescription">
            Lender description <span className="text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Textarea
            id="lenderDescription"
            value={draft.lenderDescription}
            onChange={(event) => onChange("lenderDescription", event.target.value)}
            rows={2}
            className="min-h-20 rounded-xl bg-background"
          />
          <FieldDescription>
            Add your lending focus and operating approach if helpful.
          </FieldDescription>
          <FieldErrorHelper message={errors.lenderDescription} />
        </Field>

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={onBack}
          >
            Back
          </Button>
          <Button
            type="button"
            className="h-11 rounded-xl font-semibold"
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      </FieldGroup>
    </StepCard>
  );
}

function ReviewStep({
  draft,
  formAction,
  pending,
  state,
  onBack,
}: {
  draft: LenderDetailsDraft;
  formAction: (formData: FormData) => void;
  pending: boolean;
  state: LenderDetailsSaveState;
  onBack: () => void;
}) {
  return (
    <form action={formAction}>
      <StepCard
        stepLabel="Part 3 of 3"
        title="Review / Save"
        description="Let the lender review all filled details before submitting."
      >
        <div className="grid gap-4">
          {state.status === "error" && state.message ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <ReviewSection
            title="Organization Details"
            editHref="/lender/edit-profile/organization"
            rows={[
              ["Organization name", draft.organizationName],
              ["Contact person", draft.contactPerson],
              ["Phone number", draft.phoneNumber],
              ["Business registration", draft.businessRegistrationNumber],
            ]}
          />
          <ReviewSection
            title="Business Address"
            editHref="/lender/edit-profile/organization"
            rows={[
              ["Region", draft.address.regionName],
              ["City / Municipality", draft.address.cityOrMunicipality],
              ["Barangay", draft.address.barangay],
              ["ZIP Code", draft.address.zipCode],
              ["Street / Building / Unit", draft.streetAddress],
            ]}
          />
          <ReviewSection
            title="Lending Details"
            editHref="/lender/edit-profile/lending"
            rows={[
              ["Minimum loan amount", formatMoney(draft.minLoanAmount)],
              ["Maximum loan amount", formatMoney(draft.maxLoanAmount)],
              ["Typical repayment terms", draft.typicalRepaymentTerms],
              ["Lender description", draft.lenderDescription],
            ]}
          />

          <HiddenDraftFields draft={draft} />

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={onBack}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl font-semibold"
              disabled={pending}
            >
              {pending ? "Saving..." : "Save lender details"}
            </Button>
          </div>
        </div>
      </StepCard>
    </form>
  );
}

function StepCard({
  children,
  description,
  stepLabel,
  title,
}: {
  children: React.ReactNode;
  description: string;
  stepLabel: string;
  title: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {stepLabel}
        </p>
        <CardTitle className="text-2xl tracking-tight">{title}</CardTitle>
        <CardDescription className="text-sm leading-6">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ReviewSection({
  editHref,
  rows,
  title,
}: {
  editHref: string;
  rows: Array<[string, string]>;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-muted/25 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg">
          <Link href={editHref}>Edit</Link>
        </Button>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1">
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm leading-6 text-foreground">
              {value.trim() || "Not provided"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HiddenDraftFields({ draft }: { draft: LenderDetailsDraft }) {
  return (
    <>
      <input type="hidden" name="organizationName" value={draft.organizationName} />
      <input type="hidden" name="contactPerson" value={draft.contactPerson} />
      <input type="hidden" name="phoneNumber" value={draft.phoneNumber} />
      <input
        type="hidden"
        name="businessRegistrationNumber"
        value={draft.businessRegistrationNumber}
      />
      <input
        type="hidden"
        name="addressRegionCode"
        value={draft.address.regionCode}
      />
      <input
        type="hidden"
        name="addressRegionName"
        value={draft.address.regionName}
      />
      <input
        type="hidden"
        name="addressCity"
        value={draft.address.cityOrMunicipality}
      />
      <input type="hidden" name="addressBarangay" value={draft.address.barangay} />
      <input type="hidden" name="addressZipCode" value={draft.address.zipCode} />
      <input type="hidden" name="streetAddress" value={draft.streetAddress} />
      <input type="hidden" name="minLoanAmount" value={draft.minLoanAmount} />
      <input type="hidden" name="maxLoanAmount" value={draft.maxLoanAmount} />
      <input
        type="hidden"
        name="typicalRepaymentTerms"
        value={draft.typicalRepaymentTerms}
      />
      <input
        type="hidden"
        name="lenderDescription"
        value={draft.lenderDescription}
      />
    </>
  );
}

function getInitialDraft(
  profile: LenderDetailsProfile,
  restoredValues?: Record<string, string>,
): LenderDetailsDraft {
  const defaultAddress = getDefaultAddress(profile);

  return {
    organizationName:
      restoredValues?.organizationName ?? profile.organization_name ?? "",
    contactPerson: restoredValues?.contactPerson ?? profile.contact_person ?? "",
    phoneNumber: restoredValues?.phoneNumber ?? profile.phone_number ?? "",
    businessRegistrationNumber:
      restoredValues?.businessRegistrationNumber ??
      profile.business_registration_number ??
      "",
    address: defaultAddress ?? createEmptyAddressSelection(),
    streetAddress:
      restoredValues?.streetAddress ??
      (defaultAddress ? "" : profile.business_address ?? ""),
    minLoanAmount:
      restoredValues?.minLoanAmount ??
      (profile.min_loan_amount == null ? "" : String(profile.min_loan_amount)),
    maxLoanAmount:
      restoredValues?.maxLoanAmount ??
      (profile.max_loan_amount == null ? "" : String(profile.max_loan_amount)),
    typicalRepaymentTerms:
      restoredValues?.typicalRepaymentTerms ??
      profile.typical_repayment_terms ??
      "",
    lenderDescription:
      restoredValues?.lenderDescription ?? profile.lender_description ?? "",
  };
}

function getDefaultAddress(profile: LenderDetailsProfile) {
  if (
    !profile.address_region ||
    !profile.address_city_or_municipality ||
    !profile.address_barangay ||
    !profile.address_zip_code
  ) {
    return null;
  }

  return {
    regionCode: profile.address_region,
    regionName: profile.operating_area ?? "",
    cityOrMunicipality: profile.address_city_or_municipality,
    barangay: profile.address_barangay,
    zipCode: profile.address_zip_code,
  };
}

function validateOrganizationStep(draft: LenderDetailsDraft): DraftErrors {
  const errors: DraftErrors = {};

  if (draft.organizationName.trim().length < 2) {
    errors.organizationName = "Organization name must be at least 2 characters.";
  }

  if (draft.contactPerson.trim().length < 2) {
    errors.contactPerson = "Contact person must be at least 2 characters.";
  }

  if (draft.phoneNumber.trim().length < 7) {
    errors.phoneNumber = "Phone number must be at least 7 characters.";
  }

  if (!draft.address.regionCode) {
    errors.addressRegion = "Select a region.";
  }

  if (!draft.address.cityOrMunicipality) {
    errors.addressCity = "Select a city or municipality.";
  }

  if (!draft.address.barangay) {
    errors.addressBarangay = "Select a barangay.";
  }

  if (!draft.address.zipCode) {
    errors.addressZipCode = "Enter a ZIP code.";
  }

  return errors;
}

function validateLendingStep(draft: LenderDetailsDraft): DraftErrors {
  const errors: DraftErrors = {};
  const minLoanAmount = Number(draft.minLoanAmount);
  const maxLoanAmount = Number(draft.maxLoanAmount);

  if (!Number.isFinite(minLoanAmount) || minLoanAmount <= 0) {
    errors.minLoanAmount = "Enter the minimum loan amount.";
  }

  if (!Number.isFinite(maxLoanAmount) || maxLoanAmount <= 0) {
    errors.maxLoanAmount = "Enter the maximum loan amount.";
  } else if (Number.isFinite(minLoanAmount) && maxLoanAmount < minLoanAmount) {
    errors.maxLoanAmount =
      "Maximum loan amount must be greater than or equal to minimum.";
  }

  if (!typicalRepaymentTermOptions.includes(draft.typicalRepaymentTerms as never)) {
    errors.typicalRepaymentTerms = "Select your typical repayment terms.";
  }

  return errors;
}

function subscribeToDraft(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === draftStorageKey) {
      onStoreChange();
    }
  };

  window.addEventListener(draftChangedEvent, onStoreChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(draftChangedEvent, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function getDraftSnapshot(baseDraft: LenderDetailsDraft) {
  const savedDraft = readSavedDraft();
  const snapshotKey = JSON.stringify({ baseDraft, savedDraft });

  if (snapshotKey === cachedSnapshotKey && cachedSnapshotValue) {
    return cachedSnapshotValue;
  }

  cachedSnapshotKey = snapshotKey;
  cachedSnapshotValue = {
    ...baseDraft,
    ...savedDraft,
  };

  return cachedSnapshotValue;
}

function readSavedDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(draftStorageKey);

    if (!rawDraft) {
      return null;
    }

    if (rawDraft === cachedDraftRaw) {
      return cachedDraftValue;
    }

    cachedDraftRaw = rawDraft;
    cachedDraftValue = JSON.parse(rawDraft) as Partial<LenderDetailsDraft>;

    return cachedDraftValue;
  } catch {
    cachedDraftRaw = null;
    cachedDraftValue = null;
    return null;
  }
}

function writeDraft(draft: LenderDetailsDraft) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const serializedDraft = JSON.stringify(draft);
    cachedDraftRaw = serializedDraft;
    cachedDraftValue = draft;
    cachedSnapshotKey = null;
    cachedSnapshotValue = null;
    window.localStorage.setItem(draftStorageKey, serializedDraft);
    window.dispatchEvent(new Event(draftChangedEvent));
  } catch {
    // Draft persistence is best effort; the controlled fields still keep state.
  }
}

function clearDraft() {
  if (typeof window === "undefined") {
    return;
  }

  cachedDraftRaw = null;
  cachedDraftValue = null;
  cachedSnapshotKey = null;
  cachedSnapshotValue = null;
  window.localStorage.removeItem(draftStorageKey);
  window.dispatchEvent(new Event(draftChangedEvent));
}

function getServerErrors(state: LenderDetailsSaveState): DraftErrors {
  return {
    organizationName: state.fieldErrors?.organizationName?.[0],
    contactPerson: state.fieldErrors?.contactPerson?.[0],
    phoneNumber: state.fieldErrors?.phoneNumber?.[0],
    businessRegistrationNumber:
      state.fieldErrors?.businessRegistrationNumber?.[0],
    streetAddress: state.fieldErrors?.streetAddress?.[0],
    addressRegion: state.fieldErrors?.addressRegion?.[0],
    addressCity: state.fieldErrors?.addressCity?.[0],
    addressBarangay: state.fieldErrors?.addressBarangay?.[0],
    addressZipCode: state.fieldErrors?.addressZipCode?.[0],
    minLoanAmount: state.fieldErrors?.minLoanAmount?.[0],
    maxLoanAmount: state.fieldErrors?.maxLoanAmount?.[0],
    typicalRepaymentTerms: state.fieldErrors?.typicalRepaymentTerms?.[0],
    lenderDescription: state.fieldErrors?.lenderDescription?.[0],
  };
}

function formatMoney(value: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }

  return `PHP ${new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

function FieldErrorHelper({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <FieldError>{message}</FieldError>;
}
