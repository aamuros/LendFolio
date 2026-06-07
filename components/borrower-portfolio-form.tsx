"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegisterReturn,
} from "react-hook-form";
import {
  loadBorrowerPortfolio,
  saveBorrowerPortfolio,
} from "@/app/borrower/actions";
import { AddressSelect } from "@/components/address/address-select";
import { CurrencyInput } from "@/components/currency-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import {
  averageCollectionPeriodLabels,
  averageCollectionPeriodOptions,
  borrowerPortfolioSchema,
  borrowerRoleLabels,
  borrowerRoleOptions,
  businessRegistrationTypeLabels,
  businessRegistrationTypeOptions,
  businessScheduleLabels,
  businessScheduleOptions,
  businessTypeLabels,
  businessTypeOptions,
  calculateDisposableIncome,
  calculateNetMonthlyBusinessIncome,
  calculateTotalBusinessExpenses,
  calculateTotalDeclaredAssets,
  calculateTotalExistingDebtPayments,
  calculateTotalHouseholdExpenses,
  getBorrowerPortfolioDefaultValues,
  operatingModelLabels,
  operatingModelOptions,
  ownershipTypeLabels,
  ownershipTypeOptions,
  primarySalesChannelLabels,
  primarySalesChannelOptions,
  revenueConfidenceLabels,
  revenueConfidenceOptions,
  revenuePeriodLabels,
  revenuePeriodOptions,
  type BorrowerPortfolioFormInput,
  type BorrowerPortfolioInput,
} from "@/lib/borrower-portfolio";
import { evaluateBorrowerReadiness } from "@/lib/borrower-readiness";
import { borrowerPortfolioSavedEvent } from "@/lib/borrower-workflow-events";
import { parseMoneyInput } from "@/lib/money-input";

const defaultValues = getBorrowerPortfolioDefaultValues();
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
  const [statusMessage, setStatusMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<BorrowerPortfolioFormInput, unknown, BorrowerPortfolioInput>({
    resolver: zodResolver(borrowerPortfolioSchema) as never,
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const currentValues = useWatch({ control }) as BorrowerPortfolioFormInput;
  const parsedCurrent = borrowerPortfolioSchema.safeParse({
    ...defaultValues,
    ...currentValues,
  });
  const currentPortfolio = parsedCurrent.success
    ? parsedCurrent.data
    : defaultValues;
  const readiness = evaluateBorrowerReadiness(currentPortfolio);

  useEffect(() => {
    let isActive = true;

    startTransition(() => {
      void loadBorrowerPortfolio().then((result) => {
        if (!isActive) return;

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
    if (!successMessage) return;

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
            if (successMessage) setSuccessMessage("");
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
            title="Microbusiness profile"
            description="Complete this once. Loan applications use this saved financial declaration."
          >
            <TextField
              id="mobileNumber"
              label="Mobile number"
              error={errors.mobileNumber?.message}
              register={register("mobileNumber")}
            />
            <NumberField
              id="yearsAtCurrentAddress"
              label="Years at current address"
              error={errors.yearsAtCurrentAddress?.message}
              register={register("yearsAtCurrentAddress", {
                setValueAs: parseMoneyInput,
              })}
              step="0.5"
            />
            <TextField
              id="homeAddress"
              label="Home address"
              error={errors.homeAddress?.message}
              register={register("homeAddress")}
              className="sm:col-span-2"
            />
            <TextField
              id="emergencyContactName"
              label="Emergency contact name"
              error={errors.emergencyContactName?.message}
              register={register("emergencyContactName")}
            />
            <TextField
              id="emergencyContactNumber"
              label="Emergency contact number"
              error={errors.emergencyContactNumber?.message}
              register={register("emergencyContactNumber")}
            />
            <TextField
              id="emergencyContactRelationship"
              label="Emergency contact relationship"
              error={errors.emergencyContactRelationship?.message}
              register={register("emergencyContactRelationship")}
            />
          </FormSection>

          <FormSection title="Business details">
            <TextField
              id="businessName"
              label="Business name"
              error={errors.businessName?.message}
              register={register("businessName")}
            />
            <SelectField
              control={control}
              name="businessType"
              label="Business type"
              options={businessTypeOptions}
              labels={businessTypeLabels}
              error={errors.businessType?.message}
            />
            <SelectField
              control={control}
              name="ownershipType"
              label="Ownership type"
              options={ownershipTypeOptions}
              labels={ownershipTypeLabels}
              error={errors.ownershipType?.message}
            />
            <SelectField
              control={control}
              name="borrowerRole"
              label="Your role"
              options={borrowerRoleOptions}
              labels={borrowerRoleLabels}
              error={errors.borrowerRole?.message}
            />
            <NumberField
              id="yearsInOperation"
              label="Years in operation"
              error={errors.yearsInOperation?.message}
              register={register("yearsInOperation", {
                setValueAs: parseMoneyInput,
              })}
              step="0.5"
            />
            <CheckboxField
              control={control}
              name="isBusinessAddressSameAsHome"
              label="Business address is the same as home"
            />
            <div className="sm:col-span-2">
              <Controller
                control={control}
                name="address"
                render={({ field }) => (
                  <Field
                    label="Business address"
                    error={
                      errors.address?.regionCode?.message ||
                      errors.address?.cityOrMunicipality?.message ||
                      errors.address?.barangay?.message ||
                      errors.address?.zipCode?.message
                    }
                    id="address"
                  >
                    <AddressSelect
                      value={field.value}
                      onChange={field.onChange}
                      idPrefix="borrower-address"
                      errors={{
                        regionCode: errors.address?.regionCode?.message,
                        cityOrMunicipality:
                          errors.address?.cityOrMunicipality?.message,
                        barangay: errors.address?.barangay?.message,
                        zipCode: errors.address?.zipCode?.message,
                      }}
                    />
                  </Field>
                )}
              />
              <div className="mt-4">
                <TextField
                  id="streetAddress"
                  label="Street / building / unit"
                  error={errors.streetAddress?.message}
                  register={register("streetAddress")}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Business operations">
            <SelectField
              control={control}
              name="operatingModel"
              label="Operating model"
              options={operatingModelOptions}
              labels={operatingModelLabels}
              error={errors.operatingModel?.message}
            />
            <SelectField
              control={control}
              name="primarySalesChannel"
              label="Primary sales channel"
              options={primarySalesChannelOptions}
              labels={primarySalesChannelLabels}
              error={errors.primarySalesChannel?.message}
            />
            <SelectField
              control={control}
              name="businessSchedule"
              label="Business schedule"
              options={businessScheduleOptions}
              labels={businessScheduleLabels}
              error={errors.businessSchedule?.message}
            />
            <NumberField
              id="numberOfEmployees"
              label="Number of employees"
              error={errors.numberOfEmployees?.message}
              register={register("numberOfEmployees", {
                setValueAs: parseMoneyInput,
              })}
              step="1"
            />
            <TextAreaField
              id="mainProductsOrServices"
              label="Main products or services"
              error={errors.mainProductsOrServices?.message}
              register={register("mainProductsOrServices")}
            />
            <TextAreaField
              id="mainSuppliers"
              label="Main suppliers"
              error={errors.mainSuppliers?.message}
              register={register("mainSuppliers")}
            />
            <CheckboxField
              control={control}
              name="keepsSalesRecords"
              label="Keeps sales records"
            />
            <CheckboxField
              control={control}
              name="usesBankOrEwallet"
              label="Uses bank or e-wallet"
            />
          </FormSection>

          <FormSection title="Business registration">
            <CheckboxField
              control={control}
              name="hasBusinessRegistration"
              label="Has business registration"
            />
            <SelectField
              control={control}
              name="businessRegistrationType"
              label="Registration type"
              options={businessRegistrationTypeOptions}
              labels={businessRegistrationTypeLabels}
              error={errors.businessRegistrationType?.message}
              optional
            />
            <TextField
              id="registrationNumber"
              label="Registration number"
              error={errors.registrationNumber?.message}
              register={register("registrationNumber")}
            />
            <TextField
              id="registrationDate"
              label="Registration date"
              error={errors.registrationDate?.message}
              register={register("registrationDate")}
              type="date"
            />
            <TextAreaField
              id="unregisteredReason"
              label="If unregistered, reason"
              error={errors.unregisteredReason?.message}
              register={register("unregisteredReason")}
              className="sm:col-span-2"
            />
          </FormSection>

          <FormSection
            title="Business income"
            description="If monthly gross sales is blank, average daily sales is saved as daily sales x 30."
          >
            <MoneyField
              id="averageDailySales"
              label="Average daily sales"
              error={errors.averageDailySales?.message}
              register={register("averageDailySales", {
                setValueAs: parseMoneyInput,
              })}
            />
            <MoneyField
              id="averageWeeklySales"
              label="Average weekly sales"
              error={errors.averageWeeklySales?.message}
              register={register("averageWeeklySales", {
                setValueAs: parseMoneyInput,
              })}
            />
            <MoneyField
              id="monthlyGrossRevenue"
              label="Monthly gross sales"
              error={errors.monthlyGrossRevenue?.message}
              register={register("monthlyGrossRevenue", {
                setValueAs: parseMoneyInput,
              })}
            />
            <SelectField
              control={control}
              name="revenuePeriod"
              label="Revenue period"
              options={revenuePeriodOptions}
              labels={revenuePeriodLabels}
              error={errors.revenuePeriod?.message}
            />
            <SelectField
              control={control}
              name="revenueConfidence"
              label="Revenue basis"
              options={revenueConfidenceOptions}
              labels={revenueConfidenceLabels}
              error={errors.revenueConfidence?.message}
            />
            <MoneyField
              id="bestMonthSales"
              label="Best month sales"
              error={errors.bestMonthSales?.message}
              register={register("bestMonthSales", {
                setValueAs: parseMoneyInput,
              })}
            />
            <MoneyField
              id="worstMonthSales"
              label="Worst month sales"
              error={errors.worstMonthSales?.message}
              register={register("worstMonthSales", {
                setValueAs: parseMoneyInput,
              })}
            />
          </FormSection>

          <FormSection title="Business expenses">
            {businessExpenseFields.map(([name, label]) => (
              <MoneyField
                key={name}
                id={name}
                label={label}
                error={fieldError(errors, name)}
                register={register(name, { setValueAs: parseMoneyInput })}
              />
            ))}
          </FormSection>

          <FormSection title="Household expenses">
            {householdExpenseFields.map(([name, label]) => (
              <MoneyField
                key={name}
                id={name}
                label={label}
                error={fieldError(errors, name)}
                register={register(name, { setValueAs: parseMoneyInput })}
              />
            ))}
            <NumberField
              id="numberOfDependents"
              label="Number of dependents"
              error={errors.numberOfDependents?.message}
              register={register("numberOfDependents", {
                setValueAs: parseMoneyInput,
              })}
              step="1"
            />
            <NumberField
              id="numberOfEarningHouseholdMembers"
              label="Earning household members"
              error={errors.numberOfEarningHouseholdMembers?.message}
              register={register("numberOfEarningHouseholdMembers", {
                setValueAs: parseMoneyInput,
              })}
              step="1"
            />
            <CheckboxField
              control={control}
              name="householdExpensesCompleted"
              label="Household expense declaration is complete"
            />
          </FormSection>

          <FormSection
            title="Existing debts"
            description="Do not include supplier credit for inventory here. It belongs under business expenses."
          >
            <CheckboxField
              control={control}
              name="hasExistingDebts"
              label="Has existing debts or installments"
            />
            {debtFields.map(([name, label]) => (
              <MoneyField
                key={name}
                id={name}
                label={label}
                error={fieldError(errors, name)}
                register={register(name, { setValueAs: parseMoneyInput })}
              />
            ))}
            <CheckboxField
              control={control}
              name="existingDebtDeclarationCompleted"
              label="Existing debt declaration is complete"
            />
          </FormSection>

          <FormSection title="Assets">
            {assetFields.map(([name, label]) => (
              <MoneyField
                key={name}
                id={name}
                label={label}
                error={fieldError(errors, name)}
                register={register(name, { setValueAs: parseMoneyInput })}
              />
            ))}
          </FormSection>

          <FormSection title="Customer credit / pautang">
            <CheckboxField
              control={control}
              name="offersCustomerCredit"
              label="Offers customer credit"
            />
            <MoneyField
              id="estimatedCustomerCreditAmount"
              label="Estimated customer credit amount"
              error={errors.estimatedCustomerCreditAmount?.message}
              register={register("estimatedCustomerCreditAmount", {
                setValueAs: parseMoneyInput,
              })}
            />
            <SelectField
              control={control}
              name="averageCollectionPeriod"
              label="Average collection period"
              options={averageCollectionPeriodOptions}
              labels={averageCollectionPeriodLabels}
              error={errors.averageCollectionPeriod?.message}
              optional
            />
            <CheckboxField
              control={control}
              name="keepsCustomerDebtList"
              label="Keeps a customer debt list"
            />
          </FormSection>

          <FormSection title="Loan use context">
            <TextAreaField
              id="loanPurposeContext"
              label="How loans from LendFolio would support this business"
              error={errors.loanPurposeContext?.message}
              register={register("loanPurposeContext")}
              className="sm:col-span-2"
              rows={4}
            />
          </FormSection>

          <FormSection title="Risk declarations">
            {riskDeclarationFields.map(([name, label]) => (
              <CheckboxField
                key={name}
                control={control}
                name={name}
                label={label}
              />
            ))}
          </FormSection>

          <FormSection title="Consent and confirmation">
            <CheckboxField
              control={control}
              name="confirmsInformationTrue"
              label="I confirm this information is true and complete."
            />
            <CheckboxField
              control={control}
              name="consentsToDataProcessing"
              label="I consent to profile data processing."
            />
            <CheckboxField
              control={control}
              name="consentsToCreditCheck"
              label="I consent to credit review checks."
            />
            <Alert className="sm:col-span-2">
              <AlertDescription>
                Upload valid ID, selfie with ID, proof of address, and business
                proof in borrower verification. Business proof can include store
                photos, inventory photos, sales records, supplier receipts,
                e-wallet history, permits, leases, or platform sales screenshots.
              </AlertDescription>
            </Alert>
          </FormSection>

          <FormSection title="Review summary">
            <div className="sm:col-span-2">
              <ReadinessPanel
                portfolio={currentPortfolio}
                readiness={readiness}
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
              className="h-11 rounded-full font-semibold"
            >
              {isPending ? "Saving..." : "Save business profile"}
            </Button>
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="h-11 rounded-full font-semibold sm:order-first"
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

const businessExpenseFields = [
  ["monthlyInventoryCost", "Inventory cost"],
  ["monthlyBusinessRent", "Business rent"],
  ["monthlyBusinessElectricity", "Business electricity"],
  ["monthlyBusinessWater", "Business water"],
  ["monthlyHelperSalary", "Helper salary"],
  ["monthlyTransportationDelivery", "Transport / delivery"],
  ["monthlyPackagingCost", "Packaging"],
  ["monthlyPlatformFees", "Platform fees"],
  ["monthlyMaintenanceRepairs", "Maintenance / repairs"],
  ["monthlySupplierCreditPayment", "Supplier credit payment"],
  ["otherBusinessExpenses", "Other business expenses"],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string]
>;

const householdExpenseFields = [
  ["monthlyRentOrMortgage", "Rent or mortgage"],
  ["monthlyElectricityBill", "Electricity"],
  ["monthlyWaterBill", "Water"],
  ["monthlyInternetPhoneBill", "Internet / phone"],
  ["monthlyFoodGroceries", "Food / groceries"],
  ["monthlyTransportation", "Household transportation"],
  ["monthlyTuitionEducation", "Tuition / education"],
  ["monthlyMedicalExpenses", "Medical expenses"],
  ["monthlyInsurance", "Insurance"],
  ["monthlyFamilySupport", "Family support"],
  ["otherHouseholdExpenses", "Other household expenses"],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string]
>;

const debtFields = [
  ["personalLoanPayments", "Personal loans"],
  ["businessLoanPayments", "Business loans"],
  ["vehicleLoanPayments", "Vehicle loans"],
  ["homeLoanPayments", "Home loans"],
  ["lendingAppPayments", "Lending apps"],
  ["informalLoanPayments", "Informal loans"],
  ["buyNowPayLaterPayments", "Buy now, pay later"],
  ["creditCardPayments", "Credit card"],
  ["coMakerGuaranteedLoanPayments", "Co-maker guaranteed loans"],
  ["otherDebtPayments", "Other debt payments"],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string]
>;

const assetFields = [
  ["cashOnHand", "Cash on hand"],
  ["bankSavings", "Bank savings"],
  ["ewalletBalance", "E-wallet balance"],
  ["inventoryValue", "Inventory value"],
  ["businessEquipmentValue", "Business equipment"],
  ["vehicleValue", "Vehicle value"],
  ["propertyLandValue", "Property / land"],
  ["otherAssetsValue", "Other assets"],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string]
>;

const riskDeclarationFields = [
  ["hasOverdueLoans", "Has overdue loans"],
  ["missedPaymentsLast12Months", "Missed payments in the last 12 months"],
  ["hasUnpaidLendingAppLoans", "Has unpaid lending app loans"],
  ["hasBouncedChecks", "Has bounced checks"],
  ["isCoMakerOrGuarantor", "Is a co-maker or guarantor"],
  ["hasDebtRelatedLegalCase", "Has a debt-related legal case"],
  ["hasRepossessionHistory", "Has repossession history"],
  ["hasTaxArrears", "Has tax arrears"],
  ["businessTemporarilyStopped", "Business is temporarily stopped"],
  ["confirmsBusinessOperating", "Business is currently operating"],
] as const satisfies ReadonlyArray<
  readonly [keyof BorrowerPortfolioFormInput, string]
>;

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

function SelectField<
  TName extends keyof BorrowerPortfolioFormInput,
  TOption extends string,
>({
  control,
  name,
  label,
  options,
  labels,
  error,
  optional = false,
}: {
  control: Control<BorrowerPortfolioFormInput>;
  name: TName;
  label: string;
  options: readonly TOption[];
  labels: Record<TOption, string>;
  error?: string;
  optional?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field label={label} error={error} id={String(name)}>
          <Select
            onValueChange={(value) => field.onChange(optional ? value || null : value)}
            value={(field.value as string | null | undefined) ?? ""}
          >
            <SelectTrigger id={String(name)} className="w-full">
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {labels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}

function CheckboxField<TName extends keyof BorrowerPortfolioFormInput>({
  control,
  name,
  label,
}: {
  control: Control<BorrowerPortfolioFormInput>;
  name: TName;
  label: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-start gap-3 rounded-md border p-3">
          <Checkbox
            id={String(name)}
            checked={Boolean(field.value)}
            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
          />
          <Label htmlFor={String(name)} className="text-sm leading-5">
            {label}
          </Label>
        </div>
      )}
    />
  );
}

function TextField({
  id,
  label,
  error,
  register,
  className,
  type = "text",
}: FieldControlProps & { type?: string }) {
  return (
    <Field label={label} error={error} id={id} className={className}>
      <Input id={id} type={type} aria-invalid={Boolean(error)} {...register} />
    </Field>
  );
}

function TextAreaField({
  id,
  label,
  error,
  register,
  className,
  rows = 3,
}: FieldControlProps & { rows?: number }) {
  return (
    <Field label={label} error={error} id={id} className={className}>
      <Textarea
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        {...register}
      />
    </Field>
  );
}

function MoneyField({ id, label, error, register }: FieldControlProps) {
  return (
    <Field label={label} error={error} id={id}>
      <CurrencyInput
        id={id}
        aria-invalid={Boolean(error)}
        registration={register}
        emptyValue={0}
      />
    </Field>
  );
}

function NumberField({
  id,
  label,
  error,
  register,
  step,
}: FieldControlProps & { step: string }) {
  return (
    <Field label={label} error={error} id={id}>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        {...register}
      />
    </Field>
  );
}

type FieldControlProps = {
  id: string;
  label: string;
  error?: string;
  register: UseFormRegisterReturn;
  className?: string;
};

function ReadinessPanel({
  portfolio,
  readiness,
}: {
  portfolio: BorrowerPortfolioInput;
  readiness: ReturnType<typeof evaluateBorrowerReadiness>;
}) {
  const totalBusinessExpenses = calculateTotalBusinessExpenses(portfolio);
  const netBusinessIncome = calculateNetMonthlyBusinessIncome(portfolio);
  const totalHouseholdExpenses = calculateTotalHouseholdExpenses(portfolio);
  const totalDebtPayments = calculateTotalExistingDebtPayments(portfolio);
  const disposableIncome = calculateDisposableIncome(portfolio);
  const totalAssets = calculateTotalDeclaredAssets(portfolio);
  const cashBankEwallet =
    portfolio.cashOnHand + portfolio.bankSavings + portfolio.ewalletBalance;

  return (
    <Card className="rounded-xl bg-muted/30">
      <CardContent className="grid gap-4 p-4 text-sm leading-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">Readiness</p>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold capitalize text-muted-foreground">
            {readiness.readinessStatus.replaceAll("_", " ")}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Summary
            label="Business type"
            value={
              portfolio.businessType
                ? businessTypeLabels[portfolio.businessType]
                : "Not provided"
            }
          />
          <Summary label="Business name" value={portfolio.businessName || "Not provided"} />
          <Summary label="Years operating" value={formatPlain(portfolio.yearsInOperation)} />
          <Summary label="Monthly gross sales" value={formatMoney(portfolio.monthlyGrossRevenue)} />
          <Summary label="Business expenses" value={formatMoney(totalBusinessExpenses)} />
          <Summary label="Net business income" value={formatMoney(netBusinessIncome)} />
          <Summary label="Household expenses" value={formatMoney(totalHouseholdExpenses)} />
          <Summary label="Debt payments" value={formatMoney(totalDebtPayments)} />
          <Summary label="Disposable income" value={formatMoney(disposableIncome)} />
          <Summary label="Inventory value" value={formatMoney(portfolio.inventoryValue)} />
          <Summary label="Cash / bank / e-wallet" value={formatMoney(cashBankEwallet)} />
          <Summary label="Declared assets" value={formatMoney(totalAssets)} />
        </div>
        {readiness.missingFields.length ? (
          <p className="text-muted-foreground">
            Missing: {readiness.missingFields.join(", ")}
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
        <p className="font-medium">{readiness.nextActions[0]}</p>
      </CardContent>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function BorrowerPortfolioFormSkeleton() {
  return (
    <section
      className="grid gap-4"
      aria-busy="true"
      aria-label="Loading business profile"
    >
      {Array.from({ length: 4 }).map((_, index) => (
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
    </section>
  );
}

function Field({
  label,
  error,
  id,
  children,
  className,
}: {
  label: string;
  error?: string;
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <span id={`${id}-error`} className="text-sm leading-5 text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function fieldError(
  errors: FieldErrors<BorrowerPortfolioFormInput>,
  field: keyof BorrowerPortfolioFormInput,
) {
  const error = errors[field];

  return typeof error?.message === "string" ? error.message : undefined;
}

function formatMoney(value: number) {
  return `PHP ${new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatPlain(value: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2,
  }).format(value);
}
