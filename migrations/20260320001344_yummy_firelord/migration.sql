ALTER TABLE "event_table" RENAME COLUMN "event_name" TO "name";--> statement-breakpoint
ALTER TABLE "event_table" ALTER COLUMN "player_born_after" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_table" ALTER COLUMN "payment_mode_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event_table" ALTER COLUMN "winner_id" DROP NOT NULL;