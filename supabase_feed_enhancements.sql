-- ============================================
-- FEED ENHANCEMENTS - Additional Schema Updates
-- ============================================

-- Add new columns to posts table for enhanced functionality
ALTER TABLE posts ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hashtags TEXT[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS mentions TEXT[];
ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'poll', 'event'));
ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll_options JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll_votes JSONB;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS event_details JSONB;

-- Add new columns to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Create post_views table for tracking views
CREATE TABLE IF NOT EXISTS post_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on post_views
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- Post Views RLS Policies
CREATE POLICY "Post views are viewable by post owners"
  ON post_views FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM posts WHERE id = post_id)
  );

CREATE POLICY "Authenticated users can create views"
  ON post_views FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create comment_likes table for comment likes
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on comment_likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Comment Likes RLS Policies
CREATE POLICY "Comment likes are viewable by everyone"
  ON comment_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comment likes"
  ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes"
  ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Create hashtags table for trending topics
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on hashtags
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

-- Hashtags RLS Policies
CREATE POLICY "Hashtags are viewable by everyone"
  ON hashtags FOR SELECT USING (true);

-- Create post_hashtags junction table
CREATE TABLE IF NOT EXISTS post_hashtags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  hashtag_id UUID REFERENCES hashtags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, hashtag_id)
);

-- Enable RLS on post_hashtags
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;

-- Post Hashtags RLS Policies
CREATE POLICY "Post hashtags are viewable by everyone"
  ON post_hashtags FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create post hashtags"
  ON post_hashtags FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM posts WHERE id = post_id)
  );

-- Create post_reports table for moderation
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id),
  UNIQUE(post_id, reporter_id)
);

-- Enable RLS on post_reports
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

-- Post Reports RLS Policies
CREATE POLICY "Users can view their own reports"
  ON post_reports FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Authenticated users can create reports"
  ON post_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ============================================
-- UPDATED FUNCTIONS
-- ============================================

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_post_views(post_id UUID, viewer_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert or update view record
  INSERT INTO post_views (post_id, user_id)
  VALUES (post_id, viewer_id)
  ON CONFLICT (post_id, user_id) DO NOTHING;

  -- Increment view count (only if it's a new view)
  UPDATE posts
  SET view_count = view_count + 1
  WHERE id = post_id AND NOT EXISTS (
    SELECT 1 FROM post_views
    WHERE post_views.post_id = posts.id
    AND post_views.user_id = viewer_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extract and store hashtags from post content
CREATE OR REPLACE FUNCTION process_post_hashtags()
RETURNS TRIGGER AS $$
DECLARE
  hashtag_name TEXT;
  hashtag_record RECORD;
BEGIN
  -- Delete existing hashtags for this post
  DELETE FROM post_hashtags WHERE post_id = NEW.id;

  -- Extract hashtags from content (words starting with #)
  FOR hashtag_name IN
    SELECT DISTINCT LOWER(TRIM(BOTH '#' FROM word))
    FROM regexp_split_to_table(NEW.content, '\s+') AS word
    WHERE word LIKE '#%' AND LENGTH(TRIM(BOTH '#' FROM word)) > 0
  LOOP
    -- Insert or update hashtag
    INSERT INTO hashtags (name, post_count, updated_at)
    VALUES (hashtag_name, 1, NOW())
    ON CONFLICT (name) DO UPDATE SET
      post_count = hashtags.post_count + 1,
      updated_at = NOW();

    -- Get hashtag ID
    SELECT id INTO hashtag_record FROM hashtags WHERE name = hashtag_name;

    -- Link post to hashtag
    INSERT INTO post_hashtags (post_id, hashtag_id)
    VALUES (NEW.id, hashtag_record.id);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update hashtag counts when posts are deleted
CREATE OR REPLACE FUNCTION update_hashtag_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease post count for all hashtags associated with the deleted post
  UPDATE hashtags
  SET post_count = post_count - 1,
      updated_at = NOW()
  WHERE id IN (
    SELECT hashtag_id FROM post_hashtags WHERE post_id = OLD.id
  );

  -- Remove hashtag associations
  DELETE FROM post_hashtags WHERE post_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for processing hashtags on post insert/update
DROP TRIGGER IF EXISTS process_post_hashtags_trigger ON posts;
CREATE TRIGGER process_post_hashtags_trigger
  AFTER INSERT OR UPDATE OF content ON posts
  FOR EACH ROW
  EXECUTE FUNCTION process_post_hashtags();

-- Trigger for updating comment likes count
DROP TRIGGER IF EXISTS update_comment_likes_count_trigger ON comment_likes;
CREATE TRIGGER update_comment_likes_count_trigger
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_likes_count();

-- Trigger for updating hashtag counts on post deletion
DROP TRIGGER IF EXISTS update_hashtag_counts_trigger ON posts;
CREATE TRIGGER update_hashtag_counts_trigger
  BEFORE DELETE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_hashtag_counts();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_view_count ON posts(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes_count ON posts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);
CREATE INDEX IF NOT EXISTS idx_hashtags_post_count ON hashtags(post_count DESC);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Insert sample hashtags
INSERT INTO hashtags (name, post_count) VALUES
  ('studygroup', 0),
  ('examseason', 0),
  ('homeworkhelp', 0),
  ('tutoring', 0),
  ('notes', 0),
  ('studybreak', 0),
  ('motivation', 0),
  ('success', 0)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- REALTIME SUBSCRIPTIONS (UPDATED)
-- ============================================

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE post_views;
ALTER PUBLICATION supabase_realtime ADD TABLE comment_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE hashtags;
ALTER PUBLICATION supabase_realtime ADD TABLE post_hashtags;
ALTER PUBLICATION supabase_realtime ADD TABLE post_reports;