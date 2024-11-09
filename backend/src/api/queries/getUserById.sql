SELECT
    UserTable.id,
    UserTable.first_name,
    UserTable.last_name,
    UserTable.username,
    UserTable.gender,
    UserTable.email,
    UserTable.bio,
    UserTable.joined_at,
    json_agg(interests.name) AS interests
FROM
    UserTable
    LEFT JOIN UserInterests ON UserTable.id = UserInterests.user_id
    LEFT JOIN interests ON UserInterests.interest = interests.name
WHERE
    UserTable.id = $1
GROUP BY
    UserTable.id;