-- Create the database
CREATE DATABASE matcha;

-- Connect to the database
\c matcha;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(28) NOT NULL CHECK (first_name <> ''),
    last_name VARCHAR(28) NOT NULL CHECK (last_name <> ''),
    email VARCHAR(255) NOT NULL CHECK (email <> ''),
    username VARCHAR(16) NOT NULL CHECK (username <> ''),
    password VARCHAR NOT NULL CHECK (password <> ''),
    bio VARCHAR(255),
    gender VARCHAR(6) CHECK (gender IN ('Male', 'Female')),
    sexual_preference VARCHAR(6) CHECK (sexual_preference IN ('Male', 'Female')),
    latitude DECIMAL(9, 6),
    longitude DECIMAL(9, 6),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);