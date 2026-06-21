import { describe, expect, it } from "vitest";
import {
  borrowerBusinessAddressSchema,
  copyHomeAddressToBusinessAddress,
  normalizeBorrowerBusinessAddressFields,
} from "@/lib/borrower-portfolio";
import {
  getBarangaysByCity,
  isValidPhilippineAddressSelection,
} from "@/lib/philippine-addresses";

describe("borrower business address sync", () => {
  it("uses factual PSGC barangay options for NCR city selections", () => {
    expect(getBarangaysByCity("NCR", "Manila")).not.toContain("Sampaloc");
    expect(getBarangaysByCity("NCR", "Manila")).toContain("Barangay 435");
    expect(getBarangaysByCity("NCR", "Makati")).toContain("Bel-Air");
    expect(getBarangaysByCity("NCR", "Quezon City")).not.toContain("Diliman");
    expect(getBarangaysByCity("NCR", "Quezon City")).toContain("U.P. Campus");
  });

  it("rejects district or neighborhood names entered as barangays", () => {
    expect(
      isValidPhilippineAddressSelection({
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Manila",
        barangay: "Sampaloc",
        zipCode: "1000",
      }),
    ).toBe(false);
  });

  it("accepts editable 4-digit ZIP codes for a valid region, city, and barangay", () => {
    expect(
      isValidPhilippineAddressSelection({
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Taguig",
        barangay: "Fort Bonifacio",
        zipCode: "1634",
      }),
    ).toBe(true);
  });

  it("accepts the home address step when ZIP code is provided", () => {
    const result = borrowerBusinessAddressSchema.safeParse({
      operatingModel: "physical_store",
      country: "Philippines",
      isBusinessAddressSameAsHome: false,
      homeAddress: "",
      homeAddressSelection: {
        regionCode: "CAR",
        regionName: "CAR - Cordillera Administrative Region",
        cityOrMunicipality: "Tabuk",
        barangay: "Bulanao",
        zipCode: "3800",
      },
      homeStreetAddress: "37 Luzon Street",
      address: {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Taguig",
        barangay: "Upper Bicutan",
        zipCode: "1630",
      },
      streetAddress: "Unit 7, 55 Kalayaan Avenue",
    });

    expect(result.success).toBe(true);
  });

  it("rejects incomplete or non-numeric ZIP codes", () => {
    expect(
      isValidPhilippineAddressSelection({
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Taguig",
        barangay: "Fort Bonifacio",
        zipCode: "163",
      }),
    ).toBe(false);

    expect(
      isValidPhilippineAddressSelection({
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Taguig",
        barangay: "Fort Bonifacio",
        zipCode: "16A4",
      }),
    ).toBe(false);
  });

  it("copies the full home address into the business address", () => {
    const copied = copyHomeAddressToBusinessAddress(
      {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Quezon City",
        barangay: "U.P. Campus",
        zipCode: "1100",
      },
      "Unit 2, 123 Maginhawa Street",
    );

    expect(copied).toEqual({
      regionCode: "NCR",
      regionName: "NCR - National Capital Region",
      cityOrMunicipality: "Quezon City",
      barangay: "U.P. Campus",
      zipCode: "1100",
      streetAddress: "Unit 2, 123 Maginhawa Street",
    });
    expect(getBarangaysByCity(copied.regionCode, copied.cityOrMunicipality)).toContain(
      copied.barangay,
    );
  });

  it("keeps the copied barangay aligned when the home address changes", () => {
    const initialCopy = copyHomeAddressToBusinessAddress(
      {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Quezon City",
        barangay: "U.P. Campus",
        zipCode: "1100",
      },
      "Unit 2, 123 Maginhawa Street",
    );
    const updatedCopy = copyHomeAddressToBusinessAddress(
      {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Quezon City",
        barangay: "Batasan Hills",
        zipCode: "1100",
      },
      "Unit 2, 123 Maginhawa Street",
    );

    expect(initialCopy.barangay).toBe("U.P. Campus");
    expect(updatedCopy.barangay).toBe("Batasan Hills");
    expect(
      getBarangaysByCity(updatedCopy.regionCode, updatedCopy.cityOrMunicipality),
    ).toContain(updatedCopy.barangay);
  });

  it("accepts the business address step when same-as-home copied city and barangay are present", () => {
    const copied = copyHomeAddressToBusinessAddress(
      {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Quezon City",
        barangay: "U.P. Campus",
        zipCode: "1100",
      },
      "Unit 2, 123 Maginhawa Street",
    );

    const result = borrowerBusinessAddressSchema.safeParse({
      operatingModel: "physical_store",
      country: "Philippines",
      isBusinessAddressSameAsHome: true,
      homeAddress: "",
      homeAddressSelection: {
        regionCode: copied.regionCode,
        regionName: copied.regionName,
        cityOrMunicipality: copied.cityOrMunicipality,
        barangay: copied.barangay,
        zipCode: copied.zipCode,
      },
      homeStreetAddress: copied.streetAddress,
      address: {
        regionCode: copied.regionCode,
        regionName: copied.regionName,
        cityOrMunicipality: copied.cityOrMunicipality,
        barangay: copied.barangay,
        zipCode: copied.zipCode,
      },
      streetAddress: copied.streetAddress,
    });

    expect(result.success).toBe(true);
  });

  it("validates same-as-home when visible business fields have not updated yet", () => {
    const result = borrowerBusinessAddressSchema.safeParse({
      operatingModel: "physical_store",
      country: "Philippines",
      businessAddress: "",
      isBusinessAddressSameAsHome: true,
      homeAddress: "",
      homeAddressSelection: {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Taguig",
        barangay: "Upper Bicutan",
        zipCode: "1630",
      },
      homeStreetAddress: "#37 Luzon Street",
      address: {
        regionCode: "",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Taguig",
        barangay: "Upper Bicutan",
        zipCode: "1630",
      },
      streetAddress: "",
    });

    expect(result.success).toBe(true);
  });

  it("normalizes same-as-home into the saved business address payload", () => {
    const normalized = normalizeBorrowerBusinessAddressFields({
      operatingModel: "physical_store",
      country: "Philippines",
      businessAddress: "",
      isBusinessAddressSameAsHome: true,
      homeAddressSelection: {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Taguig",
        barangay: "Upper Bicutan",
        zipCode: "1630",
      },
      homeStreetAddress: "#37 Luzon Street",
      address: {
        regionCode: "",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "",
        barangay: "",
        zipCode: "",
      },
      streetAddress: "",
    });

    expect(normalized.address).toMatchObject({
      regionCode: "NCR",
      regionName: "NCR - National Capital Region",
      cityOrMunicipality: "Taguig",
      barangay: "Upper Bicutan",
      zipCode: "1630",
    });
    expect(normalized.streetAddress).toBe("#37 Luzon Street");
    expect(normalized.businessAddress).toBe("#37 Luzon Street");
  });

  it("does not copy the home street address when same-as-home is off", () => {
    const normalized = normalizeBorrowerBusinessAddressFields({
      operatingModel: "physical_store",
      country: "Philippines",
      businessAddress: "",
      isBusinessAddressSameAsHome: false,
      homeAddressSelection: {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Taguig",
        barangay: "Upper Bicutan",
        zipCode: "1630",
      },
      homeStreetAddress: "#37 Luzon Street",
      address: {
        regionCode: "",
        regionName: "",
        cityOrMunicipality: "",
        barangay: "",
        zipCode: "",
      },
      streetAddress: "",
    });

    expect(normalized.streetAddress).toBe("");
    expect(normalized.businessAddress).toBe("");
  });

  it("rejects same-as-home business address submission if source city or barangay is missing", () => {
    const result = borrowerBusinessAddressSchema.safeParse({
      operatingModel: "physical_store",
      country: "Philippines",
      isBusinessAddressSameAsHome: true,
      homeAddress: "",
      homeAddressSelection: {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "",
        barangay: "",
        zipCode: "1100",
      },
      homeStreetAddress: "Unit 2, 123 Maginhawa Street",
      address: {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "",
        barangay: "",
        zipCode: "1100",
      },
      streetAddress: "Unit 2, 123 Maginhawa Street",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.address).toBeDefined();
    }
  });

  it("accepts a manually edited business address after same-as-home is off", () => {
    const result = borrowerBusinessAddressSchema.safeParse({
      operatingModel: "physical_store",
      country: "Philippines",
      isBusinessAddressSameAsHome: false,
      homeAddress: "",
      homeAddressSelection: {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Quezon City",
        barangay: "U.P. Campus",
        zipCode: "1100",
      },
      homeStreetAddress: "Unit 2, 123 Maginhawa Street",
      address: {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Makati",
        barangay: "Poblacion",
        zipCode: "1200",
      },
      streetAddress: "Unit 7, 55 Kalayaan Avenue",
    });

    expect(result.success).toBe(true);
  });
});
