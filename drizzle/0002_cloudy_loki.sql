ALTER TABLE "files" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "files_user_deleted_idx" ON "files" USING btree ("user_id","deleted_at");