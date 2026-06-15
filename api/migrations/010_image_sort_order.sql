ALTER TABLE images
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE images
SET
    sort_order = id
WHERE
    sort_order = 0;

CREATE INDEX IF NOT EXISTS images_user_sort_idx ON images (user_id, sort_order);