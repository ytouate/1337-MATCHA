CREATE TABLE IF NOT EXISTS date_proposals (
    id SERIAL PRIMARY KEY,
    proposer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    location_label VARCHAR(128),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    note VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS date_proposals_participants_status_idx
    ON date_proposals (proposer_id, invitee_id, status);

CREATE INDEX IF NOT EXISTS date_proposals_scheduled_at_idx
    ON date_proposals (scheduled_at);

CREATE UNIQUE INDEX IF NOT EXISTS date_proposals_one_pending_per_pair_idx
    ON date_proposals (
        LEAST(proposer_id, invitee_id),
        GREATEST(proposer_id, invitee_id)
    )
    WHERE status = 'proposed';
