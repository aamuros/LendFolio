import { describe, expect, it } from "vitest";
import {
  borrowerBusinessAddressSchema,
  copyHomeAddressToBusinessAddress,
} from "@/lib/borrower-portfolio";
import { getBarangaysByCity } from "@/lib/philippine-addresses";

describe("borrower business address sync", () => {
  it("copies the full home address into the business address", () => {
    const copied = copyHomeAddressToBusinessAddress(
      {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Quezon City",
        barangay: "Diliman",
        zipCode: "1100",
      },
      "Unit 2, 123 Maginhawa Street",
    );

    expect(copied).toEqual({
      regionCode: "NCR",
      regionName: "NCR - National Capital Region",
      cityOrMunicipality: "Quezon City",
      barangay: "Diliman",
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
        barangay: "Diliman",
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

    expect(initialCopy.barangay).toBe("Diliman");
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
        barangay: "Diliman",
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

  it("rejects same-as-home business address submission if copied city or barangay is missing", () => {
    const result = borrowerBusinessAddressSchema.safeParse({
      operatingModel: "physical_store",
      country: "Philippines",
      isBusinessAddressSameAsHome: true,
      homeAddress: "",
      homeAddressSelection: {
        regionCode: "NCR",
        regionName: "NCR - National Capital Region",
        cityOrMunicipality: "Quezon City",
        barangay: "Diliman",
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
        barangay: "Diliman",
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
