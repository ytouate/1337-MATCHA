CREATE TABLE IF NOT EXISTS UserTable(
    id serial PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(100) NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE,
    gender VARCHAR(6) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    bio VARCHAR(500),
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS interests(
    name VARCHAR(50) NOT NULL UNIQUE PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS UserInterests(
    id serial PRIMARY KEY,
    user_id INTEGER REFERENCES UserTable,
    interest VARCHAR(50) REFERENCES interests
);

CREATE TABLE IF NOT EXISTS views(
    id serial PRIMARY KEY,
    viewer INTEGER REFERENCES UserTable,
    viewed INTEGER REFERENCES UserTable,
    UNIQUE (viewer, viewed)
);

CREATE TABLE IF NOT EXISTS likes(
    id serial PRIMARY KEY,
    liker INTEGER REFERENCES UserTable,
    liked INTEGER REFERENCES UserTable,
    UNIQUE (liker, liked)
);

CREATE TABLE IF NOT EXISTS MatchTable(
    id serial PRIMARY KEY,
    first_user INTEGER REFERENCES UserTable,
    second_user INTEGER REFERENCES UserTable,
    matched_at DATE NOT NULL DEFAULT CURRENT_DATE
);


CREATE TABLE IF NOT EXISTS BlockTable(
    id serial PRIMARY KEY,
    blocker INTEGER REFERENCES UserTable,
    blocked INTEGER REFERENCES UserTable
);