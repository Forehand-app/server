import { Value } from "@sinclair/typebox/value";
import { t } from "elysia";

const typeCaster = t.Array(
  t.Object({
    tournamentId: t.String(),
    name: t.String(),
    sportsOptionCode: t.String(),
    eventFormatCode: t.String(),
    dueDate: t.String(),
    startDate: t.String(),
    gender: t.Nullable(t.UnionEnum(["male", "female"])),
    teamTypeCode: t.String(),
    setsPerMatch: t.Number(),
    pointsPerSet: t.Number(),
    playersBornAfter: t.Nullable(t.String()),
    paymentModeCode: t.Nullable(t.String()),
    amount: t.Number(),
  }),
);

Value.Parse(typeCaster, [
  {
    tournamentId: "1fcc4b88-e2ec-41c4-b7be-a26e0239fadf",
    name: "1",
    sportsOptionCode: "pickleBall",
    eventFormatCode: "singleKnockoutElimination",
    dueDate: "2026-03-21T00:00:00.000",
    startDate: "2026-03-22T00:00:00.000",
    gender: null,
    teamTypeCode: "singles",
    pointsPerSet: 11,
    setsPerMatch: 1,
    playersBornAfter: "2009-03-20T00:00:00.000",
    paymentModeCode: null,
    paymentMode: null,
    amount: 0,
  },
]);
