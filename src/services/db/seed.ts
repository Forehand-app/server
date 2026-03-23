import { db } from "@/services/db/client";
import {
  eventFormatsTable,
  orgTypesTable,
  paymentModesTable,
  sportsOptionsTable,
  teamTypesTable,
} from "@/services/db/schema";
import { notInArray, sql } from "drizzle-orm";

const orgTypes = [
  { code: "educationalInstitute", label: "Educational Institute" },
  { code: "sportsAcademy", label: "Sports Academy" },
  { code: "sportsClub", label: "Sports Club" },
  { code: "corporate", label: "Corporate" },
  { code: "other", label: "Other" },
];

const sportsOptions = [{ code: "pickleBall", label: "Pickle Ball" }];

const teamTypes = [
  { code: "singles", label: "Singles" },
  { code: "doubles", label: "Doubles" },
];

const eventFormats = [
  { code: "singleKnockoutElimination", label: "Single Knockout Elimination" },
];

const paymentModes = [
  { code: "online", label: "Online" },
  { code: "atVenue", label: "At Venue" },
];

async function seedTable({
  table,
  values,
}: {
  table:
    | typeof orgTypesTable
    | typeof sportsOptionsTable
    | typeof teamTypesTable
    | typeof eventFormatsTable
    | typeof paymentModesTable;
  values: { code: string; label: string }[];
}) {
  await db
    .insert(table)
    .values(values)
    .onConflictDoUpdate({
      target: table.code,
      set: { label: sql`excluded.label` },
    });

  await db.delete(table).where(
    notInArray(
      table.code,
      values.map((value) => value.code),
    ),
  );
}

export async function seed() {
  await seedTable({ table: orgTypesTable, values: orgTypes });
  await seedTable({ table: sportsOptionsTable, values: sportsOptions });
  await seedTable({ table: teamTypesTable, values: teamTypes });
  await seedTable({ table: eventFormatsTable, values: eventFormats });
  await seedTable({ table: paymentModesTable, values: paymentModes });
}
