CREATE TABLE "grammar_practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"grammar_topic_id" uuid NOT NULL,
	"examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"questions" jsonb NOT NULL,
	"status" "activity_status" DEFAULT 'in-progress' NOT NULL,
	"score" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grammar_practice_sessions" ADD CONSTRAINT "grammar_practice_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grammar_practice_sessions" ADD CONSTRAINT "grammar_practice_sessions_grammar_topic_id_grammar_topics_id_fk" FOREIGN KEY ("grammar_topic_id") REFERENCES "public"."grammar_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grammar_practice_sessions_user_topic_idx" ON "grammar_practice_sessions" USING btree ("user_id","grammar_topic_id");--> statement-breakpoint
CREATE INDEX "grammar_practice_sessions_expires_idx" ON "grammar_practice_sessions" USING btree ("expires_at");