ALTER TABLE "order" ADD COLUMN "delivery_fee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "delivery_zone_label" text;--> statement-breakpoint
CREATE UNIQUE INDEX "review_customer_product_uniq" ON "review" USING btree ("customer_id","product_id");