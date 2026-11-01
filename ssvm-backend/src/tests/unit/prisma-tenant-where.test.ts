import { describe, expect, it } from "vitest";
import { flattenWhere } from "../../lib/prisma";

describe("Prisma tenant where normalization", () => {
  it("flattens a real Prisma compound unique selector for its model", () => {
    expect(flattenWhere("FeeCategory", {
      schoolId_name: { schoolId: "school-a", name: "Tuition" },
    })).toEqual({
      schoolId: "school-a",
      name: "Tuition",
    });
  });

  it("preserves an underscore-named relation filter instead of flattening it", () => {
    const where = {
      InterCompanyTransaction_InterCompanyTransaction_fromSchoolIdToschools: {
        some: { fromSchoolId: "school-a" },
      },
    };

    expect(flattenWhere("School", where)).toEqual(where);
  });

  it("preserves ordinary underscore keys that are not compound unique selectors", () => {
    const where = {
      document_repository: { id: "repository-a" },
    };

    expect(flattenWhere("DocumentVersion", where)).toEqual(where);
  });
});
