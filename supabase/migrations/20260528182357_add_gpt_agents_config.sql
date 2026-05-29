/*
  # Add GPT Agents Configuration

  1. New Tables
    - `gpt_agents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text, agent display name)
      - `role` (text, one of: theme, caption, image)
      - `system_prompt` (text, custom system prompt for the agent)
      - `model` (text, OpenAI model to use, default gpt-4o-mini)
      - `temperature` (float, creativity level 0-2, default 0.8)
      - `is_active` (boolean, whether agent is enabled)
      - `created_at` / `updated_at` timestamps

  2. Modified Tables
    - `scheduled_posts` - added `theme_output` column for agent 1 output
    - `scheduled_posts` - added `image_prompt` column for agent 3 output

  3. Security
    - RLS enabled on `gpt_agents`
    - Users can only access their own agents
*/

-- gpt_agents table
CREATE TABLE IF NOT EXISTS gpt_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT '',
  role text NOT NULL CHECK (role IN ('theme', 'caption', 'image')),
  system_prompt text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  temperature float NOT NULL DEFAULT 0.8 CHECK (temperature >= 0 AND temperature <= 2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE gpt_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agents"
  ON gpt_agents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agents"
  ON gpt_agents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agents"
  ON gpt_agents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agents"
  ON gpt_agents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add columns for agent pipeline outputs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_posts' AND column_name = 'theme_output'
  ) THEN
    ALTER TABLE scheduled_posts ADD COLUMN theme_output text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_posts' AND column_name = 'image_prompt'
  ) THEN
    ALTER TABLE scheduled_posts ADD COLUMN image_prompt text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gpt_agents_user_id ON gpt_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_gpt_agents_role ON gpt_agents(role);
