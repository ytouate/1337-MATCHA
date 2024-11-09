UPDATE UserTable
SET is_email_verified = $2
WHERE id = $1