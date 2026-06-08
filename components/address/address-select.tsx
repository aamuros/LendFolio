"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { PhilippineAddressSelection } from "@/lib/philippine-addresses";
import {
  getRegions,
  getCitiesByRegion,
  getBarangaysByCity,
  getZipCodeByCity,
} from "@/lib/philippine-addresses";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AddressSelectValue = PhilippineAddressSelection;

export type AddressSelectProps = {
  value: AddressSelectValue;
  onChange: (value: AddressSelectValue) => void;
  idPrefix?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  errors?: Partial<Record<keyof AddressSelectValue, string>>;
  className?: string;
  triggerClassName?: string;
  streetAddress?: string;
  onStreetAddressChange?: (value: string) => void;
  streetAddressError?: string;
  legacyAddress?: string | null;
  showZipCode?: boolean;
};

export function AddressSelect({
  value,
  onChange,
  idPrefix = "address",
  disabled = false,
  readOnly = false,
  required = false,
  errors,
  className,
  triggerClassName,
  streetAddress,
  onStreetAddressChange,
  streetAddressError,
  legacyAddress,
  showZipCode = true,
}: AddressSelectProps) {
  const regions = useMemo(() => getRegions(), []);

  const cities = useMemo(
    () => (value.regionCode ? getCitiesByRegion(value.regionCode) : []),
    [value.regionCode],
  );

  const barangays = useMemo(
    () =>
      value.regionCode && value.cityOrMunicipality
        ? getBarangaysByCity(value.regionCode, value.cityOrMunicipality)
        : [],
    [value.regionCode, value.cityOrMunicipality],
  );

  const zipCode = useMemo(
    () =>
      value.regionCode && value.cityOrMunicipality
        ? getZipCodeByCity(value.regionCode, value.cityOrMunicipality)
        : null,
    [value.regionCode, value.cityOrMunicipality],
  );

  useEffect(() => {
    if (
      zipCode &&
      value.cityOrMunicipality &&
      value.zipCode !== zipCode
    ) {
      onChange({ ...value, zipCode });
    }
  }, [zipCode, value, onChange]);

  const handleRegionChange = useCallback(
    (regionCode: string) => {
      if (readOnly) return;

      const region = regions.find((r) => r.code === regionCode);
      onChange({
        regionCode,
        regionName: region?.name ?? regionCode,
        cityOrMunicipality: "",
        barangay: "",
        zipCode: "",
      });
    },
    [readOnly, regions, onChange],
  );

  const handleCityChange = useCallback(
    (city: string) => {
      if (readOnly) return;

      const newZip = getZipCodeByCity(value.regionCode, city) ?? "";
      onChange({
        ...value,
        cityOrMunicipality: city,
        barangay: "",
        zipCode: newZip,
      });
    },
    [readOnly, value, onChange],
  );

  const handleBarangayChange = useCallback(
    (barangay: string) => {
      if (readOnly) return;

      onChange({ ...value, barangay });
    },
    [readOnly, value, onChange],
  );

  const showZipDropdown = false;
  const hasLegacyAddress = Boolean(legacyAddress?.trim());

  return (
    <div className={className}>
      {hasLegacyAddress ? (
        <p className="mb-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium">Current address:</span>{" "}
          {legacyAddress}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <label
            htmlFor={`${idPrefix}-region`}
            className="text-foreground text-sm font-medium"
          >
            Region {required ? <span className="text-destructive">*</span> : null}
          </label>
          <Select
            value={value.regionCode}
            onValueChange={handleRegionChange}
            disabled={disabled}
            required={required}
          >
            <SelectTrigger
              id={`${idPrefix}-region`}
              className={triggerClassName ?? "h-12 min-h-12 w-full rounded-xl bg-background"}
              aria-disabled={readOnly || undefined}
              aria-invalid={Boolean(errors?.regionCode)}
              aria-describedby={
                errors?.regionCode ? `${idPrefix}-region-error` : undefined
              }
            >
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region.code} value={region.code}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.regionCode ? (
            <span
              id={`${idPrefix}-region-error`}
              className="text-sm leading-5 text-destructive"
            >
              {errors.regionCode}
            </span>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor={`${idPrefix}-city`}
            className="text-foreground text-sm font-medium"
          >
            City / Municipality{" "}
            {required ? <span className="text-destructive">*</span> : null}
          </label>
          <Select
            value={value.cityOrMunicipality}
            onValueChange={handleCityChange}
            disabled={disabled || !value.regionCode}
            required={required}
          >
            <SelectTrigger
              id={`${idPrefix}-city`}
              className={triggerClassName ?? "h-12 min-h-12 w-full rounded-xl bg-background"}
              aria-disabled={readOnly || undefined}
              aria-invalid={Boolean(errors?.cityOrMunicipality)}
              aria-describedby={
                errors?.cityOrMunicipality
                  ? `${idPrefix}-city-error`
                  : undefined
              }
            >
              <SelectValue
                placeholder={
                  value.regionCode
                    ? "Select city / municipality"
                    : "Select a region first"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.cityOrMunicipality ? (
            <span
              id={`${idPrefix}-city-error`}
              className="text-sm leading-5 text-destructive"
            >
              {errors.cityOrMunicipality}
            </span>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <label
            htmlFor={`${idPrefix}-barangay`}
            className="text-foreground text-sm font-medium"
          >
            Barangay {required ? <span className="text-destructive">*</span> : null}
          </label>
          <Select
            value={value.barangay}
            onValueChange={handleBarangayChange}
            disabled={disabled || !value.cityOrMunicipality}
            required={required}
          >
            <SelectTrigger
              id={`${idPrefix}-barangay`}
              className={triggerClassName ?? "h-12 min-h-12 w-full rounded-xl bg-background"}
              aria-disabled={readOnly || undefined}
              aria-invalid={Boolean(errors?.barangay)}
              aria-describedby={
                errors?.barangay ? `${idPrefix}-barangay-error` : undefined
              }
            >
              <SelectValue
                placeholder={
                  value.cityOrMunicipality
                    ? "Select barangay"
                    : "Select a city first"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {barangays.map((barangay) => (
                <SelectItem key={barangay} value={barangay}>
                  {barangay}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.barangay ? (
            <span
              id={`${idPrefix}-barangay-error`}
              className="text-sm leading-5 text-destructive"
            >
              {errors.barangay}
            </span>
          ) : null}
        </div>

        {showZipCode ? (
          <div className="grid gap-1.5">
            <label
              htmlFor={`${idPrefix}-zipCode`}
              className="text-foreground text-sm font-medium"
            >
              ZIP Code {required ? <span className="text-destructive">*</span> : null}
            </label>
            {showZipDropdown && value.cityOrMunicipality ? (
              <Select
                value={value.zipCode}
                onValueChange={(zip) => {
                  if (readOnly) return;

                  onChange({ ...value, zipCode: zip });
                }}
                disabled={disabled || !value.cityOrMunicipality}
                required={required}
              >
                <SelectTrigger
                  id={`${idPrefix}-zipCode`}
                  className={triggerClassName ?? "h-12 min-h-12 w-full rounded-xl bg-background"}
                  aria-disabled={readOnly || undefined}
                  aria-invalid={Boolean(errors?.zipCode)}
                  aria-describedby={
                    errors?.zipCode ? `${idPrefix}-zipCode-error` : undefined
                  }
                >
                  <SelectValue placeholder="Select ZIP code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={value.zipCode}>{value.zipCode}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div
                id={`${idPrefix}-zipCode`}
                className="flex h-12 min-h-12 items-center rounded-xl border border-input bg-muted/30 px-3 text-sm"
                aria-invalid={Boolean(errors?.zipCode)}
                aria-describedby={
                  errors?.zipCode ? `${idPrefix}-zipCode-error` : undefined
                }
              >
                {value.zipCode || (value.cityOrMunicipality ? "—" : "Select a city first")}
              </div>
            )}
            {errors?.zipCode ? (
              <span
                id={`${idPrefix}-zipCode-error`}
                className="text-sm leading-5 text-destructive"
              >
                {errors.zipCode}
              </span>
            ) : null}
          </div>
        ) : null}

        {onStreetAddressChange ? (
          <div className="grid gap-1.5 sm:col-span-2">
            <label
              htmlFor={`${idPrefix}-street`}
              className="text-foreground text-sm font-medium"
            >
              Street / Building / Unit{" "}
              {required ? null : (
                <span className="text-muted-foreground">(optional)</span>
              )}
            </label>
            <input
              type="text"
              id={`${idPrefix}-street`}
              value={streetAddress ?? ""}
              onChange={(e) => onStreetAddressChange(e.target.value)}
              placeholder="e.g. 123 Main St, Unit 4B"
              disabled={disabled}
              maxLength={240}
              className="h-12 rounded-xl border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-invalid={Boolean(streetAddressError)}
              aria-describedby={
                streetAddressError
                  ? `${idPrefix}-street-error`
                  : undefined
              }
            />
            {streetAddressError ? (
              <span
                id={`${idPrefix}-street-error`}
                className="text-sm leading-5 text-destructive"
              >
                {streetAddressError}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function createEmptyAddressSelection(): AddressSelectValue {
  return {
    regionCode: "",
    regionName: "",
    cityOrMunicipality: "",
    barangay: "",
    zipCode: "",
  };
}

export function isAddressSelectionComplete(
  value: Partial<AddressSelectValue>,
): value is AddressSelectValue {
  return Boolean(
    value.regionCode &&
      value.cityOrMunicipality &&
      value.barangay &&
      value.zipCode,
  );
}
