CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS chat_messages_pair_idx
    ON chat_messages (sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_messages_receiver_idx
    ON chat_messages (receiver_id, created_at DESC);
