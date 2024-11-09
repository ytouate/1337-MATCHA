INSERT INTO
    UserTable(
        first_name,
        last_name,
        username,
        password,
        email,
        gender
    )
VALUES
    ($1, $2, $3, $4, $5, $6) ON CONFLICT(email) DO NOTHING;