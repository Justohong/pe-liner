CREATE TABLE "price_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_code" varchar(50) NOT NULL,
	"item_name" varchar(255) NOT NULL,
	"unit" varchar(50),
	"unit_price" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	CONSTRAINT "price_list_item_code_unique" UNIQUE("item_code")
);
--> statement-breakpoint
CREATE TABLE "surcharge_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"condition" varchar(100) NOT NULL,
	"description" text,
	"surcharge_type" varchar(50) NOT NULL,
	"value" real NOT NULL,
	"target" varchar(100) NOT NULL,
	CONSTRAINT "surcharge_rules_condition_unique" UNIQUE("condition")
);
--> statement-breakpoint
CREATE TABLE "unit_price_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text,
	"pipe_type" varchar(50) NOT NULL,
	"min_diameter" integer NOT NULL,
	"max_diameter" integer NOT NULL,
	"item_code" varchar(50) NOT NULL,
	"quantity" real NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unit_price_rules" ADD CONSTRAINT "unit_price_rules_item_code_price_list_item_code_fk" FOREIGN KEY ("item_code") REFERENCES "public"."price_list"("item_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "item_code_idx" ON "price_list" USING btree ("item_code");