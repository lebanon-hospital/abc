ALTER TABLE "bookings" ADD COLUMN "payment_type" text DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "insurance_company" text;