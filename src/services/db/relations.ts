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
    tournament: relation.many.tournamentTable(),
  },

  tournamentTable: {
    organization: relation.one.organizationTable({
      from: relation.tournamentTable.organizationId,
      to: relation.organizationTable.id,
    }),
    events: relation.many.eventTable(),
  },

  eventTable: {
    tournament: relation.one.tournamentTable({
      from: relation.eventTable.tournamentId,
      to: relation.tournamentTable.id,
    }),

    sportsOption: relation.one.sportsOptionsTable({
      from: relation.eventTable.sportId,
      to: relation.sportsOptionsTable.id,
    }),

    eventFormat: relation.one.eventFormatsTable({
      from: relation.eventTable.formatId,
      to: relation.eventFormatsTable.id,
    }),

    teamType: relation.one.teamTypesTable({
      from: relation.eventTable.teamTypeId,
      to: relation.teamTypesTable.id,
    }),

    paymentMode: relation.one.paymentModesTable({
      from: relation.eventTable.paymentModeId,
      to: relation.paymentModesTable.id,
    }),

    teams: relation.many.teamTable(),
  },

  teamTable: {
    event: relation.one.eventTable({
      from: relation.teamTable.eventId,
      to: relation.eventTable.id,
    }),

    teamType: relation.one.teamTypesTable({
      from: relation.teamTable.teamTypeId,
      to: relation.teamTypesTable.id,
    }),

    participants: relation.many.teamParticipantTable(),
  },

  teamParticipantTable: {
    team: relation.one.teamTable({
      from: relation.teamParticipantTable.teamId,
      to: relation.teamTable.id,
    }),
  },
}));
