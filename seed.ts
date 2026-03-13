import { db } from "@/services/db/client";
import { orgTypesTable } from "@/services/db/schema";

async function seed() {
  await db
    .insert(orgTypesTable)
    .values([
      { code: "educationalInstitute", label: "Educational Insitute" },
      { code: "sportsAcademy", label: "Sports Academy" },
      { code: "sportsClub", label: "Sports Club" },
      { code: "corporate", label: "Corporate" },
      { code: "other", label: "Other" },
    ])
    .onConflictDoNothing();
}

seed().then(() => process.exit());
