CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"note" text NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "my-todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(256) NOT NULL,
	"password" varchar(256) NOT NULL,
	CONSTRAINT "my-todos_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_user_id_my-todos_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."my-todos"("id") ON DELETE no action ON UPDATE no action;