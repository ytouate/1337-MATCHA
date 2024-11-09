UPDATE
    usertable
SET
    first_name = $1,
    last_name = $2,
    username = $3,
    email = $4,
    bio = $5
WHERE
    id = $6