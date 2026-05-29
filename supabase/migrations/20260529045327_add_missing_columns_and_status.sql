/*
  # Add missing columns and fix schema gaps

  1. Changes to `scheduled_posts`
    - Add `publish_log` (text) — stores per-platform publish result messages
    - Add `processing` to post_status enum — used during publish

  2. Changes to `post_metrics`
    - Add `shares`, `saves`, `reach`, `impressions`, `platform`, `user_id` columns
      to match what fetch-metrics edge function writes

  3. Changes to `auto_schedule_slots`
    - Add `day_of_week`, `hour`, `minute` columns to match auto-schedule edge function
*/

-- Add publish_log to scheduled_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_posts' AND column_name = 'publish_log'
  ) THEN
    ALTER TABLE scheduled_posts ADD COLUMN publish_log text DEFAULT NULL;
  END IF;
END $$;

-- Add 'processing' to post_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'processing'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'post_status')
  ) THEN
    ALTER TYPE post_status ADD VALUE 'processing';
  END IF;
END $$;

-- Add missing columns to post_metrics
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_metrics' AND column_name = 'user_id') THEN
    ALTER TABLE post_metrics ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_metrics' AND column_name = 'platform') THEN
    ALTER TABLE post_metrics ADD COLUMN platform text DEFAULT 'instagram';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_metrics' AND column_name = 'shares') THEN
    ALTER TABLE post_metrics ADD COLUMN shares integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_metrics' AND column_name = 'saves') THEN
    ALTER TABLE post_metrics ADD COLUMN saves integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_metrics' AND column_name = 'reach') THEN
    ALTER TABLE post_metrics ADD COLUMN reach integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_metrics' AND column_name = 'impressions') THEN
    ALTER TABLE post_metrics ADD COLUMN impressions integer DEFAULT 0;
  END IF;
END $$;

-- Add unique constraint for upsert in fetch-metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'post_metrics' AND constraint_name = 'post_metrics_post_id_platform_key'
  ) THEN
    ALTER TABLE post_metrics ADD CONSTRAINT post_metrics_post_id_platform_key UNIQUE (post_id, platform);
  END IF;
END $$;

-- Add missing columns to auto_schedule_slots
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auto_schedule_slots' AND column_name = 'day_of_week') THEN
    ALTER TABLE auto_schedule_slots ADD COLUMN day_of_week integer DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auto_schedule_slots' AND column_name = 'hour') THEN
    ALTER TABLE auto_schedule_slots ADD COLUMN hour integer DEFAULT 9 CHECK (hour BETWEEN 0 AND 23);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'auto_schedule_slots' AND column_name = 'minute') THEN
    ALTER TABLE auto_schedule_slots ADD COLUMN minute integer DEFAULT 0 CHECK (minute BETWEEN 0 AND 59);
  END IF;
END $$;
