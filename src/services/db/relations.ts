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

    winner: relation.one.teamTable({
      from: relation.eventTable.winnerId,
      to: relation.teamTable.id,
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
    user: relation.one.profileTable({
      from: relation.teamParticipantTable.userId,
      to: relation.profileTable.id,
    }),
  },

  matchTable: {
    event: relation.one.eventTable({
      from: relation.matchTable.eventId,
      to: relation.eventTable.id,
    }),
    teamAData: relation.one.teamTable({
      from: relation.matchTable.teamA,
      to: relation.teamTable.id,
    }),
    teamBData: relation.one.teamTable({
      from: relation.matchTable.teamB,
      to: relation.teamTable.id,
    }),
    winner: relation.one.teamTable({
      from: relation.matchTable.winnerId,
      to: relation.teamTable.id,
    }),
    scorerUser: relation.one.profileTable({
      from: relation.matchTable.scorer,
      to: relation.profileTable.id,
    }),
    sets: relation.many.setTable(),
  },

  setTable: {
    match: relation.one.matchTable({
      from: relation.setTable.matchId,
      to: relation.matchTable.id,
    }),
    winner: relation.one.teamTable({
      from: relation.setTable.winnerId,
      to: relation.teamTable.id,
    }),
  },

  invitesTable: {
    sender: relation.one.profileTable({
      from: relation.invitesTable.senderId,
      to: relation.profileTable.id,
    }),
    receiver: relation.one.profileTable({
      from: relation.invitesTable.receiverId,
      to: relation.profileTable.id,
    }),
    invteType: relation.one.inviteTypeTable({
      from: relation.invitesTable.invteTypeId,
      to: relation.inviteTypeTable.id,
    }),
  },

  organizationInvitesTable: {
    invite: relation.one.invitesTable({
      from: relation.organizationInvitesTable.inviteId,
      to: relation.invitesTable.id,
    }),
    organization: relation.one.organizationTable({
      from: relation.organizationInvitesTable.organizationId,
      to: relation.organizationTable.id,
    }),
  },

  eventInvitesTable: {
    invite: relation.one.invitesTable({
      from: relation.eventInvitesTable.inviteId,
      to: relation.invitesTable.id,
    }),
    event: relation.one.eventTable({
      from: relation.eventInvitesTable.eventId,
      to: relation.eventTable.id,
    }),
    team: relation.one.teamTable({
      from: relation.eventInvitesTable.teamId,
      to: relation.teamTable.id,
    }),
  },

  tournamentInvitesTable: {
    invite: relation.one.invitesTable({
      from: relation.tournamentInvitesTable.inviteId,
      to: relation.invitesTable.id,
    }),
    tournament: relation.one.tournamentTable({
      from: relation.tournamentInvitesTable.tournamentId,
      to: relation.tournamentTable.id,
    }),
  },
}));
