SELECT
    views.viewer as id,
    first_name,
    last_name,
    username,
    gender
FROM
    views
    JOIN usertable AS viewer ON viewer.id = views.viewer
WHERE
    views.viewed = $1;