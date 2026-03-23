ALTER TABLE "match_table" DROP CONSTRAINT "match_table_FQRT9ENjeE92_fkey";--> statement-breakpoint
ALTER TABLE "match_table" DROP CONSTRAINT "match_table_points_per_set_points_per_set_options_table_id_fkey";--> statement-breakpoint
ALTER TABLE "event_table" DROP CONSTRAINT "event_table_2AKfQS4P1GrZ_fkey";--> statement-breakpoint
ALTER TABLE "event_table" DROP CONSTRAINT "event_table_FQRT9ENpKDAN_fkey";--> statement-breakpoint
DROP TABLE "points_per_set_options_table";--> statement-breakpoint
DROP TABLE "sets_per_match_options_table";--> statement-breakpoint
ALTER TABLE "match_table" ADD COLUMN "sets_per_match" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "event_table" ADD COLUMN "points_per_set" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "event_table" ADD COLUMN "sets_per_match" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "match_table" DROP COLUMN "sets_per_match_id";--> statement-breakpoint
ALTER TABLE "event_table" DROP COLUMN "points_per_set_id";--> statement-breakpoint
ALTER TABLE "event_table" DROP COLUMN "sets_per_match_id";