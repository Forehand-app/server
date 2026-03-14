ALTER TABLE "organization_table" ADD COLUMN "logo_path" text;--> statement-breakpoint
ALTER TABLE "tournament_table" ADD COLUMN "logo_path" text;--> statement-breakpoint
ALTER TABLE "profile_table" ADD COLUMN "profile_pic_path" text;--> statement-breakpoint
ALTER TABLE "organization_table" DROP COLUMN "logo_id";--> statement-breakpoint
ALTER TABLE "tournament_table" DROP COLUMN "logo_id";