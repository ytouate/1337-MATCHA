CREATE UNIQUE INDEX IF NOT EXISTS user_views_viewer_viewed_unique ON user_views (viewer_id, viewed_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_likes_liker_liked_unique ON user_likes (liker_id, liked_id);

CREATE INDEX IF NOT EXISTS user_views_viewed_id_idx ON user_views (viewed_id);

CREATE INDEX IF NOT EXISTS user_likes_liked_id_idx ON user_likes (liked_id);