import * as schema from "@/services/db/schema";
import { defineRelations } from "drizzle-orm";

export const relations = defineRelations(schema, (relation) => ({
  organizationMemberTable: {
    orgnaization: relation.one.organizationTable({
      from: relation.organizationMemberTable.organizationId,
      to: relation.organizationTable.id,
    }),
    user: relation.one.profileTable({
      from: relation.organizationMemberTable.userId,
      to: relation.profileTable.id,
    }),
  },

  organizationTable: {
    orgType: relation.one.orgTypesTable({
      from: relation.organizationTable.orgTypeId,
      to: relation.orgTypesTable.id,
    }),
    members: relation.many.organizationMemberTable(),
  },
}));
