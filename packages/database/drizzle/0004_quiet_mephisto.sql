ALTER TABLE "vocabulary" ADD COLUMN "register" text DEFAULT 'neutral' NOT NULL;--> statement-breakpoint
ALTER TABLE "vocabulary" ADD COLUMN "phrase_patterns" text[];--> statement-breakpoint
ALTER TABLE "vocabulary" ADD COLUMN "conversation_examples" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "vocabulary" ADD COLUMN "content_source" text DEFAULT 'curated' NOT NULL;