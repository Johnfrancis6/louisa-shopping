CREATE TYPE "public"."home_slot" AS ENUM('hero', 'rail', 'news', 'process');--> statement-breakpoint
CREATE TABLE "home_block" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot" "home_slot" NOT NULL,
	"eyebrow" text,
	"title" text NOT NULL,
	"body" text,
	"cta_label" text,
	"href" text,
	"image_url" text,
	"image_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "home_block_slot_position_idx" ON "home_block" USING btree ("slot","position");