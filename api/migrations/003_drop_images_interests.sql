-- Drop tables
DROP TABLE IF EXISTS images CASCADE;
DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS user_interests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS images_id_seq;
DROP SEQUENCE IF EXISTS interests_id_seq;
DROP SEQUENCE IF EXISTS user_interests_id_seq;
