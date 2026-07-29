CREATE TABLE "study_room_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"activity_type" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"answer_key" jsonb,
	"status" "activity_status" DEFAULT 'in-progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_room_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"answer" jsonb NOT NULL,
	"is_correct" boolean NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_room_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'joined' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_room_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"message_type" text DEFAULT 'chat' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"host_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"visibility" text DEFAULT 'public' NOT NULL,
	"status" "activity_status" DEFAULT 'in-progress' NOT NULL,
	"max_members" integer DEFAULT 12 NOT NULL,
	"current_activity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_rooms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "study_room_activities" ADD CONSTRAINT "study_room_activities_room_id_study_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."study_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_room_activities" ADD CONSTRAINT "study_room_activities_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_room_answers" ADD CONSTRAINT "study_room_answers_activity_id_study_room_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."study_room_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_room_answers" ADD CONSTRAINT "study_room_answers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_room_members" ADD CONSTRAINT "study_room_members_room_id_study_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."study_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_room_members" ADD CONSTRAINT "study_room_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_room_messages" ADD CONSTRAINT "study_room_messages_room_id_study_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."study_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_room_messages" ADD CONSTRAINT "study_room_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_rooms" ADD CONSTRAINT "study_rooms_host_user_id_user_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "study_room_activities_room_started_idx" ON "study_room_activities" USING btree ("room_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "study_room_answers_activity_user_uidx" ON "study_room_answers" USING btree ("activity_id","user_id");--> statement-breakpoint
CREATE INDEX "study_room_answers_user_idx" ON "study_room_answers" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "study_room_members_room_user_uidx" ON "study_room_members" USING btree ("room_id","user_id");--> statement-breakpoint
CREATE INDEX "study_room_members_user_status_idx" ON "study_room_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "study_room_messages_room_created_idx" ON "study_room_messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "study_rooms_status_created_idx" ON "study_rooms" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "study_rooms_host_idx" ON "study_rooms" USING btree ("host_user_id");