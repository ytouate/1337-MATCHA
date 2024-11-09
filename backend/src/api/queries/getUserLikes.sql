SELECT
    likes.liker as id,
    first_name,
    last_name,
    username,
    gender
FROM
    likes
    JOIN usertable AS liker ON liker.id = likes.liker
WHERE
    likes.liked = $1;