-- Deduplicate interest names and enforce uniqueness (NFR-35 / seed idempotency).

UPDATE user_interests ui
SET interest_id = canonical.id
FROM (
    SELECT name, MIN(id) AS id
    FROM interests
    GROUP BY name
) AS canonical
JOIN interests duplicate ON duplicate.name = canonical.name
WHERE ui.interest_id = duplicate.id
  AND duplicate.id <> canonical.id;

DELETE FROM interests duplicate
USING interests canonical
WHERE duplicate.name = canonical.name
  AND duplicate.id > canonical.id;

CREATE UNIQUE INDEX IF NOT EXISTS interests_name_unique_idx ON interests (name);
