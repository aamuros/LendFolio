"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import {
  saveLenderDetailsAction,
  type LenderDetailsSaveState,
} from "@/app/lender/actions";
import {
  createEmptyAddressSelection,
  AddressSelect,
} from "@/components/address/address-select";
import type { AddressSelectValue } from "@/components/address/address-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { typicalRepaymentTermOptions } from "@/lib/lender-onboarding";

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

const initialState: LenderDetailsSaveState = {
  status: "idle",
  message: "",
};

export function LenderDetailsCompletionForm({
  lenderProfile,
}: {
  lenderProfile: LenderDetailsProfile;
}) {
  const [state, formAction, pending] = useActionState(
    saveLenderDetailsAction,
    initialState,
  );
  const restoredValues = state.values;
  const defaultAddress = getDefaultAddress(lenderProfile);
  const [addressSelection, setAddressSelection] = useState<AddressSelectValue>(
    defaultAddress ?? createEmptyAddressSelection(),
  );
  const [streetAddress, setStreetAddress] = useState(
    restoredValues?.streetAddress ??
      (defaultAddress ? "" : lenderProfile.business_address ?? ""),
  );
  const [repaymentTerms, setRepaymentTerms] = useState(
    restoredValues?.typicalRepaymentTerms ??
      lenderProfile.typical_repayment_terms ??
      "",
  );
  const addressErrors: Partial<Record<keyof AddressSelectValue, string>> = {
    regionCode: state.fieldErrors?.addressRegion?.[0],
    cityOrMunicipality: state.fieldErrors?.addressCity?.[0],
    barangay: state.fieldErrors?.addressBarangay?.[0],
    zipCode: state.fieldErrors?.addressZipCode?.[0],
  };

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-5">
      <div className="flex items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href="/lender?tab=profile">
            <ChevronLeft className="size-4" />
            Profile
          </Link>
        </Button>
      </div>

      <div className="grid gap-1">
        <p className="text-sm font-medium text-muted-foreground">
          Edit Profile
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Lender details
        </h1>
      </div>

      <form action={formAction} className="grid gap-5">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Organization Details</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="organizationName">
                    Organization name
                  </FieldLabel>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    defaultValue={
                      restoredValues?.organizationName ??
                      lenderProfile.organization_name ??
                      ""
                    }
                    className="h-12 rounded-xl bg-background"
                    required
                  />
                  <FieldErrorHelper
                    messages={state.fieldErrors?.organizationName}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="contactPerson">
                    Contact person
                  </FieldLabel>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    defaultValue={
                      restoredValues?.contactPerson ??
                      lenderProfile.contact_person ??
                      ""
                    }
                    className="h-12 rounded-xl bg-background"
                    required
                  />
                  <FieldErrorHelper
                    messages={state.fieldErrors?.contactPerson}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="phoneNumber">Phone number</FieldLabel>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    defaultValue={
                      restoredValues?.phoneNumber ??
                      lenderProfile.phone_number ??
                      ""
                    }
                    className="h-12 rounded-xl bg-background"
                    required
                  />
                  <FieldErrorHelper
                    messages={state.fieldErrors?.phoneNumber}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="businessRegistrationNumber">
                    Business registration
                  </FieldLabel>
                  <Input
                    id="businessRegistrationNumber"
                    name="businessRegistrationNumber"
                    defaultValue={
                      restoredValues?.businessRegistrationNumber ??
                      lenderProfile.business_registration_number ??
                      ""
                    }
                    className="h-12 rounded-xl bg-background"
                  />
                  <FieldDescription>
                    SEC, DTI, or CDA number if applicable.
                  </FieldDescription>
                  <FieldErrorHelper
                    messages={state.fieldErrors?.businessRegistrationNumber}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel>Business address</FieldLabel>
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
                  idPrefix="lender-edit-address"
                  required
                  errors={addressErrors}
                  streetAddress={streetAddress}
                  onStreetAddressChange={setStreetAddress}
                  streetAddressError={state.fieldErrors?.streetAddress?.[0]}
                  legacyAddress={
                    defaultAddress == null && lenderProfile.business_address
                      ? lenderProfile.business_address
                      : null
                  }
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Lending Details</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="minLoanAmount">
                    Minimum loan amount
                  </FieldLabel>
                  <Input
                    id="minLoanAmount"
                    name="minLoanAmount"
                    type="number"
                    inputMode="decimal"
                    defaultValue={
                      restoredValues?.minLoanAmount ??
                      lenderProfile.min_loan_amount ??
                      ""
                    }
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
                    Maximum loan amount
                  </FieldLabel>
                  <Input
                    id="maxLoanAmount"
                    name="maxLoanAmount"
                    type="number"
                    inputMode="decimal"
                    defaultValue={
                      restoredValues?.maxLoanAmount ??
                      lenderProfile.max_loan_amount ??
                      ""
                    }
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
                  Typical repayment terms
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
                <FieldErrorHelper
                  messages={state.fieldErrors?.typicalRepaymentTerms}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="lenderDescription">
                  Lender description
                </FieldLabel>
                <Textarea
                  id="lenderDescription"
                  name="lenderDescription"
                  defaultValue={
                    restoredValues?.lenderDescription ??
                    lenderProfile.lender_description ??
                    ""
                  }
                  rows={4}
                  className="rounded-xl bg-background"
                />
                <FieldDescription>
                  Describe your lending focus and operating approach.
                </FieldDescription>
                <FieldErrorHelper
                  messages={state.fieldErrors?.lenderDescription}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Review / Save</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {state.message ? (
              <Alert variant={state.status === "success" ? "default" : "destructive"}>
                {state.status === "success" ? <CheckCircle2 /> : null}
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                asChild
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
              >
                <Link href="/lender?tab=profile">Back</Link>
              </Button>
              <Button
                type="submit"
                className="h-11 rounded-xl font-semibold"
                disabled={pending}
              >
                {pending ? "Saving..." : "Save lender details"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
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

function FieldErrorHelper({ messages }: { messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return <FieldError>{messages[0]}</FieldError>;
}
