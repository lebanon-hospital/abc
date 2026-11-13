ALTER TABLE "bookings" ADD COLUMN "request_stage" text DEFAULT 'complete' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "request_key_hash" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_request_key_hash_unique" UNIQUE("request_key_hash");