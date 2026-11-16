CREATE TABLE "hero_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_ar" text DEFAULT '' NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"desktop_url" text NOT NULL,
	"mobile_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hero_slides_sort_idx" ON "hero_slides" USING btree ("sort_order");