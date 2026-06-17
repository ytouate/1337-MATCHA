from __future__ import annotations

import argparse
import sys

from src.core.security import hash_password
from src.db.database import PgDatabase
from src.seed.profile_data import (
    EVAL_SEED_PASSWORD,
    PROFILE_COUNT,
    SEED_USERNAME_PREFIX,
    SeedProfile,
    build_seed_profiles,
)

INSERT_USER_SQL = """
    INSERT INTO users (
        first_name,
        last_name,
        email,
        password,
        username,
        gender,
        sexual_preference,
        birthdate,
        bio,
        latitude,
        longitude,
        location_label,
        is_verified,
        is_profile_completed,
        fame_rating
    )
    VALUES (
        %(first_name)s,
        %(last_name)s,
        %(email)s,
        %(password)s,
        %(username)s,
        %(gender)s,
        %(sexual_preference)s,
        %(birthdate)s,
        %(bio)s,
        %(latitude)s,
        %(longitude)s,
        %(location_label)s,
        %(is_verified)s,
        %(is_profile_completed)s,
        %(fame_rating)s
    )
    RETURNING id
"""

INSERT_IMAGE_SQL = """
    INSERT INTO images (url, user_id, is_profile_picture, sort_order)
    VALUES (%(url)s, %(user_id)s, %(is_profile_picture)s, %(sort_order)s)
"""

INSERT_USER_INTEREST_SQL = """
    INSERT INTO user_interests (user_id, interest_id)
    VALUES (%(user_id)s, %(interest_id)s)
"""

COUNT_SEED_USERS_SQL = """
    SELECT COUNT(*) AS count
    FROM users
    WHERE username LIKE %(pattern)s
"""

COUNT_COMPLETE_SEED_USERS_SQL = """
    SELECT COUNT(*) AS count
    FROM users
    WHERE username LIKE %(pattern)s
      AND is_profile_completed = true
"""

DELETE_SEED_USERS_SQL = """
    DELETE FROM users
    WHERE username LIKE %(pattern)s
"""

LIST_INTEREST_IDS_SQL = """
    SELECT id
    FROM interests
    ORDER BY id
"""


def count_seed_users(db) -> int:
    db.cursor.execute(COUNT_SEED_USERS_SQL, {"pattern": f"{SEED_USERNAME_PREFIX}%"})
    row = db.cursor.fetchone()
    return int(row["count"]) if row else 0


def count_complete_seed_users(db) -> int:
    db.cursor.execute(
        COUNT_COMPLETE_SEED_USERS_SQL,
        {"pattern": f"{SEED_USERNAME_PREFIX}%"},
    )
    row = db.cursor.fetchone()
    return int(row["count"]) if row else 0


def fetch_interest_ids(db) -> list[int]:
    db.cursor.execute(LIST_INTEREST_IDS_SQL)
    rows = db.cursor.fetchall()
    return [int(row["id"]) for row in rows]


def delete_seed_users(db) -> None:
    db.cursor.execute(DELETE_SEED_USERS_SQL, {"pattern": f"{SEED_USERNAME_PREFIX}%"})


def insert_seed_profile(db, profile: SeedProfile, password_hash: str) -> None:
    db.cursor.execute(
        INSERT_USER_SQL,
        {
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "email": profile.email,
            "password": password_hash,
            "username": profile.username,
            "gender": profile.gender,
            "sexual_preference": profile.sexual_preference,
            "birthdate": profile.birthdate,
            "bio": profile.bio,
            "latitude": profile.latitude,
            "longitude": profile.longitude,
            "location_label": profile.location_label,
            "is_verified": True,
            "is_profile_completed": True,
            "fame_rating": profile.fame_rating,
        },
    )
    user_row = db.cursor.fetchone()
    user_id = int(user_row["id"])

    db.cursor.execute(
        INSERT_IMAGE_SQL,
        {
            "url": f"seed/profile-{user_id}.jpg",
            "user_id": user_id,
            "is_profile_picture": True,
            "sort_order": 0,
        },
    )

    for interest_id in profile.interest_ids:
        db.cursor.execute(
            INSERT_USER_INTEREST_SQL,
            {"user_id": user_id, "interest_id": interest_id},
        )


def seed_profiles(force: bool = False) -> int:
    with PgDatabase() as db:
        existing_count = count_seed_users(db)

        if existing_count >= PROFILE_COUNT and not force:
            print(
                f"Seed profiles already present ({existing_count}). "
                "Use --force to re-seed."
            )
            return count_complete_seed_users(db)

        interest_ids = fetch_interest_ids(db)
        if not interest_ids:
            raise RuntimeError(
                "No interests found. Run `make seed-interests` before seeding profiles."
            )

        if force and existing_count > 0:
            delete_seed_users(db)
            db.connection.commit()
            print(f"Removed existing seed users ({existing_count}).")

        password_hash = hash_password(EVAL_SEED_PASSWORD)
        profiles = build_seed_profiles(interest_ids)

        for profile in profiles:
            insert_seed_profile(db, profile, password_hash)

        complete_count = count_complete_seed_users(db)
        db.connection.commit()

    if complete_count < PROFILE_COUNT:
        raise RuntimeError(
            f"Expected at least {PROFILE_COUNT} complete seed profiles, got {complete_count}"
        )

    print(f"Seeded {complete_count} complete profiles.")
    print(f"Sample login: {profiles[0].username} / {EVAL_SEED_PASSWORD}")
    return complete_count


def verify_seed(min_count: int = PROFILE_COUNT) -> int:
    with PgDatabase() as db:
        complete_count = count_complete_seed_users(db)

    if complete_count < min_count:
        raise RuntimeError(
            f"Verification failed: expected >= {min_count} complete seed profiles, "
            f"got {complete_count}"
        )

    print(f"Verified {complete_count} complete seed profiles.")
    return complete_count


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed evaluation user profiles.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Delete existing seed users and re-seed.",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="Only verify that enough complete seed profiles exist.",
    )
    args = parser.parse_args()

    try:
        if args.verify:
            verify_seed()
        else:
            seed_profiles(force=args.force)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
