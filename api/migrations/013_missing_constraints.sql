-- Tables created from JSON models may lack composite unique constraints
-- required by ON CONFLICT clauses in application code.
CREATE UNIQUE INDEX IF NOT EXISTS user_blocks_blocker_blocked_unique ON user_blocks (blocker_id, blocked_id);
