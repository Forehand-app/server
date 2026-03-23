ALTER TABLE "team_invites_table" RENAME TO "event_invites_table";--> statement-breakpoint
ALTER TABLE "event_invites_table" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "event_invites_table" RENAME CONSTRAINT "team_invites_table_pkey" TO "event_invites_table_pkey";--> statement-breakpoint
ALTER TABLE "event_invites_table" DROP CONSTRAINT "event_invites_table_pkey";--> statement-breakpoint
ALTER TABLE "event_invites_table" ADD PRIMARY KEY ("invite_id","event_id");--> statement-breakpoint
ALTER TABLE "event_invites_table" ALTER COLUMN "team_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_invites_table" ADD CONSTRAINT "event_invites_table_event_id_event_table_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event_table"("id");