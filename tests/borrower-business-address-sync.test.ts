import { describe, expect, it } from "vitest";
import { copyHomeAddressToBusinessAddress } from "@/lib/borrower-portfolio";
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
});
