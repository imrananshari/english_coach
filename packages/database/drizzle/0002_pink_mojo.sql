CREATE TABLE "assessment_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"questions" jsonb NOT NULL,
	"selected_goal" text NOT NULL,
	"daily_learning_minutes" integer NOT NULL,
	"status" "activity_status" DEFAULT 'in-progress' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_sessions_user_status_idx" ON "assessment_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "assessment_sessions_expires_at_idx" ON "assessment_sessions" USING btree ("expires_at");