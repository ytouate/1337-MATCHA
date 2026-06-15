ALTER TABLE users
ALTER COLUMN password
DROP NOT NULL;

CREATE TABLE
    IF NOT EXISTS oauth_identities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        provider VARCHAR(32) NOT NULL,
        provider_user_id VARCHAR(128) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (provider, provider_user_id)
    );

CREATE INDEX IF NOT EXISTS oauth_identities_user_idx ON oauth_identities (user_id);