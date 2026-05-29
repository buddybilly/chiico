/*
  # Multi-Platform Support

  ## Summary
  Adds support for publishing posts to Google Business Profile and LinkedIn,
  in addition to the existing Instagram integration.

  ## Changes

  ### 1. scheduled_posts table
  - New column `platforms` (text[], default: ['instagram']) — list of target platforms for each post
  - New column `published_platforms` (jsonb, default: '{}') — tracks publish status per platform

  ### 2. user_settings table
  - New column `google_business_access_token` — OAuth access token for Google Business Profile API
  - New column `google_business_location_id` — Google Business location/account ID
  - New column `google_business_account_name` — display name for the connected Google Business account
  - New column `linkedin_access_token` — OAuth access token for LinkedIn API
  - New column `linkedin_org_id` — LinkedIn organization/page ID for company posts
  - New column `linkedin_username` — display name for the connected LinkedIn account

  ## Security
  - RLS is already enabled on both tables; no new policies needed (existing user_id checks cover new columns)
*/

-- Add platforms columns to scheduled_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_posts' AND column_name = 'platforms'
  ) THEN
    ALTER TABLE scheduled_posts
      ADD COLUMN platforms text[] NOT NULL DEFAULT ARRAY['instagram'];
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_posts' AND column_name = 'published_platforms'
  ) THEN
    ALTER TABLE scheduled_posts
      ADD COLUMN published_platforms jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add Google Business columns to user_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'google_business_access_token'
  ) THEN
    ALTER TABLE user_settings
      ADD COLUMN google_business_access_token text DEFAULT '',
      ADD COLUMN google_business_location_id text DEFAULT '',
      ADD COLUMN google_business_account_name text DEFAULT '';
  END IF;
END $$;

-- Add LinkedIn columns to user_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'linkedin_access_token'
  ) THEN
    ALTER TABLE user_settings
      ADD COLUMN linkedin_access_token text DEFAULT '',
      ADD COLUMN linkedin_org_id text DEFAULT '',
      ADD COLUMN linkedin_username text DEFAULT '';
  END IF;
END $$;
