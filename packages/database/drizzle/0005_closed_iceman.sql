CREATE TABLE "user_grammar_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"grammar_topic_id" uuid NOT NULL,
	"status" "activity_status" DEFAULT 'in-progress' NOT NULL,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"best_score" integer,
	"attempts" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grammar_topics" ADD COLUMN "summary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "grammar_topics" ADD COLUMN "category" text DEFAULT 'Foundations' NOT NULL;--> statement-breakpoint
ALTER TABLE "grammar_topics" ADD COLUMN "sequence_number" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "grammar_topics" ADD COLUMN "estimated_minutes" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "grammar_topics" ADD COLUMN "structures" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "grammar_topics" ADD COLUMN "rules" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "grammar_topics" ADD COLUMN "exceptions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "grammar_topics" ADD COLUMN "tips" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "grammar_topics" ADD COLUMN "key_vocabulary" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "grammar_topics" ADD COLUMN "practice_questions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_grammar_progress" ADD CONSTRAINT "user_grammar_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_grammar_progress" ADD CONSTRAINT "user_grammar_progress_grammar_topic_id_grammar_topics_id_fk" FOREIGN KEY ("grammar_topic_id") REFERENCES "public"."grammar_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_grammar_progress_user_topic_uidx" ON "user_grammar_progress" USING btree ("user_id","grammar_topic_id");--> statement-breakpoint
CREATE INDEX "user_grammar_progress_user_status_idx" ON "user_grammar_progress" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "grammar_topics_category_sequence_idx" ON "grammar_topics" USING btree ("category","sequence_number");