/*
  # Instagram ChatGPT Scheduler - Initial Schema

  ## Tables Created

  ### 1. `user_settings`
  Stores user integration settings for OpenAI and Instagram.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `openai_api_key` (text, encrypted key)
  - `instagram_access_token` (text)
  - `instagram_account_id` (text)
  - `instagram_username` (text)
  - `created_at` / `updated_at` timestamps

  ### 2. `scheduled_posts`
  Stores all generated and scheduled Instagram posts.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `prompt` (text, original ChatGPT prompt)
  - `generated_caption` (text, ChatGPT output)
  - `image_url` (text, image for post)
  - `hashtags` (text array)
  - `status` (enum: draft, scheduled, published, failed)
  - `scheduled_at` (timestamptz, when to publish)
  - `published_at` (timestamptz, when actually published)
  - `instagram_post_id` (text, returned by Instagram API)
  - `created_at` / `updated_at` timestamps

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
*/

-- user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  openai_api_key text DEFAULT '',
  instagram_access_token text DEFAULT '',
  instagram_account_id text DEFAULT '',
  instagram_username text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- post status enum
DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- scheduled_posts table
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt text NOT NULL DEFAULT '',
  generated_caption text DEFAULT '',
  image_url text DEFAULT '',
  hashtags text[] DEFAULT '{}',
  status post_status DEFAULT 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  instagram_post_id text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own posts"
  ON scheduled_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON scheduled_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON scheduled_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON scheduled_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
